import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { computeCostUsd } from './ai-pricing';
import { CreditService } from './credit.service';
import { toNumber } from './decimal.util';

/** Datos de una invocación de IA a registrar para metering. */
export interface RecordAiUsageInput {
  tenantId?: string | null;
  conversationId?: string | null;
  flowId?: string | null;
  nodeId?: string | null;
  provider: string;
  model: string;
  source?: string; // platform | tenant | node | builder
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/** Formatea una fecha como 'YYYY-MM-DD' (en UTC para consistencia). */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Tope de registros que carga tenantDetail para el desglose por día. Evita
 * cargar en memoria un rango sin límite; si un tenant supera el tope en el
 * rango, el desglose por día queda truncado a los primeros N registros.
 */
const MAX_DETAIL_RECORDS = 10_000;

/**
 * Servicio de METERING de consumo de IA por cliente (tenant).
 * - `record`: persiste un registro por invocación (tolerante a fallos).
 * - `summary` / `tenantDetail`: agregaciones para el panel admin.
 */
@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credit: CreditService,
  ) {}

  /**
   * Registra el consumo de una invocación de IA. Calcula totalTokens si no viene
   * y el costUsd con la tabla de precios. NUNCA propaga errores: si falla, deja
   * un warn y devuelve null (el metering es un efecto secundario, no debe romper
   * el flujo de conversación).
   */
  async record(input: RecordAiUsageInput): Promise<void> {
    try {
      const promptTokens = Math.max(0, Math.trunc(input.promptTokens ?? 0));
      const completionTokens = Math.max(
        0,
        Math.trunc(input.completionTokens ?? 0),
      );
      const totalTokens =
        input.totalTokens != null && input.totalTokens > 0
          ? Math.trunc(input.totalTokens)
          : promptTokens + completionTokens;

      const costUsd = computeCostUsd(
        input.provider,
        input.model,
        promptTokens,
        completionTokens,
      );

      await this.prisma.aiUsageRecord.create({
        data: {
          tenantId: input.tenantId ?? null,
          conversationId: input.conversationId ?? null,
          flowId: input.flowId ?? null,
          nodeId: input.nodeId ?? null,
          provider: input.provider,
          model: input.model,
          source: input.source ?? 'platform',
          promptTokens,
          completionTokens,
          totalTokens,
          costUsd: new Prisma.Decimal(costUsd.toFixed(6)),
        },
      });
      // Mantiene el saldo cacheado al día sin re-agregar todo el histórico.
      if (input.tenantId) this.credit.noteUsage(input.tenantId, costUsd);
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      this.logger.warn(`No se pudo registrar el consumo de IA: ${m}`);
    }
  }

  /**
   * Resumen agregado por tenant dentro de un rango de fechas.
   * Devuelve totales globales y el detalle por cada tenant.
   */
  async summary(from: Date, to: Date) {
    const grouped = await this.prisma.aiUsageRecord.groupBy({
      by: ['tenantId'],
      where: { createdAt: { gte: from, lte: to } },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        costUsd: true,
      },
      _count: { _all: true },
    });

    // TODAS las empresas aparecen en el resumen, tengan o no consumo en el
    // rango: el panel siempre muestra cada cliente con su saldo, en vez de
    // una tabla vacía hasta la primera llamada al LLM.
    const allTenants = await this.prisma.tenant.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
      take: 500, // tope defensivo de memoria; el panel no pagina aún
    });
    const nameById = new Map(allTenants.map((t) => [t.id, t.name]));
    const byTenantId = new Map(grouped.map((g) => [g.tenantId, g]));

    const rowFor = (tenantId: string | null) => {
      const g = byTenantId.get(tenantId);
      return {
        tenantId,
        tenantName: tenantId
          ? nameById.get(tenantId) ?? null
          : 'Plataforma (sin tenant)',
        calls: g?._count._all ?? 0,
        promptTokens: g?._sum.promptTokens ?? 0,
        completionTokens: g?._sum.completionTokens ?? 0,
        totalTokens: g?._sum.totalTokens ?? 0,
        costUsd: toNumber(g?._sum.costUsd),
      };
    };

    const perTenant = [
      ...allTenants.map((t) => rowFor(t.id)),
      // La fila de plataforma (tenant null) solo si registró consumo.
      ...(byTenantId.has(null) ? [rowFor(null)] : []),
    ];

    const totals = perTenant.reduce(
      (acc, t) => {
        acc.calls += t.calls;
        acc.promptTokens += t.promptTokens;
        acc.completionTokens += t.completionTokens;
        acc.totalTokens += t.totalTokens;
        acc.costUsd += t.costUsd;
        return acc;
      },
      {
        calls: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
      },
    );

    return {
      range: { from, to },
      totals,
      perTenant,
    };
  }

  /**
   * Detalle de consumo de un tenant: totales, desglose por modelo, por ORIGEN
   * (bot vs constructor de flujos, para cuentas claras) y por día.
   * `tenantId: null` = detalle del consumo de PLATAFORMA (interno, sin
   * empresa): pruebas del editor sin tenant y el constructor de flujos IA.
   * Los TOTALES se calculan con un aggregate exacto sobre el rango (no
   * dependen del tope de registros). El desglose por día se agrupa en JS a
   * partir de los registros del rango (topeado a MAX_DETAIL_RECORDS).
   */
  async tenantDetail(tenantId: string | null, from: Date, to: Date) {
    const rangeWhere = { tenantId, createdAt: { gte: from, lte: to } };

    const [tenant, bySourceGrouped, byModelGrouped, aggregated] = await Promise.all([
      tenantId
        ? this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true },
          })
        : Promise.resolve({ name: 'Plataforma (uso interno)' }),
      this.prisma.aiUsageRecord.groupBy({
        by: ['source'],
        where: rangeWhere,
        _sum: {
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          costUsd: true,
        },
        _count: { _all: true },
      }),
      // Desglose por modelo con groupBy (exacto).
      this.prisma.aiUsageRecord.groupBy({
        by: ['provider', 'model'],
        where: rangeWhere,
        _sum: {
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          costUsd: true,
        },
        _count: { _all: true },
      }),
      // Totales EXACTOS del rango (independientes del tope del detalle).
      this.prisma.aiUsageRecord.aggregate({
        where: rangeWhere,
        _sum: {
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          costUsd: true,
        },
        _count: { _all: true },
      }),
    ]);

    const byModel = byModelGrouped.map((g) => ({
      provider: g.provider,
      model: g.model,
      calls: g._count._all,
      promptTokens: g._sum.promptTokens ?? 0,
      completionTokens: g._sum.completionTokens ?? 0,
      totalTokens: g._sum.totalTokens ?? 0,
      costUsd: toNumber(g._sum.costUsd),
    }));

    // Desglose por ORIGEN (cuentas claras): separa el consumo del BOT
    // (conversaciones/pruebas) del CONSTRUCTOR de flujos IA (uso interno).
    const bySource = bySourceGrouped
      .map((g) => ({
        source: g.source,
        calls: g._count._all,
        promptTokens: g._sum.promptTokens ?? 0,
        completionTokens: g._sum.completionTokens ?? 0,
        totalTokens: g._sum.totalTokens ?? 0,
        costUsd: toNumber(g._sum.costUsd),
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens);

    // Totales exactos desde el aggregate (nunca truncados por el tope).
    const totals = {
      calls: aggregated._count._all,
      promptTokens: aggregated._sum.promptTokens ?? 0,
      completionTokens: aggregated._sum.completionTokens ?? 0,
      totalTokens: aggregated._sum.totalTokens ?? 0,
      costUsd: toNumber(aggregated._sum.costUsd),
    };

    // Registros del rango SOLO para el desglose por día (puede quedar topeado).
    const records = await this.prisma.aiUsageRecord.findMany({
      where: rangeWhere,
      select: { totalTokens: true, costUsd: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: MAX_DETAIL_RECORDS,
    });

    const dayMap = new Map<string, { totalTokens: number; costUsd: number }>();
    for (const r of records) {
      const day = dayKey(r.createdAt);
      const cost = toNumber(r.costUsd);
      const tokens = r.totalTokens ?? 0;
      const acc = dayMap.get(day) ?? { totalTokens: 0, costUsd: 0 };
      acc.totalTokens += tokens;
      acc.costUsd += cost;
      dayMap.set(day, acc);
    }

    const byDay = Array.from(dayMap.entries())
      .map(([day, v]) => ({
        day,
        totalTokens: v.totalTokens,
        costUsd: v.costUsd,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));

    return {
      tenantId,
      tenantName: tenant?.name ?? null,
      totals,
      byModel,
      bySource,
      byDay,
    };
  }
}
