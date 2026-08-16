import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Integration, IntegrationType } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RunForEnginePayload } from './integration-run.types';

/**
 * Resolución y carga de integraciones para el motor y el CRUD.
 * Centraliza la búsqueda por id (con validación de pertenencia) y la
 * resolución implícita por kind/source cuando el nodo no trae integrationId.
 */
@Injectable()
export class IntegrationResolverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resuelve la integración a usar cuando el nodo NO trae un integrationId
   * explícito. Decide por:
   *  - `type` derivado del kind (calendar→CALENDAR, gmail→GMAIL, ai→AI_API, http→HTTP).
   *  - `source` del payload ('platform' | 'tenant', por defecto 'tenant'):
   *      · platform → integración GLOBAL (tenantId null).
   *      · tenant   → integración del tenant (payload.tenantId).
   * Lanza un error claro si no encuentra una integración activa.
   */
  async resolveIntegration(
    payload: RunForEnginePayload,
  ): Promise<Integration> {
    const KIND_TO_TYPE: Record<string, IntegrationType> = {
      calendar: IntegrationType.CALENDAR,
      gmail: IntegrationType.GMAIL,
      ai: IntegrationType.AI_API,
      http: IntegrationType.HTTP,
    };
    const type = KIND_TO_TYPE[payload?.kind];
    if (!type) {
      throw new Error(
        `No se puede resolver integración para kind: ${String(payload?.kind)}`,
      );
    }

    // source admite: 'tenant' (empresa), 'platform' (plataforma, Service Account
    // para Calendar) y 'platformOauth' (plataforma por OAuth, p.ej. para invitar).
    const rawSource = String(payload?.source ?? 'tenant');
    const platformLike = rawSource === 'platform' || rawSource === 'platformOauth';

    let integration: Integration | null = null;
    if (platformLike) {
      // Integraciones globales de plataforma (sin tenant). Para Calendar puede
      // haber DOS (Service Account y OAuth); se elige según el source.
      const candidates = await this.prisma.integration.findMany({
        where: { tenantId: null, type, isActive: true },
      });
      if (type === IntegrationType.CALENDAR && candidates.length > 1) {
        const cfg = (i: Integration) => (i.config ?? {}) as Record<string, any>;
        if (rawSource === 'platformOauth') {
          integration = candidates.find((i) => cfg(i).refreshToken) ?? null;
        } else {
          integration =
            candidates.find((i) => cfg(i).serviceAccountEnc) ?? candidates[0];
        }
      } else {
        integration = candidates[0] ?? null;
      }
    } else {
      // Modelo A: integración del tenant.
      const tenantId = payload?.tenantId as string | undefined;
      if (!tenantId) {
        throw new Error(
          `Falta tenantId para resolver la integración de tipo ${type} (modelo tenant).`,
        );
      }
      integration = await this.prisma.integration.findFirst({
        where: { tenantId, type, isActive: true },
      });
    }

    if (!integration) {
      const modelo =
        rawSource === 'platformOauth'
          ? 'plataforma (OAuth)'
          : platformLike
            ? 'plataforma'
            : 'empresa';
      throw new Error(
        `No hay integración de ${type} conectada (modelo ${modelo}).`,
      );
    }
    return integration;
  }

  /** Carga una integración o lanza 404. */
  async getOrThrow(id: string): Promise<Integration> {
    const integration = await this.prisma.integration.findUnique({
      where: { id },
    });
    if (!integration) {
      throw new NotFoundException(`Integración ${id} no encontrada`);
    }
    return integration;
  }

  /**
   * Carga una integración validando que pertenezca al tenant que la invoca
   * (o que sea global de plataforma). Evita que el flujo de una empresa use las
   * credenciales de otra vía un integrationId ajeno.
   */
  async getOwnedOrThrow(
    id: string,
    callerTenantId?: string,
  ): Promise<Integration> {
    const integration = await this.getOrThrow(id);
    const isGlobal = integration.tenantId === null;
    const isOwn = integration.tenantId === callerTenantId;
    if (!isGlobal && !isOwn) {
      throw new ForbiddenException(
        'La integración no pertenece a esta empresa',
      );
    }
    return integration;
  }
}
