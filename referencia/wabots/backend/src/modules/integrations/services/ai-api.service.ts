import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

import { withRetry } from '../../../common/http/with-retry';
import { assertPublicUrl } from './http.service';

/**
 * Configuración (ya descifrada) de una invocación de IA multi-proveedor.
 * `provider` decide a qué endpoint y con qué shape se llama.
 */
export interface AiApiConfig {
  // Id de proveedor: openai | openai_compatible | custom | deepseek | anthropic | google
  provider?: string;
  // Modelo a usar (id que acepta el proveedor).
  model: string;
  // API key ya DESCIFRADA (texto plano).
  apiKey: string;
  // baseUrl propia (solo para openai_compatible/custom o para sobreescribir el default).
  baseUrl?: string;
  // Ruta del endpoint de chat estilo OpenAI (default '/chat/completions').
  path?: string;
  // Tope de tokens de salida (lo usa Anthropic; opcional para el resto).
  maxTokens?: number;
}

/** Un mensaje del historial de conversación. Admite el rol 'tool' y los
 * tool_calls del assistant para el loop de herramientas (function-calling). */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: any[];
  name?: string;
}

/** Una llamada a herramienta que pidió el modelo. */
export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

/** Tokens consumidos por una invocación (para metering). */
export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Resultado de chat(): texto de respuesta + uso de tokens (si el proveedor lo
 * reporta) + tool_calls que pidió el modelo (para el loop de herramientas). */
export interface ChatResult {
  reply: string;
  usage?: ChatUsage;
  toolCalls?: ToolCall[];
}

/**
 * Cotas por defecto de la RESPUESTA del bot. Los mensajes de WhatsApp son
 * cortos: 600 tokens de salida sobran para una respuesta natural y evitan
 * costos sin tope. `config.maxTokens` permite subirla por integración/nodo.
 */
const DEFAULT_MAX_TOKENS = 600;
const DEFAULT_TEMPERATURE = 0.6;

/**
 * Timeout de las llamadas al LLM. Configurable (LLM_TIMEOUT_MS) porque los
 * modelos de razonamiento pueden tardar más de los 30s por defecto.
 */
const LLM_TIMEOUT_MS = Math.max(5000, Number(process.env.LLM_TIMEOUT_MS ?? 30000));

/** Parámetros de una invocación de chat. */
export interface ChatParams {
  systemPrompt?: string;
  userText: string;
  variables?: Record<string, any>;
  history?: ChatMessage[];
  // Herramientas (esquema function-calling estilo OpenAI) que el modelo puede
  // invocar. Solo lo respeta la ruta OpenAI-compatible (openai/deepseek).
  tools?: any[];
  // Si viene, se usa TAL CUAL como el array de mensajes (para el loop de tools,
  // donde el executor arma system+history+user+tool). Ignora systemPrompt/userText/history.
  messages?: ChatMessage[];
  /**
   * Id de la conversación del motor. Lo necesitan los proveedores que son un AGENTE
   * completo (no un LLM crudo) y guardan la memoria de su lado: se les manda un turno
   * y ellos reconstruyen el hilo. Sin esto, cada mensaje sería una conversación nueva.
   */
  conversationId?: string;
}

/**
 * Catálogo de proveedores soportados (basado en lo visto en Telar).
 * Cada entrada lista su id, label, baseUrl por defecto y un set curado de
 * modelos. La verdad real la da la API del proveedor; esto solo precarga el UI.
 */
export interface AiProviderInfo {
  id: string;
  label: string;
  defaultBaseUrl?: string;
  models: string[];
}

export const AI_PROVIDERS: AiProviderInfo[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-mini'],
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    defaultBaseUrl: 'https://api.anthropic.com',
    models: [
      'claude-sonnet-4-6',
      'claude-opus-4-1',
      'claude-sonnet-4-5',
      'claude-haiku-4-5',
      'claude-3-5-sonnet-latest',
    ],
  },
  {
    // No es un LLM: es un AGENTE de LETY.AI, con su propio prompt, sus herramientas y
    // su memoria. En 'model' va el UUID del agente, no un nombre de modelo.
    id: 'lety',
    label: 'LETY.AI (agente externo)',
    defaultBaseUrl: 'https://app.lety.ai/api/v1',
    models: [],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'google',
    label: 'Google Gemini',
    defaultBaseUrl:
      'https://generativelanguage.googleapis.com/v1beta',
    models: [
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-1.5-pro',
    ],
  },
  {
    id: 'openai_compatible',
    label: 'OpenAI-compatible (baseUrl propia)',
    models: [],
  },
  {
    id: 'custom',
    label: 'Personalizado (baseUrl propia)',
    models: [],
  },
];

/**
 * Cliente de IA MULTI-PROVEEDOR (sin streaming, una sola respuesta).
 * Según `config.provider` despacha al endpoint correcto con axios y normaliza
 * la respuesta a `{ reply }`. La apiKey llega YA descifrada.
 */
@Injectable()
export class AiApiService {
  private readonly logger = new Logger(AiApiService.name);

  /**
   * Envía una conversación al modelo del proveedor indicado y devuelve el
   * texto de la respuesta. Despacha por `config.provider`.
   */
  async chat(config: AiApiConfig, params: ChatParams): Promise<ChatResult> {
    if (!config?.apiKey || !config?.model) {
      throw new Error('Config de IA incompleta: se requieren apiKey y model.');
    }

    const provider = (config.provider || 'openai').toLowerCase();

    try {
      // REINTENTOS (backoff+jitter) ante errores transitorios del proveedor
      // (red, 429, 5xx): un hipo del LLM ya no deja al cliente sin respuesta.
      // Un 4xx real (key inválida, modelo inexistente) se propaga sin reintentar.
      return await withRetry(
        async () => {
          switch (provider) {
            case 'anthropic':
              return await this.chatAnthropic(config, params);
            case 'google':
              return await this.chatGoogle(config, params);
            case 'lety':
              return await this.chatLety(config, params);
            case 'deepseek':
              // DeepSeek es OpenAI-compatible con su propia baseUrl.
              return await this.chatOpenAiCompatible(
                { ...config, baseUrl: config.baseUrl || 'https://api.deepseek.com' },
                params,
              );
            case 'openai':
            case 'openai_compatible':
            case 'custom':
            default:
              return await this.chatOpenAiCompatible(config, params);
          }
        },
        {
          onRetry: (n, e) =>
            this.logger.warn(`chat() [${provider}] reintento ${n}: ${this.msg(e)}`),
        },
      );
    } catch (err) {
      this.logger.error(
        `chat() [${provider}] falló: ${this.msg(err)}`,
      );
      // Devuelve reply vacío: el motor decide cómo continuar (handle onError).
      return { reply: '' };
    }
  }

  // ───────────────────────── OpenAI / compatibles ─────────────────────────

  /**
   * Endpoint estilo OpenAI: POST {baseUrl}/chat/completions, auth Bearer,
   * body { model, messages:[system, ...history, user] }, respuesta
   * choices[0].message.content. Cubre openai, openai_compatible, custom y deepseek.
   */
  private async chatOpenAiCompatible(
    config: AiApiConfig,
    params: ChatParams,
  ): Promise<ChatResult> {
    const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(
      /\/+$/,
      '',
    );
    const path = config.path || '/chat/completions';
    const url = `${baseUrl}${path}`;

    let messages: ChatMessage[];
    if (Array.isArray(params.messages)) {
      messages = params.messages;
    } else {
      messages = [];
      if (params.systemPrompt) messages.push({ role: 'system', content: params.systemPrompt });
      if (Array.isArray(params.history)) messages.push(...params.history);
      messages.push({ role: 'user', content: params.userText ?? '' });
    }

    // DeepSeek trae el "thinking mode" ENABLED por defecto (gasta muchos más
    // tokens en cadena de pensamiento). Lo apagamos para los bots; otros
    // proveedores ignoran este parámetro.
    const thinkingOff =
      (config.provider || '').toLowerCase() === 'deepseek'
        ? { thinking: { type: 'disabled' } }
        : {};

    await assertPublicUrl(url); // anti-SSRF: baseUrl puede venir del usuario
    const { data } = await axios.post(
      url,
      {
        model: config.model,
        messages,
        max_tokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        ...(Array.isArray(params.tools) && params.tools.length
          ? { tools: params.tools, tool_choice: 'auto' }
          : {}),
        ...thinkingOff,
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: LLM_TIMEOUT_MS,
        maxRedirects: 0,
      },
    );

    const message = data?.choices?.[0]?.message;
    const reply: string = message?.content ?? '';
    const toolCalls: ToolCall[] = Array.isArray(message?.tool_calls)
      ? message.tool_calls
          .filter((t: any) => t?.type === 'function' && t.function?.name)
          .map((t: any) => ({ id: t.id, name: t.function.name, arguments: t.function.arguments || '{}' }))
      : [];

    const promptTokens = Number(data?.usage?.prompt_tokens) || 0;
    const completionTokens = Number(data?.usage?.completion_tokens) || 0;
    const totalTokens =
      Number(data?.usage?.total_tokens) || promptTokens + completionTokens;

    return {
      reply,
      usage: { promptTokens, completionTokens, totalTokens },
      ...(toolCalls.length ? { toolCalls } : {}),
    };
  }

  // ───────────────────────────── Anthropic ─────────────────────────────

  /**
   * Anthropic Messages API: POST https://api.anthropic.com/v1/messages,
   * headers { x-api-key, anthropic-version }, body { model, max_tokens,
   * system, messages:[{role:'user'|'assistant', content}] }. La respuesta sale
   * de content[0].text. El system prompt va en el campo `system` (NO en messages).
   */
  private async chatAnthropic(
    config: AiApiConfig,
    params: ChatParams,
  ): Promise<ChatResult> {
    const baseUrl = (config.baseUrl || 'https://api.anthropic.com').replace(
      /\/+$/,
      '',
    );
    const url = `${baseUrl}/v1/messages`;

    // Anthropic separa el system del array de mensajes. El historial user/assistant
    // se reenvía tal cual; el system se ignora si aparece dentro del history.
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];
    if (Array.isArray(params.history)) {
      for (const m of params.history) {
        if (m.role === 'user' || m.role === 'assistant') {
          messages.push({ role: m.role, content: m.content ?? '' });
        }
      }
    }
    messages.push({ role: 'user', content: params.userText ?? '' });

    await assertPublicUrl(url); // anti-SSRF: baseUrl puede venir del usuario
    const { data } = await axios.post(
      url,
      {
        model: config.model,
        max_tokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        ...(params.systemPrompt ? { system: params.systemPrompt } : {}),
        messages,
      },
      {
        headers: {
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        timeout: LLM_TIMEOUT_MS,
        maxRedirects: 0,
      },
    );

    // content es un array de bloques; tomamos el texto del primero (o concatenamos).
    let reply = '';
    const blocks = data?.content;
    if (Array.isArray(blocks)) {
      reply = blocks
        .filter((b: any) => b?.type === 'text' && typeof b.text === 'string')
        .map((b: any) => b.text)
        .join('');
      if (!reply && typeof blocks[0]?.text === 'string') reply = blocks[0].text;
    }

    // Anthropic reporta input/output tokens (no un total directo).
    const promptTokens = Number(data?.usage?.input_tokens) || 0;
    const completionTokens = Number(data?.usage?.output_tokens) || 0;
    const totalTokens = promptTokens + completionTokens;

    return {
      reply,
      usage: { promptTokens, completionTokens, totalTokens },
    };
  }

  // ────────────────────────── Google Gemini ──────────────────────────

  /**
   * Gemini generateContent: POST {baseUrl}/models/{model}:generateContent?key={apiKey},
   * body { systemInstruction, contents:[{role:'user'|'model', parts:[{text}]}] }.
   * La respuesta sale de candidates[0].content.parts[0].text.
   */
  private async chatGoogle(
    config: AiApiConfig,
    params: ChatParams,
  ): Promise<ChatResult> {
    const baseUrl = (
      config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'
    ).replace(/\/+$/, '');
    const url = `${baseUrl}/models/${encodeURIComponent(
      config.model,
    )}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

    // Gemini usa el rol 'model' para el assistant; mapeamos el historial.
    const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    if (Array.isArray(params.history)) {
      for (const m of params.history) {
        if (m.role === 'system' || m.role === 'tool') continue;
        const role = m.role === 'assistant' ? 'model' : 'user';
        contents.push({ role, parts: [{ text: m.content ?? '' }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: params.userText ?? '' }] });

    const body: Record<string, any> = {
      contents,
      // Cota de costo por respuesta (mensajes de WhatsApp cortos).
      generationConfig: {
        maxOutputTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
      },
    };
    if (params.systemPrompt) {
      body.systemInstruction = { parts: [{ text: params.systemPrompt }] };
    }

    await assertPublicUrl(url); // anti-SSRF: baseUrl puede venir del usuario
    const { data } = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: LLM_TIMEOUT_MS,
      maxRedirects: 0,
    });

    const parts = data?.candidates?.[0]?.content?.parts;
    let reply = '';
    if (Array.isArray(parts)) {
      reply = parts
        .filter((p: any) => typeof p?.text === 'string')
        .map((p: any) => p.text)
        .join('');
    }

    // Gemini reporta el uso en usageMetadata.
    const promptTokens = Number(data?.usageMetadata?.promptTokenCount) || 0;
    const completionTokens =
      Number(data?.usageMetadata?.candidatesTokenCount) || 0;
    const totalTokens =
      Number(data?.usageMetadata?.totalTokenCount) ||
      promptTokens + completionTokens;

    return {
      reply,
      usage: { promptTokens, completionTokens, totalTokens },
    };
  }

  // ───────────────────────────── Internos ─────────────────────────────

  /** Extrae un mensaje legible de un error de axios. */
  private msg(err: unknown): string {
    if (axios.isAxiosError(err)) {
      return `${err.response?.status ?? ''} ${JSON.stringify(
        err.response?.data ?? err.message,
      )}`;
    }
    return err instanceof Error ? err.message : String(err);
  }

  // ───────────────────────── LETY.AI (agente, no LLM) ─────────────────────────

  /**
   * Delega el turno en un AGENTE de LETY.AI, no en un modelo.
   *
   * La diferencia importa: LETY ya tiene dentro su prompt, sus herramientas HTTP y su
   * propia memoria por `conversationId`. Aquí no se le manda el historial ni el
   * systemPrompt del nodo — los ignoraría, y mandarlos duplicaría el contexto.
   *
   * `config.model` es el **id del agente** (un UUID), no un nombre de modelo: el modelo
   * lo elige LETY del lado suyo.
   *
   * La clave de subcuenta solo autoriza este endpoint; el resto de su API responde 401,
   * así que no hay forma de configurar el agente desde aquí, solo conversar con él.
   */
  private async chatLety(
    config: AiApiConfig,
    params: ChatParams,
  ): Promise<ChatResult> {
    const baseUrl = (config.baseUrl || 'https://app.lety.ai/api/v1').replace(/\/+$/, '');
    const url = `${baseUrl}/agents/${config.model}/chat`;

    // Si no hay conversación del motor, se manda una por turno: pierde memoria, pero
    // es mejor que mezclar hilos de clientes distintos bajo un id compartido.
    const conversationId = params.conversationId || `wabots-${Date.now()}`;

    const { data } = await axios.post(
      url,
      { message: params.userText ?? '', conversationId },
      {
        headers: {
          'external-api-key': config.apiKey,
          'Content-Type': 'application/json',
          // Cloudflare rechaza los user-agent por defecto de algunos clientes (error 1010).
          'User-Agent': 'curl/8.7.1',
          Accept: '*/*',
        },
        // Un agente con herramientas encadena varias llamadas: tarda más que un LLM suelto.
        timeout: 120_000,
      },
    );

    const reply = data?.response?.message ?? data?.message?.message ?? '';
    if (!reply) {
      this.logger.warn(`chatLety(${config.model}): respuesta sin texto.`);
    }
    return { reply: typeof reply === 'string' ? reply : '' };
  }
}
