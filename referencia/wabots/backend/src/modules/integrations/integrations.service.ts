import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { HttpRequestService } from './services/http.service';
import { IntegrationResolverService } from './services/integration-resolver.service';
import { IntegrationConfigService } from './services/integration-config.service';
import { AiRunnerService } from './services/ai-runner.service';
import { GmailRunnerService } from './services/gmail-runner.service';
import { CalendarRunnerService } from './services/calendar-runner.service';
import { RunForEnginePayload } from './services/integration-run.types';
import { decryptConfig, encryptConfig, mask } from './services/integration-crypto.util';

// Re-export para conservar la API pública del módulo (el motor importa el
// payload desde este archivo).
export type { RunForEnginePayload } from './services/integration-run.types';

/**
 * Fachada de integraciones externas por tenant.
 * - CRUD: cifra/descifra secretos de `config` con CryptoService y nunca
 *   devuelve secretos en claro (los enmascara con '***').
 * - Persistencia de integraciones "con nombre" (OAuth Google, SA, agente de
 *   correo, LLMs): delega en IntegrationConfigService.
 * - `runForEngine` es el ÚNICO punto que el motor usa para ejecutar: valida y
 *   despacha a los runners (IA/Gmail/Calendar/HTTP).
 */
@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly http: HttpRequestService,
    private readonly resolver: IntegrationResolverService,
    private readonly configService: IntegrationConfigService,
    private readonly aiRunner: AiRunnerService,
    private readonly gmailRunner: GmailRunnerService,
    private readonly calendarRunner: CalendarRunnerService,
  ) {}

  // ───────────────────────────── CRUD ─────────────────────────────

  /** Lista las integraciones de un tenant (con secretos enmascarados). */
  async list(tenantId: string) {
    const items = await this.prisma.integration.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100, // tope defensivo: una empresa tiene un puñado, nunca miles
    });
    return items.map((i) => mask(i));
  }

  /** Crea una integración cifrando los secretos de config. */
  async create(tenantId: string, dto: CreateIntegrationDto) {
    const encrypted = encryptConfig(this.crypto, dto.config ?? {});
    const created = await this.prisma.integration.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type,
        isActive: dto.isActive ?? true,
        config: encrypted as Prisma.InputJsonValue,
      },
    });
    return mask(created);
  }

  /** Devuelve una integración por id (enmascarada). Lanza 404 si no existe. */
  async findOne(id: string) {
    const integration = await this.resolver.getOrThrow(id);
    return mask(integration);
  }

  /** Actualiza una integración. Recifra config si viene en el dto. */
  async update(id: string, dto: UpdateIntegrationDto) {
    await this.resolver.getOrThrow(id);

    const data: Prisma.IntegrationUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.config !== undefined
        ? {
            config: encryptConfig(
              this.crypto,
              dto.config,
            ) as Prisma.InputJsonValue,
          }
        : {}),
    };

    const updated = await this.prisma.integration.update({
      where: { id },
      data,
    });
    return mask(updated);
  }

  /** Elimina una integración. Lanza 404 si no existe. */
  async remove(id: string) {
    await this.resolver.getOrThrow(id);
    const deleted = await this.prisma.integration.delete({ where: { id } });
    return mask(deleted);
  }

  // ─────────── Integraciones "con nombre" (delegación) ───────────

  /** Guarda tokens OAuth de Google (delegación a IntegrationConfigService). */
  async saveGoogleTokens(
    target: string | null,
    type: 'calendar' | 'gmail',
    tokens: { access_token: string; refresh_token?: string },
  ) {
    return this.configService.saveGoogleTokens(target, type, tokens);
  }

  /** Guarda una cuenta de servicio de Calendar (delegación). */
  async saveServiceAccount(
    target: string | null,
    calendarId: string,
    serviceAccount: { client_email: string; private_key: string },
  ) {
    return this.configService.saveServiceAccount(
      target,
      calendarId,
      serviceAccount,
    );
  }

  /** Habilita/configura el agente de correo de un tenant (delegación). */
  async setGmailAgentConfig(
    tenantId: string,
    input: {
      enabled: boolean;
      systemPrompt?: string;
      calendarId?: string;
      autoReply?: boolean;
    },
  ) {
    return this.configService.setGmailAgentConfig(tenantId, input);
  }

  /** Guarda el LLM de plataforma (delegación). */
  async savePlatformLlm(input: {
    provider: string;
    model: string;
    apiKey: string;
    baseUrl?: string;
  }) {
    return this.configService.savePlatformLlm(input);
  }

  /** Estado del LLM de plataforma, sin apiKey (delegación). */
  async getPlatformLlm(): Promise<{
    provider: string | null;
    model: string | null;
    baseUrl: string | null;
  } | null> {
    return this.configService.getPlatformLlm();
  }

  /** Guarda el LLM de una empresa (delegación). */
  async saveTenantLlm(
    tenantId: string,
    input: {
      provider: string;
      model: string;
      apiKey: string;
      baseUrl?: string;
    },
  ) {
    return this.configService.saveTenantLlm(tenantId, input);
  }

  /** Estado del LLM de una empresa, sin apiKey (delegación). */
  async getTenantLlm(tenantId: string): Promise<{
    provider: string | null;
    model: string | null;
    baseUrl: string | null;
  } | null> {
    return this.configService.getTenantLlm(tenantId);
  }

  // ──────────────────────── Punto del motor ────────────────────────

  /**
   * Único punto de entrada para el motor. Carga la integración, descifra su
   * config y ejecuta el sub-servicio correspondiente según payload.kind.
   * Para 'http' no se requiere integración persistida (payload trae todo).
   */
  async runForEngine(
    integrationId: string,
    payload: RunForEnginePayload,
  ): Promise<any> {
    // El nodo httpRequest puede ejecutarse sin integración almacenada.
    if (payload?.kind === 'http' && !integrationId) {
      return this.http.request(payload as any);
    }

    // IA con LLM definido EN EL NODO (inline): el flujo trae provider/model/apiKey,
    // así no se depende de ninguna integración global. Cada nodo elige su LLM.
    const llm = (payload as any)?.llm;
    const llmIsWeb = String(llm?.provider || '').toLowerCase() === 'deepseek_web';
    if (
      payload?.kind === 'ai' &&
      llm?.provider &&
      // DeepSeek-web no trae model/apiKey propios (usa la sesión web); basta el
      // provider. El resto de proveedores sí requieren model+apiKey inline.
      (llmIsWeb || (llm?.model && llm?.apiKey))
    ) {
      return this.aiRunner.runAiInline(payload);
    }

    // Si viene un integrationId explícito → cargar por id (validando pertenencia).
    // Si NO viene, resolvemos la integración según el modelo (plataforma/tenant).
    const integration =
      integrationId && integrationId.trim()
        ? await this.resolver.getOwnedOrThrow(integrationId, payload.tenantId)
        : await this.resolver.resolveIntegration(payload);

    if (!integration.isActive) {
      throw new Error(`La integración ${integration.id} está inactiva`);
    }

    const config = decryptConfig(this.crypto, integration);

    switch (payload?.kind) {
      case 'ai':
        return this.aiRunner.runAi(config, payload);
      case 'gmail':
        return this.gmailRunner.runGmail(config, payload);
      case 'calendar':
        return this.calendarRunner.runCalendar(config, payload);
      case 'http':
        return this.http.request(payload as any);
      default:
        throw new Error(
          `Tipo de ejecución no soportado: ${String(payload?.kind)}`,
        );
    }
  }
}
