import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

import { FlowGraph } from '../../common/types/engine.types';
import { AiUsageService } from '../metering/ai-usage.service';
import { assertPublicUrl } from '../integrations/services/http.service';
import { DeepseekWebService } from '../deepseek-web/deepseek-web.service';
import { autoRepairGraph, inspectGraph } from '../flows/graph-rules';
import { DeepseekAccountService } from '../deepseek-web/deepseek-account.service';
import { FLOW_TOOLS, GraphDraft } from './flow-tools';
import { NODE_CATALOG } from './node-catalog';
import { buildAgentSystemPrompt, HUMAN_PERSONA_RULES } from './flow-agent.prompt';

/** Config del LLM que mueve al AGENTE constructor (distinto del LLM de cada bot). */
export interface BuilderLlm {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

/** Mensaje del historial del chat del constructor. */
export interface BuilderMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BuildParams {
  graph?: FlowGraph;
  message: string;
  history?: BuilderMessage[];
  llm?: Partial<BuilderLlm>;
  context?: { tenantName?: string; flowName?: string };
  /**
   * 'fast' (default): un solo agente con tools.
   * 'expert': equipo de sub-agentes especializados (Arquitecto → Redactor →
   * Constructor) para flujos complejos, con mayor calidad a cambio de más costo.
   */
  mode?: 'fast' | 'expert';
}

export interface BuildResult {
  reply: string;
  graph: FlowGraph;
  changed: boolean;
  problems: string[];
  trace: { tool: string; ok: boolean; summary?: string }[];
  iterations: number;
  // Vía usada (doble seguro en el chat del builder): 'web' = sesión DeepSeek,
  // 'fallback' = API key de respaldo tras fallar el web, 'api' = API normal.
  via?: 'web' | 'fallback' | 'api';
}

const MAX_ITER = 24;

/**
 * Para DeepSeek apaga el "thinking mode" (cadena de pensamiento), que viene
 * ENABLED por defecto y consume muchos más tokens. En non-thinking las tool
 * calls son directas (no hay que reenviar reasoning_content). Solo aplica a
 * DeepSeek; otros proveedores ignoran este parámetro.
 */
function noThinking(provider: string): Record<string, any> {
  return (provider || '').toLowerCase() === 'deepseek' ? { thinking: { type: 'disabled' } } : {};
}

/**
 * Agente que CONSTRUYE/EDITA flujos a partir de instrucciones en lenguaje natural.
 * Corre el loop de tool-calling server-side: llama al LLM con las FLOW_TOOLS,
 * ejecuta cada tool contra un GraphDraft en memoria y reinyecta el resultado,
 * hasta que el modelo deja de pedir tools (o se alcanza MAX_ITER).
 */
@Injectable()
export class FlowAgentService {
  private readonly logger = new Logger(FlowAgentService.name);

  constructor(
    private readonly aiUsage: AiUsageService,
    private readonly deepseekWeb: DeepseekWebService,
    private readonly dsAccounts: DeepseekAccountService,
  ) {}

  private isWeb(provider?: string): boolean {
    return (provider || '').toLowerCase() === 'deepseek_web';
  }

  /**
   * Registra el consumo del LLM constructor (source 'builder'). Sin esto, los
   * tokens del asistente que arma flujos quedarían fuera del metering.
   * Best-effort: nunca interrumpe la construcción.
   */
  private recordBuilderUsage(llm: BuilderLlm, data: any): void {
    const usage = data?.usage;
    if (!usage) return;
    void this.aiUsage
      .record({
        tenantId: null,
        provider: llm.provider,
        model: llm.model,
        source: 'builder',
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens ?? 0,
      })
      .catch((err) => {
        this.logger.warn(`No se pudo registrar el consumo del constructor: ${err?.message ?? err}`);
      });
  }

  /** Config del LLM del constructor: request > env > default DeepSeek. */
  private resolveLlm(override?: Partial<BuilderLlm>): BuilderLlm {
    return {
      provider: override?.provider || process.env.FLOW_AGENT_PROVIDER || 'deepseek',
      model: override?.model || process.env.FLOW_AGENT_MODEL || 'deepseek-chat',
      apiKey: override?.apiKey || process.env.FLOW_AGENT_API_KEY || '',
      baseUrl: override?.baseUrl || process.env.FLOW_AGENT_BASE_URL || undefined,
    };
  }


  /**
   * Último filtro antes de entregar un grafo generado. El modelo tiende a dejar
   * salidas de error sueltas, menús sin mensaje de reintento y marcadores de
   * intención incoherentes; todo eso es mecánico y se arregla sin adivinar nada.
   * Lo que no se puede arreglar se devuelve como problema, no en silencio.
   */
  private finalizeGraph(graph: any, problems: string[]): { graph: any; problems: string[] } {
    const { graph: repaired, repairs } = autoRepairGraph(graph);
    const { errors } = inspectGraph(repaired);
    if (repairs.length) {
      this.logger.log(`Grafo generado corregido: ${repairs.join(' ')}`);
    }
    return { graph: repaired, problems: [...problems, ...repairs, ...errors] };
  }

  async build(params: BuildParams): Promise<BuildResult> {
    const llm = this.resolveLlm(params.llm);
    // Ruta DeepSeek-web (gratis, tools emuladas por prompt) con fallback a API key.
    if (this.isWeb(llm.provider)) return this.buildViaWeb(params);
    if (!llm.apiKey) {
      return {
        reply:
          'No hay API key configurada para el asistente constructor. Define FLOW_AGENT_API_KEY (o pásala en la petición) para usar el constructor de flujos.',
        graph: params.graph || { nodes: [], edges: [] },
        changed: false,
        problems: [],
        trace: [],
        iterations: 0,
        via: 'api',
      };
    }

    const draft = new GraphDraft(params.graph);
    const before = JSON.stringify(draft.toGraph());
    const trace: BuildResult['trace'] = [];

    const system = buildAgentSystemPrompt({
      tenantName: params.context?.tenantName,
      flowName: params.context?.flowName,
      nodeCount: draft.nodes.length,
    });

    // MODO EXPERTO: equipo de sub-agentes especializados produce un plan + copys
    // que se inyectan como contexto para que el Constructor (loop con tools) los
    // ensamble. Mejora la calidad en flujos complejos a cambio de más llamadas.
    let blueprint = '';
    if (params.mode === 'expert') {
      blueprint = await this.runSpecialistTeam(llm, params, trace);
    }

    // Historial OpenAI: system + turnos previos + (blueprint) + mensaje actual.
    const messages: any[] = [{ role: 'system', content: system }];
    for (const m of params.history || []) {
      if (m.role === 'user' || m.role === 'assistant') messages.push({ role: m.role, content: m.content });
    }
    if (blueprint) {
      messages.push({
        role: 'system',
        content:
          'PLAN DEL EQUIPO ESPECIALISTA (Arquitecto + Redactor). Ensámblalo con tus tools (addNodesBatch/addEdgesBatch), respetando estructura y textos. Ajusta lo que haga falta y valida al final:\n\n' +
          blueprint,
      });
    }
    messages.push({ role: 'user', content: params.message });

    let reply = '';
    let iterations = 0;

    for (let i = 0; i < MAX_ITER; i++) {
      iterations = i + 1;
      let resp: any;
      try {
        resp = await this.callLlm(llm, messages);
      } catch (err) {
        this.logger.error(`callLlm falló: ${this.msg(err)}`);
        reply = 'Tuve un problema técnico al construir el flujo. Intenta de nuevo o reformula la petición.';
        break;
      }

      const choice = resp?.choices?.[0]?.message;
      if (!choice) {
        reply = 'No recibí respuesta del modelo.';
        break;
      }

      const toolCalls = choice.tool_calls;
      // Sin tool_calls → es la respuesta final.
      if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
        reply = choice.content || '';
        break;
      }

      // Reinyecta el mensaje del assistant (con sus tool_calls) antes de los resultados.
      messages.push({ role: 'assistant', content: choice.content || '', tool_calls: toolCalls });

      for (const tc of toolCalls) {
        const name = tc?.function?.name;
        let args: any = {};
        try {
          args = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch {
          args = {};
        }
        const result = draft.execute(name, args);
        trace.push({ tool: name, ok: !!result.ok, summary: this.summarize(name, args, result) });
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(this.trimResult(name, result)),
        });
      }
    }

    const problems = draft.validate();
    const graph = draft.toGraph();
    const changed = JSON.stringify(graph) !== before;

    if (!reply) {
      reply = changed ? 'Listo, actualicé el flujo.' : 'No realicé cambios en el flujo.';
    }

    const fin = this.finalizeGraph(graph, problems);
    return { reply, graph: fin.graph, changed, problems: fin.problems, trace, iterations, via: 'api' };
  }

  // ─────────────────────── Ruta DeepSeek-web (builder) ───────────────────────

  /** Config de respaldo (API key) cuando el web falla. */
  private buildFallbackLlm(override?: Partial<BuilderLlm>): BuilderLlm {
    return {
      provider: (override as any)?.fallbackProvider || process.env.FLOW_AGENT_PROVIDER || 'deepseek',
      model: (override as any)?.fallbackModel || process.env.FLOW_AGENT_MODEL || 'deepseek-chat',
      apiKey: (override as any)?.fallbackApiKey || process.env.FLOW_AGENT_API_KEY || '',
      baseUrl: (override as any)?.fallbackBaseUrl || process.env.FLOW_AGENT_BASE_URL || undefined,
    };
  }

  /**
   * Constructor de flujos vía SESIÓN WEB de DeepSeek (gratis). Como el web no
   * tiene function-calling, se EMULAN las tools por prompt: cada turno el modelo
   * responde SOLO un JSON {actions,done,reply}; ejecutamos las actions contra el
   * GraphDraft (las MISMAS FLOW_TOOLS/execute que la ruta API) y le devolvemos
   * los resultados. Al priming se le inyecta el catálogo COMPLETO de nodos (el
   * web interpreta mejor con todo el contexto). Ante cualquier fallo → fallback
   * a la ruta API key en silencio.
   */
  private async buildViaWeb(params: BuildParams): Promise<BuildResult> {
    const draft = new GraphDraft(params.graph);
    const before = JSON.stringify(draft.toGraph());
    const trace: BuildResult['trace'] = [];
    const baseSystem = buildAgentSystemPrompt({
      tenantName: params.context?.tenantName,
      flowName: params.context?.flowName,
      nodeCount: draft.nodes.length,
    });
    const emuSystem = `${baseSystem}\n\n${this.buildToolProtocol()}`;

    let reply = '';
    let iterations = 0;
    let failed = false;

    const active = await this.dsAccounts.getActive();
    if (!active) {
      failed = true;
    } else {
      const { accountId, cred } = active;
      try {
        const chatSessionId = await this.deepseekWeb.createSession(cred);
        // Priming OCULTO: protocolo + catálogo completo. Respuesta descartada.
        const primed = await this.deepseekWeb.sendInstant(cred, {
          chatSessionId,
          parentMessageId: null,
          prompt: 'Configuración del sistema. Responde solo "ok".\n\n' + emuSystem,
        });
        let parent = primed.responseMessageId;
        let nextPrompt = `Petición del usuario: ${params.message}`;

        for (let i = 0; i < MAX_ITER; i++) {
          iterations = i + 1;
          const res = await this.deepseekWeb.sendInstant(cred, {
            chatSessionId,
            parentMessageId: parent,
            prompt: nextPrompt,
          });
          parent = res.responseMessageId;
          const parsed = this.parseAgentJson(res.text);
          if (!parsed) {
            // No emitió JSON: lo tratamos como respuesta final en lenguaje natural.
            reply = res.text;
            break;
          }
          const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
          const results: any[] = [];
          for (const a of actions) {
            const name = a?.tool;
            const args = a?.args ?? a?.arguments ?? {};
            const result = draft.execute(name, args);
            trace.push({ tool: name, ok: !!result.ok, summary: this.summarize(name, args, result) });
            results.push({ tool: name, result: this.trimResult(name, result) });
          }
          if (parsed.done || actions.length === 0) {
            reply = parsed.reply || '';
            break;
          }
          nextPrompt =
            'RESULTADOS de tus acciones (JSON). Continúa con el MISMO formato JSON ' +
            '{actions,done,reply}. Cuando el flujo esté completo y validado (validateGraph ' +
            'sin problemas), responde done:true.\n' +
            JSON.stringify(results).slice(0, 6000);
        }
      } catch (err) {
        this.dsAccounts.markFailure(accountId, err).catch(() => undefined);
        this.logger.warn(`builder deepseek-web falló; fallback a API key: ${this.msg(err)}`);
        failed = true;
      }
    }

    // Fallback SILENCIOSO a la ruta API key (rebuild limpio desde el grafo original).
    if (failed) {
      const fb = this.buildFallbackLlm(params.llm);
      if (fb.apiKey) {
        const r = await this.build({ ...params, llm: fb });
        return { ...r, via: 'fallback' }; // el builder cayó del web a la API key
      }
      return {
        reply: 'No pude construir el flujo: la sesión web no está disponible y no hay API key de respaldo.',
        graph: params.graph || { nodes: [], edges: [] },
        changed: false, problems: [], trace, iterations, via: 'fallback',
      };
    }

    const problems = draft.validate();
    const graph = draft.toGraph();
    const changed = JSON.stringify(graph) !== before;
    if (!reply) reply = changed ? 'Listo, actualicé el flujo.' : 'No realicé cambios en el flujo.';
    const finw = this.finalizeGraph(graph, problems);
    return { reply, graph: finw.graph, changed, problems: finw.problems, trace, iterations, via: 'web' };
  }

  /** Protocolo de tools emuladas + catálogo COMPLETO de nodos (para el web). */
  private buildToolProtocol(): string {
    const tools = FLOW_TOOLS.map((t) => {
      const f = t.function as any;
      const props = f.parameters?.properties ? Object.keys(f.parameters.properties) : [];
      return `- ${f.name}(${props.join(', ')}): ${f.description}`;
    }).join('\n');
    return [
      'MODO CONSTRUCCIÓN CON HERRAMIENTAS (protocolo ESTRICTO).',
      'No tienes function-calling: en CADA turno responde ÚNICAMENTE con un objeto JSON válido, sin markdown ni texto fuera del JSON, con esta forma exacta:',
      '{"actions":[{"tool":"<nombre>","args":{...}}],"done":false,"reply":""}',
      'Ejecutaré tus actions EN ORDEN y te devolveré sus resultados en JSON; entonces respondes otro JSON con el MISMO formato. Cuando el flujo esté COMPLETO y validado, responde exactamente {"actions":[],"done":true,"reply":"<mensaje corto y humano al usuario>"}.',
      'Reglas: en addNodesBatch inventa "ref" (alias) por nodo y úsalos como source/target en addEdgesBatch. sourceHandle es obligatorio si el origen tiene varias salidas. Llama validateGraph al final y corrige antes de done:true. Todo flujo tiene UN trigger. NADA fuera del JSON.',
      'HERRAMIENTAS:',
      tools,
      'Ejemplos: addNodesBatch args → {"nodes":[{"ref":"t","type":"trigger"},{"ref":"s","type":"sendText","data":{"text":"Hola"}}]}; addEdgesBatch args → {"edges":[{"source":"t","target":"s","sourceHandle":"out"}]}.',
      '',
      'CATÁLOGO COMPLETO DE NODOS (tipo (etiqueta) — descripción · salidas · campos; * = requerido):',
      this.renderNodeCatalog(),
    ].join('\n');
  }

  /** Renderiza el catálogo entero de nodos para inyectarlo en el priming. */
  private renderNodeCatalog(): string {
    return (NODE_CATALOG as any[])
      .map((n) => {
        const outs = (n.outputs || []).map((o: any) => o.id).join(', ') || '—';
        const fields =
          Object.entries(n.data || {})
            .map(([k, v]: any) => {
              const en = v?.enum ? ` [${v.enum.join('|')}]` : '';
              return `${k}${v?.required ? '*' : ''}:${v?.type}${en}`;
            })
            .join(', ') || '—';
        return `• ${n.type} (${n.label}) — ${n.description || ''}\n    salidas: ${outs}${n.dynamicOut ? ' (+dinámicas por opción)' : ''}\n    campos: ${fields}`;
      })
      .join('\n');
  }

  /** Extrae el objeto JSON de la respuesta del modelo (tolerante a markdown/prosa). */
  private parseAgentJson(text: string): any | null {
    if (!text) return null;
    let t = text.trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1].trim();
    const s = t.indexOf('{');
    const e = t.lastIndexOf('}');
    if (s === -1 || e === -1 || e <= s) return null;
    try {
      return JSON.parse(t.slice(s, e + 1));
    } catch {
      return null;
    }
  }

  /**
   * EQUIPO DE SUB-AGENTES ESPECIALIZADOS (modo experto). Tres roles secuenciales:
   *  1. Arquitecto: diseña la ESTRUCTURA del flujo (pasos, nodos, conexiones).
   *  2. Redactor: escribe TODOS los textos (mensajes, menús, prompts de IA) en
   *     el idioma y tono del negocio.
   * Devuelve un "blueprint" combinado que el Constructor ensambla con tools.
   */
  private async runSpecialistTeam(llm: BuilderLlm, params: BuildParams, trace: BuildResult['trace']): Promise<string> {
    const negocio = params.context?.tenantName ? `Negocio/cliente: ${params.context.tenantName}.` : '';
    let plan = '';
    let copys = '';

    // 1) ARQUITECTO ──────────────────────────────────────────────
    try {
      plan = await this.completion(llm, [
        {
          role: 'system',
          content:
            'Eres el ARQUITECTO de flujos conversacionales de WhatsApp. Diseña la ESTRUCTURA óptima para la petición: lista los pasos en orden, qué tipo de nodo usar en cada uno (trigger, sendText, interactiveMenu, captureInput, condition, aiAgent, calendar, gmail, handover, end…), cómo se conectan (incluye ramas de menús y errores) y qué variables se capturan. Sé claro y conciso, en formato de lista numerada. NO escribas los textos finales (eso lo hace el redactor); solo la arquitectura. Indica si el flujo necesita IA.',
        },
        { role: 'user', content: `${negocio}\nPetición: ${params.message}` },
      ]);
      trace.push({ tool: 'arquitecto', ok: !!plan, summary: 'estructura diseñada' });
    } catch {
      trace.push({ tool: 'arquitecto', ok: false, summary: 'falló' });
    }

    // 2) REDACTOR ────────────────────────────────────────────────
    try {
      copys = await this.completion(llm, [
        {
          role: 'system',
          content:
            'Eres el REDACTOR/COPYWRITER del bot. A partir de la arquitectura, escribe TODOS los textos finales: saludos, cuerpos de menú con sus opciones, preguntas de captura, y si hay nodo de IA, su systemPrompt completo. Tono humano y natural, como una persona real del negocio por WhatsApp. Devuelve los textos organizados por paso para que sea fácil ensamblarlos. No inventes API keys.\n\nREGLAS CLAVE:\n- Para fechas NUNCA pidas formatos rígidos (DD/MM/AAAA HH:MM); el motor entiende lenguaje natural: pide "¿qué día y hora te viene bien?" con un ejemplo natural ("mañana a las 3pm").\n- Evita emojis decorativos de automatización en TODOS los textos.\n- Si hay nodo de IA, su systemPrompt DEBE incluir al pie de la letra estas reglas de identidad:\n' +
            HUMAN_PERSONA_RULES,
        },
        { role: 'user', content: `${negocio}\nPetición: ${params.message}\n\nArquitectura propuesta:\n${plan}` },
      ]);
      trace.push({ tool: 'redactor', ok: !!copys, summary: 'textos redactados' });
    } catch {
      trace.push({ tool: 'redactor', ok: false, summary: 'falló' });
    }

    return [plan && `## Arquitectura\n${plan}`, copys && `## Textos\n${copys}`].filter(Boolean).join('\n\n');
  }

  /** URL base del proveedor; el baseUrl explícito tiene prioridad. */
  private resolveBaseUrl(provider: string, baseUrl?: string): string {
    const fallback =
      provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.deepseek.com';
    return (baseUrl || fallback).replace(/\/+$/, '');
  }

  /** Completion simple (sin tools) para los sub-agentes Arquitecto/Redactor. */
  private async completion(llm: BuilderLlm, messages: any[]): Promise<string> {
    const provider = (llm.provider || 'deepseek').toLowerCase();
    const url = `${this.resolveBaseUrl(provider, llm.baseUrl)}/chat/completions`;
    await assertPublicUrl(url); // anti-SSRF: baseUrl puede venir del body
    const { data } = await axios.post(
      url,
      { model: llm.model, messages, temperature: 0.4, ...noThinking(provider) },
      { headers: { Authorization: `Bearer ${llm.apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 },
    );
    this.recordBuilderUsage(llm, data);
    return data?.choices?.[0]?.message?.content ?? '';
  }

  /** Llamada OpenAI-compatible con tools (DeepSeek y compatibles). */
  private async callLlm(llm: BuilderLlm, messages: any[]): Promise<any> {
    const provider = (llm.provider || 'deepseek').toLowerCase();
    const url = `${this.resolveBaseUrl(provider, llm.baseUrl)}/chat/completions`;
    await assertPublicUrl(url); // anti-SSRF: baseUrl puede venir del body

    const { data } = await axios.post(
      url,
      { model: llm.model, messages, tools: FLOW_TOOLS, tool_choice: 'auto', temperature: 0.2, ...noThinking(provider) },
      {
        headers: { Authorization: `Bearer ${llm.apiKey}`, 'Content-Type': 'application/json' },
        timeout: 60000,
      },
    );
    this.recordBuilderUsage(llm, data);
    return data;
  }

  /** Recorta resultados verbosos (catálogo completo) para no inflar el historial. */
  private trimResult(name: string, result: any): any {
    if (name === 'getCatalog' && result?.catalog) {
      return {
        ok: true,
        catalog: result.catalog.map((n: any) => ({
          type: n.type,
          label: n.label,
          inputs: n.inputs,
          outputs: n.outputs.map((o: any) => o.id),
          dynamicOut: n.dynamicOut,
          data: Object.fromEntries(Object.entries(n.data).map(([k, v]: any) => [k, { type: v.type, required: v.required, enum: v.enum }])),
        })),
      };
    }
    return result;
  }

  private summarize(name: string, args: any, result: any): string {
    if (!result?.ok && result?.error) return `error: ${result.error}`;
    switch (name) {
      case 'addNodesBatch':
        return `+${Object.keys(result.created || {}).length} nodos`;
      case 'addEdgesBatch':
        return `+${result.added || 0} conexiones${result.errors ? ` (${result.errors.length} err)` : ''}`;
      case 'updateNode':
        return `editó ${args?.id}`;
      case 'removeNode':
        return `borró ${args?.id}`;
      case 'clearCanvas':
        return 'lienzo vacío';
      case 'validateGraph':
        return `${(result.problems || []).length} problemas`;
      default:
        return result.ok ? 'ok' : 'sin cambios';
    }
  }

  private msg(err: unknown): string {
    if (axios.isAxiosError(err)) return `${err.response?.status ?? ''} ${JSON.stringify(err.response?.data ?? err.message)}`;
    return err instanceof Error ? err.message : String(err);
  }
}
