import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IntegrationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CryptoService } from '../../../common/crypto/crypto.service';
import {
  decryptConfig,
  encryptConfig,
  mask,
} from './integration-crypto.util';

/**
 * Persistencia de las integraciones "con nombre" de la plataforma: tokens
 * OAuth de Google, cuenta de servicio de Calendar, agente de correo y LLMs
 * (de plataforma y por empresa). Los secretos se guardan siempre CIFRADOS y
 * las respuestas van enmascaradas ('***').
 */
@Injectable()
export class IntegrationConfigService {
  private readonly logger = new Logger(IntegrationConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  // ──────────────────────── OAuth de Google ────────────────────────

  /**
   * Crea o actualiza la Integration que guarda los tokens OAuth de Google
   * (CALENDAR o GMAIL). Los secretos se persisten CIFRADOS.
   *
   * `target` es el tenantId (Modelo A, por empresa) o `null` para una
   * integración GLOBAL/plataforma (Modelo B), reutilizable por todos.
   *
   * Como con tenantId=null no podemos usar `upsert` sobre la clave única
   * compuesta (tenantId+type+name), buscamos con `findFirst` y luego
   * create/update manualmente.
   *
   * Si Google no devolvió refresh_token (porque el usuario ya consintió antes),
   * se conserva el refreshToken previo almacenado para no perder el acceso.
   */
  async saveGoogleTokens(
    target: string | null,
    type: 'calendar' | 'gmail',
    tokens: { access_token: string; refresh_token?: string },
  ) {
    const integrationType: IntegrationType =
      type === 'calendar' ? IntegrationType.CALENDAR : IntegrationType.GMAIL;
    const name = `Google ${type}`;

    // Busca una integración previa por tenantId (puede ser null), type y name.
    const existing = await this.prisma.integration.findFirst({
      where: { tenantId: target, type: integrationType, name },
    });

    // Determina el refreshToken a guardar: el nuevo o, si no vino, el previo.
    let refreshToken = tokens.refresh_token;
    if (!refreshToken && existing) {
      const prev = decryptConfig(this.crypto, existing);
      refreshToken = prev.refreshToken;
    }
    if (!refreshToken) {
      throw new Error(
        'Google no devolvió refresh_token y no hay uno previo. ' +
          'Revoca el acceso en la cuenta de Google y vuelve a conectar.',
      );
    }

    const encrypted = encryptConfig(this.crypto, {
      refreshToken,
      accessToken: tokens.access_token,
    });

    // Sin upsert: create si no existe, update si existe (por su id).
    const saved = existing
      ? await this.prisma.integration.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            config: encrypted as Prisma.InputJsonValue,
          },
        })
      : await this.prisma.integration.create({
          data: {
            tenantId: target,
            type: integrationType,
            name,
            isActive: true,
            config: encrypted as Prisma.InputJsonValue,
          },
        });

    this.logger.log(
      `Tokens de Google (${type}) guardados para ${
        target ? `tenant ${target}` : 'plataforma (global)'
      }.`,
    );
    return mask(saved);
  }

  /**
   * Crea o actualiza la Integration que guarda una CUENTA DE SERVICIO de Google
   * para Calendar (Modelo C: agenda directa, sin OAuth/consent).
   *
   * `target` es el tenantId (por empresa) o `null` para una integración
   * GLOBAL/plataforma. El JSON de la cuenta de servicio se persiste CIFRADO en
   * `config.serviceAccountEnc`; el `calendarId` (correo del calendario
   * compartido con la SA) se guarda en claro.
   *
   * Como con tenantId=null no se puede usar `upsert` sobre la clave única
   * compuesta, buscamos con `findFirst` y luego create/update manualmente.
   */
  async saveServiceAccount(
    target: string | null,
    calendarId: string,
    serviceAccount: { client_email: string; private_key: string },
  ) {
    const name = 'Google Calendar (SA)';

    // Cifra el JSON completo de la cuenta de servicio en un único campo.
    const serviceAccountEnc = this.crypto.encrypt(
      JSON.stringify(serviceAccount),
    );
    const config = { calendarId, serviceAccountEnc };

    // Busca una integración previa por tenantId (puede ser null), type y name.
    const existing = await this.prisma.integration.findFirst({
      where: { tenantId: target, type: IntegrationType.CALENDAR, name },
    });

    const saved = existing
      ? await this.prisma.integration.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            config: config as Prisma.InputJsonValue,
          },
        })
      : await this.prisma.integration.create({
          data: {
            tenantId: target,
            type: IntegrationType.CALENDAR,
            name,
            isActive: true,
            config: config as Prisma.InputJsonValue,
          },
        });

    this.logger.log(
      `Cuenta de servicio de Calendar guardada para ${
        target ? `tenant ${target}` : 'plataforma (global)'
      }.`,
    );
    return mask(saved);
  }

  // ──────────────────────── Agente de correo ────────────────────────

  /**
   * Habilita/configura el AGENTE DE CORREO de un tenant. Persiste la config del
   * agente (agentEnabled, systemPrompt, calendarId, autoReply) en la Integration
   * GMAIL del tenant (la que guarda los tokens OAuth, name 'Google gmail'),
   * SIN tocar los tokens cifrados existentes.
   *
   * Si el tenant aún no conectó Gmail por OAuth, lanza un error claro: primero
   * hay que conectar Gmail (saveGoogleTokens) para tener dónde guardar la config.
   */
  async setGmailAgentConfig(
    tenantId: string,
    input: {
      enabled: boolean;
      systemPrompt?: string;
      calendarId?: string;
      autoReply?: boolean;
    },
  ) {
    if (!tenantId) throw new Error('Se requiere tenantId.');

    const existing = await this.prisma.integration.findFirst({
      where: { tenantId, type: IntegrationType.GMAIL, name: 'Google gmail' },
    });
    if (!existing) {
      throw new NotFoundException(
        'El tenant no tiene Gmail conectado. Conecta Gmail por OAuth antes de ' +
          'configurar el agente de correo.',
      );
    }

    // Conserva la config previa (incluye los tokens cifrados) y solo ajusta los
    // campos del agente. Estos campos NO son secretos, se guardan en claro.
    const prev = (existing.config ?? {}) as Record<string, any>;
    const config: Record<string, any> = {
      ...prev,
      agentEnabled: !!input.enabled,
      ...(input.systemPrompt !== undefined
        ? { systemPrompt: input.systemPrompt }
        : {}),
      ...(input.calendarId !== undefined
        ? { calendarId: input.calendarId }
        : {}),
      ...(input.autoReply !== undefined ? { autoReply: !!input.autoReply } : {}),
    };

    const saved = await this.prisma.integration.update({
      where: { id: existing.id },
      data: { config: config as Prisma.InputJsonValue },
    });

    this.logger.log(
      `Agente de correo ${input.enabled ? 'habilitado' : 'deshabilitado'} para tenant ${tenantId}.`,
    );
    return mask(saved);
  }

  // ─────────────────────── LLM de plataforma ───────────────────────

  /**
   * Crea o actualiza la Integration GLOBAL (tenantId null) que guarda el LLM de
   * plataforma. type AI_API, name 'LLM plataforma'. La apiKey se persiste CIFRADA;
   * provider/model/baseUrl se guardan en claro.
   *
   * Como con tenantId=null no se puede usar `upsert` sobre la clave única
   * compuesta, buscamos con `findFirst` y luego create/update manualmente
   * (mismo patrón que saveGoogleTokens/saveServiceAccount).
   */
  async savePlatformLlm(input: {
    provider: string;
    model: string;
    apiKey: string;
    baseUrl?: string;
  }) {
    const name = 'LLM plataforma';

    if (!input?.provider || !input?.model || !input?.apiKey) {
      throw new Error('Se requieren provider, model y apiKey.');
    }

    // Cifra solo la apiKey; el resto queda en claro.
    const config = encryptConfig(this.crypto, {
      provider: input.provider,
      model: input.model,
      apiKey: input.apiKey,
      ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
    });

    const existing = await this.prisma.integration.findFirst({
      where: { tenantId: null, type: IntegrationType.AI_API, name },
    });

    const saved = existing
      ? await this.prisma.integration.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            config: config as Prisma.InputJsonValue,
          },
        })
      : await this.prisma.integration.create({
          data: {
            tenantId: null,
            type: IntegrationType.AI_API,
            name,
            isActive: true,
            config: config as Prisma.InputJsonValue,
          },
        });

    this.logger.log(
      `LLM de plataforma guardado (provider=${input.provider}, model=${input.model}).`,
    );
    return mask(saved);
  }

  /**
   * Estado actual del LLM de plataforma: provider, model y baseUrl (SIN apiKey),
   * o null si no hay ninguno configurado.
   */
  async getPlatformLlm(): Promise<{
    provider: string | null;
    model: string | null;
    baseUrl: string | null;
  } | null> {
    const existing = await this.prisma.integration.findFirst({
      where: {
        tenantId: null,
        type: IntegrationType.AI_API,
        name: 'LLM plataforma',
      },
    });
    if (!existing) return null;
    const config = (existing.config ?? {}) as Record<string, any>;
    return {
      provider: config.provider ?? null,
      model: config.model ?? null,
      baseUrl: config.baseUrl ?? null,
    };
  }

  // ───────────────────────── LLM por empresa ─────────────────────────

  /**
   * Crea o actualiza la Integration del TENANT que guarda el LLM de la empresa.
   * type AI_API, name 'LLM empresa'. La apiKey se persiste CIFRADA; provider/model/
   * baseUrl se guardan en claro. Mismo patrón que savePlatformLlm pero con tenantId real.
   */
  async saveTenantLlm(
    tenantId: string,
    input: {
      provider: string;
      model: string;
      apiKey: string;
      baseUrl?: string;
    },
  ) {
    const name = 'LLM empresa';

    if (!tenantId) {
      throw new Error('Se requiere tenantId.');
    }
    if (!input?.provider || !input?.model || !input?.apiKey) {
      throw new Error('Se requieren provider, model y apiKey.');
    }

    // Cifra solo la apiKey; el resto queda en claro.
    const config = encryptConfig(this.crypto, {
      provider: input.provider,
      model: input.model,
      apiKey: input.apiKey,
      ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
    });

    const existing = await this.prisma.integration.findFirst({
      where: { tenantId, type: IntegrationType.AI_API, name },
    });

    const saved = existing
      ? await this.prisma.integration.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            config: config as Prisma.InputJsonValue,
          },
        })
      : await this.prisma.integration.create({
          data: {
            tenantId,
            type: IntegrationType.AI_API,
            name,
            isActive: true,
            config: config as Prisma.InputJsonValue,
          },
        });

    this.logger.log(
      `LLM de empresa guardado (tenant=${tenantId}, provider=${input.provider}, model=${input.model}).`,
    );
    return mask(saved);
  }

  /**
   * Estado actual del LLM de una empresa: provider, model y baseUrl (SIN apiKey),
   * o null si la empresa no tiene LLM propio configurado.
   */
  async getTenantLlm(tenantId: string): Promise<{
    provider: string | null;
    model: string | null;
    baseUrl: string | null;
  } | null> {
    const existing = await this.prisma.integration.findFirst({
      where: {
        tenantId,
        type: IntegrationType.AI_API,
        name: 'LLM empresa',
      },
    });
    if (!existing) return null;
    const config = (existing.config ?? {}) as Record<string, any>;
    return {
      provider: config.provider ?? null,
      model: config.model ?? null,
      baseUrl: config.baseUrl ?? null,
    };
  }
}
