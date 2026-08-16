import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toNumber } from './decimal.util';

/** Saldo prepago de un tenant: recargado, consumido y restante (en USD). */
export interface TenantBalance {
  recargadoUsd: number;
  consumidoUsd: number;
  restanteUsd: number;
}

/** Entrada de caché del saldo (sumas materializadas en memoria). */
interface CachedBalance {
  recargadoUsd: number;
  consumidoUsd: number;
  expiresAt: number;
}

/**
 * TTL del caché de saldo. El caché se ajusta INCREMENTALMENTE en cada consumo
 * (noteUsage) y se invalida al recargar, así que el TTL es solo una
 * reconciliación periódica contra la BD (auto-sanado ante cualquier deriva).
 */
const BALANCE_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Servicio de SALDO PREPAGO (recargas) por cliente (tenant).
 * - `topUp`: registra una recarga (CreditTopUp).
 * - `getBalance`: saldo histórico = SUM(recargas) - SUM(consumo). CACHEADO:
 *   sin caché, cada mensaje con IA pagaba un aggregate sobre TODO el histórico
 *   de ai_usage_records (O(n), cada vez más lento con los meses). Ahora el
 *   aggregate corre una vez por TTL y entre medias el saldo se mantiene al día
 *   con ajustes incrementales.
 * - `listTopUps`: historial de recargas.
 * El saldo NO se materializa en Tenant para evitar desincronización; la fuente
 * de verdad siguen siendo las tablas, el caché es solo una vista.
 */
@Injectable()
export class CreditService {
  private readonly balanceCache = new Map<string, CachedBalance>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una recarga de saldo para el tenant. Valida que el monto sea > 0.
   * Devuelve el registro creado.
   */
  async topUp(tenantId: string, amountUsd: number, note?: string) {
    const amount = Number(amountUsd);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('El monto de la recarga debe ser mayor a 0');
    }

    const created = await this.prisma.creditTopUp.create({
      data: {
        tenantId,
        amountUsd: new Prisma.Decimal(amount.toFixed(6)),
        note: note?.trim() || null,
      },
    });
    // La recarga cambia la base del saldo: se recalcula en la próxima lectura.
    this.balanceCache.delete(tenantId);
    return created;
  }

  /**
   * Ajuste INCREMENTAL del caché tras registrar un consumo de IA (lo llama el
   * metering). Mantiene el saldo cacheado al día sin tocar la BD.
   */
  noteUsage(tenantId: string, costUsd: number): void {
    const cached = this.balanceCache.get(tenantId);
    if (cached && Number.isFinite(costUsd)) cached.consumidoUsd += costUsd;
  }

  /**
   * Calcula el saldo HISTÓRICO (acumulado, no por rango) del tenant:
   * - recargado = SUM(amountUsd de credit_topups del tenant)
   * - consumido = SUM(costUsd de ai_usage_records del tenant)
   * - restante  = recargado - consumido
   */
  async getBalance(tenantId: string): Promise<TenantBalance> {
    const cached = this.balanceCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        recargadoUsd: cached.recargadoUsd,
        consumidoUsd: cached.consumidoUsd,
        restanteUsd: cached.recargadoUsd - cached.consumidoUsd,
      };
    }

    const [topUps, usage] = await Promise.all([
      this.prisma.creditTopUp.aggregate({
        where: { tenantId },
        _sum: { amountUsd: true },
      }),
      this.prisma.aiUsageRecord.aggregate({
        where: { tenantId },
        _sum: { costUsd: true },
      }),
    ]);

    const recargadoUsd = toNumber(topUps._sum.amountUsd);
    const consumidoUsd = toNumber(usage._sum.costUsd);
    const restanteUsd = recargadoUsd - consumidoUsd;

    this.balanceCache.set(tenantId, {
      recargadoUsd,
      consumidoUsd,
      expiresAt: Date.now() + BALANCE_CACHE_TTL_MS,
    });

    return { recargadoUsd, consumidoUsd, restanteUsd };
  }

  /**
   * ¿El tenant puede seguir consumiendo IA? El modelo prepago se activa cuando
   * existe al menos una recarga: a partir de ahí se exige saldo restante > 0.
   * Si nunca ha recargado, se considera sin límite (no bloquea).
   */
  async hasCredit(tenantId: string): Promise<boolean> {
    const { recargadoUsd, restanteUsd } = await this.getBalance(tenantId);
    if (recargadoUsd <= 0) return true;
    return restanteUsd > 0;
  }

  /** Historial de recargas del tenant (más recientes primero). */
  async listTopUps(tenantId: string) {
    const topUps = await this.prisma.creditTopUp.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return topUps.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      amountUsd: toNumber(t.amountUsd),
      note: t.note,
      createdAt: t.createdAt,
    }));
  }
}
