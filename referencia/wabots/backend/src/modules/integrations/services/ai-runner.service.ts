import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AiApiService } from './ai-api.service';
import { AiUsageService } from '../../metering/ai-usage.service';
import { CreditService } from '../../metering/credit.service';
import { DeepseekWebRunnerService } from '../../deepseek-web/deepseek-web-runner.service';
import { RunForEnginePayload } from './integration-run.types';

/**
 * Ejecución de nodos de IA para el motor: LLM inline (definido en el nodo) o
 * con integración persistida (plataforma/empresa). Aplica el gate de crédito
 * por tenant y registra el consumo (metering) sin romper el flujo.
 */
@Injectable()
export class AiRunnerService {
  private readonly logger = new Logger(AiRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiApi: AiApiService,
    private readonly aiUsage: AiUsageService,
    private readonly credit: CreditService,
    private readonly deepseekWeb: DeepseekWebRunnerService,
  ) {}

  /** ¿El proveedor pide la sesión web de DeepSeek (gratis) en vez de la API? */
  private isWeb(provider?: string): boolean {
    return (provider || '').toLowerCase() === 'deepseek_web';
  }

  /** Clave de sesión del consumidor: chat:<conversación> o builder:<id>. */
  private sessionKeyFor(payload: RunForEnginePayload): string {
    const kind = (payload as any).source === 'builder' ? 'builder' : 'chat';
    const id = payload.conversationId || payload.tenantId || 'anon';
    return `${kind}:${id}`;
  }

  /**
   * Ejecuta vía DeepSeek-web (gratis) y, ante CUALQUIER fallo, cae en SILENCIO
   * al fallback de API key (no se muestra error en el chat). `fb` es la config
   * de respaldo (provider/model/apiKey/baseUrl).
   */
  private async runViaWebOrFallback(
    fb: { provider?: string; model?: string; apiKey?: string; baseUrl?: string },
    payload: RunForEnginePayload,
  ): Promise<any> {
    // El agente con herramientas NO usa la sesión web (function-calling fiable
    // requiere API): va directo al fallback (deepseek-chat soporta tools nativas).
    const wantsTools = Array.isArray((payload as any).tools) && (payload as any).tools.length > 0;
    if (!wantsTools) {
      try {
        const { text } = await this.deepseekWeb.run({
          sessionKey: this.sessionKeyFor(payload),
          source: (payload as any).source === 'builder' ? 'builder' : 'chat',
          tenantId: payload.tenantId ?? null,
          conversationId: payload.conversationId ?? null,
          systemPrompt: payload.systemPrompt,
          userText: payload.userText ?? '',
        });
        return { reply: text, usage: null, via: 'deepseek_web' };
      } catch (err) {
        this.logger.warn(`deepseek-web falló; fallback silencioso a API key: ${this.msg(err)}`);
      }
    }
    if (!fb.apiKey || !fb.model) return { reply: '' }; // sin fallback útil
    await this.assertCredit(payload.tenantId);
    const result = await this.aiApi.chat(
      { provider: fb.provider || 'deepseek', model: fb.model, apiKey: fb.apiKey, baseUrl: fb.baseUrl } as any,
      {
        systemPrompt: payload.systemPrompt,
        userText: payload.userText,
        history: payload.history,
        variables: payload.variables,
        tools: (payload as any).tools,
        messages: (payload as any).messages,
        conversationId: payload.conversationId ?? undefined,
      } as any,
    );
    this.recordUsageSafe({
      payload,
      provider: fb.provider || 'deepseek',
      model: fb.model,
      source: (payload as any).source === 'tenant' ? 'tenant' : 'platform',
      result,
    });
    return { ...result, via: wantsTools ? 'api' : 'fallback' };
  }

  /**
   * IA con LLM definido EN EL NODO (payload.llm trae provider/model/apiKey).
   * Registra el consumo con source 'node'.
   */
  async runAiInline(payload: RunForEnginePayload): Promise<any> {
    const llm = (payload as any).llm;
    // Proveedor DeepSeek-web (gratis) con fallback silencioso a la API key.
    if (this.isWeb(llm?.provider)) {
      return this.runViaWebOrFallback(
        {
          provider: llm.fallbackProvider,
          model: llm.fallbackModel || llm.model,
          apiKey: llm.fallbackApiKey || llm.apiKey,
          baseUrl: llm.fallbackBaseUrl || llm.baseUrl,
        },
        payload,
      );
    }
    await this.assertCredit(payload.tenantId);
    const result = await this.aiApi.chat(
      { provider: llm.provider, model: llm.model, apiKey: llm.apiKey, baseUrl: llm.baseUrl } as any,
      {
        systemPrompt: payload.systemPrompt,
        userText: payload.userText,
        history: payload.history,
        variables: payload.variables,
        tools: (payload as any).tools,
        messages: (payload as any).messages,
        conversationId: payload.conversationId ?? undefined,
      } as any,
    );
    this.recordUsageSafe({
      payload,
      provider: llm.provider,
      model: llm.model,
      source: 'node',
      result,
    });
    return result;
  }

  /**
   * IA con integración persistida (plataforma o empresa). provider/model/baseUrl
   * vienen de la integración (en claro) y apiKey llega ya DESCIFRADA por
   * decryptConfig; los params del prompt vienen del payload del motor.
   */
  async runAi(
    config: Record<string, any>,
    payload: RunForEnginePayload,
  ): Promise<any> {
    // Proveedor DeepSeek-web (gratis) con fallback silencioso a la API key.
    if (this.isWeb(config.provider)) {
      return this.runViaWebOrFallback(
        {
          provider: config.fallbackProvider,
          model: config.fallbackModel || config.model,
          apiKey: config.fallbackApiKey || config.apiKey,
          baseUrl: config.fallbackBaseUrl || config.baseUrl,
        },
        payload,
      );
    }
    await this.assertCredit(payload.tenantId);
    const aiConfig = {
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
    };
    const aiParams = {
      systemPrompt: payload.systemPrompt,
      userText: payload.userText,
      history: payload.history,
      variables: payload.variables,
      tools: (payload as any).tools,
      messages: (payload as any).messages,
    };
    const result = await this.aiApi.chat(aiConfig as any, aiParams as any);
    this.recordUsageSafe({
      payload,
      provider: config.provider,
      model: config.model,
      source: payload.source === 'tenant' ? 'tenant' : 'platform',
      result,
    });
    return result;
  }

  /**
   * Gate único de consumo de IA por tenant. Corta si:
   *  1. La empresa está SUSPENDIDA (switch OFF del panel): apagar la empresa
   *     apaga el servicio COMPLETO, incluidas rutas indirectas (recordatorios,
   *     agente de correo, etc.), no solo los mensajes entrantes del motor.
   *     PENDING sí puede consumir: es el estado normal mientras se construye y
   *     ensaya el flujo en el editor antes de conectar WhatsApp.
   *  2. El prepago está activo (≥1 recarga) y el saldo se agotó.
   * Sin tenant (plataforma) o sin recargas registradas, no bloquea saldo.
   */
  private async assertCredit(tenantId?: string | null): Promise<void> {
    if (!tenantId) return;
    const [tenant, hasCredit] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { status: true },
      }),
      this.credit.hasCredit(tenantId),
    ]);
    if (tenant?.status === 'SUSPENDED') {
      throw new Error(
        `La empresa está desactivada: consumo de IA bloqueado (tenant ${tenantId})`,
      );
    }
    if (!hasCredit) {
      throw new Error(`Saldo de IA agotado para el tenant ${tenantId}`);
    }
  }

  /**
   * EFECTO SECUNDARIO: registra el consumo de IA (metering). Nunca debe romper
   * el flujo; AiUsageService.record es tolerante a fallos, pero se envuelve en
   * try/catch por seguridad y no se espera (fire-and-forget controlado: solo se
   * captura el error de validación previo al insert).
   */
  private recordUsageSafe(params: {
    payload: RunForEnginePayload;
    provider: string;
    model: string;
    source: string;
    result: any;
  }): void {
    const { payload, result } = params;
    try {
      const usage = (result as any)?.usage;
      if (usage) {
        // 'sim' es el marcador del simulador SIN empresa: se registra como
        // consumo de plataforma (tenant null) para no violar la FK.
        const tenantId =
          payload.tenantId && payload.tenantId !== 'sim' ? payload.tenantId : null;
        void this.aiUsage.record({
          tenantId,
          conversationId: payload.conversationId ?? null,
          flowId: payload.flowId ?? null,
          nodeId: payload.nodeId ?? null,
          provider: params.provider,
          model: params.model,
          source: params.source,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        });
      }
    } catch (err) {
      this.logger.warn(`No se pudo registrar el consumo de IA: ${this.msg(err)}`);
    }
  }

  private msg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
