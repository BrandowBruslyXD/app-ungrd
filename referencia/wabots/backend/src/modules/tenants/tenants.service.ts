import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

import { PrismaService } from '../../common/prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TwilioChannelDto } from './dto/twilio-channel.dto';
import { MetaChannelDto } from './dto/meta-channel.dto';

/**
 * Lógica de negocio de tenants (empresas cliente): CRUD y control ON/OFF.
 * NO habla con Evolution directamente; delega en WhatsappService.
 */
@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Crea un tenant con slug único. Arranca en PENDING.
   * NO asigna evolutionInstanceName aquí: lo genera connectTenant cuando se
   * conecta WhatsApp (así sí crea la instancia en Evolution la primera vez).
   */
  async create(dto: CreateTenantDto) {
    const slug = this.buildSlug(dto.name);
    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        notes: dto.notes,
        slug,
        status: TenantStatus.PENDING,
        // Token de webhook cripto-aleatorio (no adivinable) para el canal Evolution.
        webhookToken: randomBytes(32).toString('hex'),
      },
    });
    return this.sanitize(tenant);
  }

  // Lista todos los tenants (más recientes primero), sin secretos.
  async findAll() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return tenants.map((tenant) => this.sanitize(tenant));
  }

  // Busca un tenant por id (sin secretos); lanza 404 si no existe.
  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} no encontrado`);
    }
    return this.sanitize(tenant);
  }

  /**
   * Quita del tenant lo que no debe salir en las respuestas: el token de webhook
   * y los secretos cifrados del canal (deja los campos no sensibles como el número).
   */
  private sanitize<T extends { webhookToken?: string | null; channelConfig?: unknown }>(
    tenant: T,
  ) {
    const { webhookToken: _webhookToken, channelConfig, ...rest } = tenant;
    const cfg = (channelConfig ?? {}) as Record<string, any>;
    // Oculta TODOS los secretos de canal (Twilio y Meta); deja los no sensibles
    // (número, phoneNumberId, verifyToken) para poder mostrarlos en el panel.
    const {
      apiKeySecret: _s,
      authToken: _t,
      accessToken: _at,
      appSecret: _as,
      ...safeConfig
    } = cfg;
    return { ...rest, channelConfig: safeConfig };
  }

  /**
   * Actualiza datos básicos del tenant. Si asigna un flujo activo, valida que
   * el flujo pertenezca a esta empresa (o sea una plantilla), evitando ejecutar
   * el flujo de otra empresa con los datos e integraciones de esta.
   */
  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);

    if (dto.activeFlowId) {
      const flow = await this.prisma.flow.findUnique({
        where: { id: dto.activeFlowId },
        select: { tenantId: true, isTemplate: true },
      });
      if (!flow || (flow.tenantId !== id && !flow.isTemplate)) {
        throw new BadRequestException(
          'El flujo activo no existe o no pertenece a esta empresa',
        );
      }
    }

    const updated = await this.prisma.tenant.update({ where: { id }, data: dto });
    // sanitize(): nunca devolver webhookToken (credencial de webhooks) ni los
    // secretos de channelConfig al cliente (coherente con el resto del CRUD).
    return this.sanitize(updated);
  }

  /**
   * Elimina un tenant y, en cascada (ver schema), sus flujos, conversaciones,
   * mensajes, integraciones y recargas. Los registros de consumo quedan
   * desvinculados (tenantId nulo) para conservar el histórico agregado.
   */
  async remove(id: string) {
    await this.findOne(id);
    const deleted = await this.prisma.tenant.delete({ where: { id } });
    return this.sanitize(deleted);
  }

  /**
   * Enciende el servicio: marca ACTIVE de inmediato (así el bot ya responde) y,
   * en canales Evolution, conecta WhatsApp en segundo plano. El QR y el estado
   * de conexión llegan por socket, por lo que la activación responde al instante.
   */
  async activate(id: string) {
    await this.findOne(id);
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { status: TenantStatus.ACTIVE },
    });

    const isEvolution = tenant.channelProvider === 'EVOLUTION';
    if (isEvolution) {
      void this.whatsapp
        .connectTenant(id)
        .catch((e) =>
          this.logger.warn(`activate(${id}): conexión WhatsApp en segundo plano falló: ${(e as Error).message}`),
        );
    }

    return { ...this.sanitize(tenant), qr: null, whatsappError: null, connecting: isEvolution };
  }

  /**
   * Apaga el servicio: marca SUSPENDED de inmediato (el bot deja de responder al
   * instante por el estado) y cierra la sesión de WhatsApp en segundo plano.
   */
  async suspend(id: string) {
    await this.findOne(id);
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { status: TenantStatus.SUSPENDED },
    });

    void this.whatsapp
      .disconnectTenant(id)
      .catch((e) =>
        this.logger.warn(`suspend(${id}): desconexión WhatsApp en segundo plano falló: ${(e as Error).message}`),
      );

    return this.sanitize(tenant);
  }

  // Solicita conexión de WhatsApp y devuelve el QR si lo hay (resiliente).
  async connectWhatsapp(id: string) {
    await this.findOne(id);
    try {
      return await this.whatsapp.connectTenant(id);
    } catch (e) {
      this.logger.warn(`connectWhatsapp(${id}) falló: ${(e as Error).message}`);
      return { qr: null, whatsappError: 'WhatsApp/Evolution no está disponible.' };
    }
  }

  // Consulta el estado de conexión de WhatsApp del tenant.
  async whatsappState(id: string) {
    await this.findOne(id);
    return this.whatsapp.getState(id);
  }

  /**
   * Configura el canal Twilio del tenant: cambia channelProvider a 'TWILIO'
   * y guarda channelConfig con los secretos (apiKeySecret, authToken) CIFRADOS.
   * No expone secretos en la respuesta.
   */
  async configureTwilio(id: string, dto: TwilioChannelDto) {
    await this.findOne(id);

    // Cifra selectivamente los campos secretos antes de persistir.
    const channelConfig = this.crypto.encryptFields(
      {
        accountSid: dto.accountSid,
        apiKeySid: dto.apiKeySid,
        apiKeySecret: dto.apiKeySecret,
        fromNumber: dto.fromNumber,
        ...(dto.authToken ? { authToken: dto.authToken } : {}),
      } as Record<string, any>,
      ['apiKeySecret', 'authToken'],
    );

    await this.prisma.tenant.update({
      where: { id },
      data: {
        channelProvider: 'TWILIO',
        channelConfig,
      },
    });

    return { ok: true };
  }

  /**
   * Configura el canal Meta / WhatsApp Cloud API: channelProvider='META' y
   * channelConfig con accessToken/appSecret CIFRADOS; phoneNumberId y verifyToken
   * en claro (se usan para rutear/verificar el webhook único).
   */
  async configureMeta(id: string, dto: MetaChannelDto) {
    await this.findOne(id);
    const channelConfig = this.crypto.encryptFields(
      {
        phoneNumberId: dto.phoneNumberId,
        verifyToken: dto.verifyToken,
        accessToken: dto.accessToken,
        ...(dto.appSecret ? { appSecret: dto.appSecret } : {}),
        ...(dto.graphVersion ? { graphVersion: dto.graphVersion } : {}),
      } as Record<string, any>,
      ['accessToken', 'appSecret'],
    );
    await this.prisma.tenant.update({
      where: { id },
      data: { channelProvider: 'META', channelConfig },
    });
    return { ok: true };
  }

  /**
   * DESVINCULA el canal actual y vuelve a EVOLUTION (por QR): limpia
   * channelConfig (borra los secretos guardados) y deja el proveedor por defecto.
   */
  async resetChannel(id: string) {
    await this.findOne(id);
    await this.prisma.tenant.update({
      where: { id },
      data: { channelProvider: 'EVOLUTION', channelConfig: {} },
    });
    return { ok: true, channelProvider: 'EVOLUTION' };
  }

  /**
   * Genera un slug kebab-case a partir del nombre + sufijo aleatorio
   * (cripto-seguro) para garantizar unicidad.
   */
  private buildSlug(name: string): string {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // quita acentos (marcas diacríticas)
      .replace(/[^a-z0-9]+/g, '-') // no alfanumérico -> guion
      .replace(/^-+|-+$/g, '') // recorta guiones extremos
      .slice(0, 40);
    const suffix = randomBytes(3).toString('hex');
    return `${base || 'tenant'}-${suffix}`;
  }
}
