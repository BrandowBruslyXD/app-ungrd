import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiUsageService } from './ai-usage.service';
import { CreditService } from './credit.service';
import { TopUpDto } from './dto/top-up.dto';
import { fetchProviderBalance } from './provider-balance';

/** TTL del caché en memoria del saldo del proveedor (ms). */
const PROVIDER_BALANCE_TTL_MS = 120_000;

/**
 * Panel admin de METERING de consumo de IA y SALDO PREPAGO por tenant.
 * Protegido con JWT. Rango de fechas opcional; por defecto el mes actual
 * (primer día a las 00:00 hasta ahora).
 */
@Controller('admin/metering')
export class MeteringController {
  private readonly logger = new Logger(MeteringController.name);

  /**
   * Caché en memoria (un solo slot: el saldo del proveedor es GLOBAL de la
   * plataforma) para no repetir la llamada externa en cada visita al panel.
   */
  private providerBalanceCache: { value: unknown; expires: number } | null =
    null;

  constructor(
    private readonly aiUsage: AiUsageService,
    private readonly credit: CreditService,
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Resumen agregado por tenant en el rango (o el mes actual por defecto).
   * El saldo del proveedor es GLOBAL (endpoint provider-balance), por lo que
   * aquí NO se enriquece cada fila con saldo por tenant (evita N+1 de
   * agregaciones por request; el panel no lo consume).
   */
  @Get('summary')
  async summary(@Query('from') from?: string, @Query('to') to?: string) {
    const { fromDate, toDate } = this.resolveRange(from, to);
    const data = await this.aiUsage.summary(fromDate, toDate);
    return { data };
  }

  /**
   * Detalle de consumo de un tenant en el rango (o el mes actual por defecto).
   * Incluye el SALDO histórico del tenant en `balance`.
   * El pseudo-id 'platform' devuelve el detalle del consumo INTERNO de la
   * plataforma (registros sin tenant: constructor de flujos IA, pruebas del
   * editor sin empresa). No tiene saldo prepago → balance null.
   */
  @Get('tenant/:tenantId')
  async tenantDetail(
    @Param('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { fromDate, toDate } = this.resolveRange(from, to);
    const isPlatform = tenantId === 'platform';
    const [detail, balance] = await Promise.all([
      this.aiUsage.tenantDetail(isPlatform ? null : tenantId, fromDate, toDate),
      isPlatform ? Promise.resolve(null) : this.credit.getBalance(tenantId),
    ]);
    return { data: { ...detail, balance } };
  }

  /** Registra una recarga de saldo y devuelve el balance actualizado. */
  @Post('tenant/:tenantId/topup')
  async topUp(@Param('tenantId') tenantId: string, @Body() body: TopUpDto) {
    await this.credit.topUp(tenantId, body.amountUsd, body.note);
    return { data: await this.credit.getBalance(tenantId) };
  }

  /** Saldo prepago histórico del tenant (recargado/consumido/restante). */
  @Get('tenant/:tenantId/balance')
  async balance(@Param('tenantId') tenantId: string) {
    return { data: await this.credit.getBalance(tenantId) };
  }

  /** Historial de recargas del tenant (más recientes primero). */
  @Get('tenant/:tenantId/topups')
  async topUps(@Param('tenantId') tenantId: string) {
    return { data: await this.credit.listTopUps(tenantId) };
  }

  /**
   * SALDO GLOBAL del proveedor de LLM de la PLATAFORMA (la API key es una sola,
   * nuestra; no pertenece a cada empresa). Origen de credenciales:
   *  1) la integración global "LLM plataforma" (AI_API, tenantId null);
   *  2) fallback: el primer nodo aiAgent con key propia en cualquier flujo.
   * Tolerante a fallos y NUNCA expone la apiKey.
   *
   * El resultado se cachea en memoria 120s: la llamada externa al proveedor
   * no se repite en cada visita al panel. Throttle propio (más estricto que
   * el global) porque cada miss dispara una petición saliente.
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('provider-balance')
  async providerBalance() {
    // Devuelve el valor cacheado si sigue fresco (slot único: saldo global).
    const cached = this.providerBalanceCache;
    if (cached && cached.expires > Date.now()) {
      return { data: cached.value };
    }

    try {
      const llm = (await this.findPlatformLlm()) ?? (await this.findAnyFlowLlm());
      if (!llm) {
        const value = {
          available: false,
          note: 'No hay un LLM con API key configurado (plataforma ni flujos).',
        };
        this.providerBalanceCache = {
          value,
          expires: Date.now() + PROVIDER_BALANCE_TTL_MS,
        };
        return { data: value };
      }

      const balance = await fetchProviderBalance(llm.provider, llm.apiKey, llm.baseUrl);
      // No exponemos la apiKey; solo el proveedor y el resultado del saldo.
      const value = { provider: llm.provider, ...balance };
      this.providerBalanceCache = {
        value,
        expires: Date.now() + PROVIDER_BALANCE_TTL_MS,
      };
      return { data: value };
    } catch (err) {
      // El detalle queda en el log; al cliente solo una nota genérica (sin
      // exponer mensajes ni hosts internos). Los errores NO se cachean.
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Fallo al consultar el saldo del proveedor: ${msg}`);
      return {
        data: {
          available: false,
          note: 'No se pudo consultar el saldo del proveedor.',
        },
      };
    }
  }

  /** Credenciales del LLM global de plataforma (integración AI_API sin tenant). */
  private async findPlatformLlm(): Promise<{ provider: string; apiKey: string; baseUrl?: string } | null> {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId: null, type: 'AI_API', isActive: true },
    });
    const cfg = (integration?.config ?? {}) as Record<string, any>;
    if (!cfg.provider || !cfg.apiKey) return null;
    return {
      provider: String(cfg.provider),
      apiKey: this.decryptSecret(String(cfg.apiKey)),
      ...(cfg.baseUrl ? { baseUrl: String(cfg.baseUrl) } : {}),
    };
  }

  /** Fallback: primer nodo aiAgent con key propia en cualquier flujo. */
  private async findAnyFlowLlm(): Promise<{ provider: string; apiKey: string; baseUrl?: string } | null> {
    const flows = await this.prisma.flow.findMany({ select: { id: true, graph: true } });
    return this.findFlowLlm(flows);
  }

  /**
   * Busca el PRIMER nodo aiAgent con LLM propio (provider + apiKey) en los
   * grafos y devuelve sus credenciales (apiKey ya descifrada), o null si no
   * hay ninguno. Corta la búsqueda en cuanto encuentra uno (early return).
   */
  private findFlowLlm(
    flows: Array<{ graph: unknown }>,
  ): { provider: string; apiKey: string; baseUrl?: string } | null {
    for (const flow of flows) {
      const graph: any = flow.graph;
      const nodes: any[] = Array.isArray(graph?.nodes) ? graph.nodes : [];
      for (const node of nodes) {
        const d: any = node?.data ?? {};
        if (node?.type !== 'aiAgent') continue;
        // Ignora los nodos que usan la integración de plataforma/empresa.
        if (d.llmMode === 'platform' || d.llmMode === 'tenant') continue;
        if (d.provider && d.apiKey) {
          return {
            provider: String(d.provider),
            // La apiKey se guarda cifrada en el grafo; se descifra aquí.
            apiKey: this.decryptSecret(String(d.apiKey)),
            ...(d.baseUrl ? { baseUrl: String(d.baseUrl) } : {}),
          };
        }
      }
    }
    return null;
  }

  /** Descifra un secreto del grafo, tolerando valores en claro heredados. */
  private decryptSecret(value: string): string {
    try {
      return this.crypto.decrypt(value);
    } catch {
      return value;
    }
  }

  /**
   * Resuelve el rango de fechas. Si faltan from/to (o son inválidas), usa el
   * mes actual: desde el primer día del mes a las 00:00 hasta el momento actual.
   */
  private resolveRange(
    from?: string,
    to?: string,
  ): { fromDate: Date; toDate: Date } {
    const now = new Date();

    let fromDate = from ? new Date(from) : null;
    if (!fromDate || isNaN(fromDate.getTime())) {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    let toDate = to ? new Date(to) : null;
    if (!toDate || isNaN(toDate.getTime())) {
      toDate = now;
    }

    return { fromDate, toDate };
  }
}
