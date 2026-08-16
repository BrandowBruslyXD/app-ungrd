import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappConnectionState } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { OutgoingMessage } from '../../common/types/engine.types';
import { mapConnectionState } from './connection-state.util';
import { EvolutionService } from './evolution.service';
import { TwilioService, TwilioConfig } from './twilio.service';
import { MetaService, MetaConfig } from './meta.service';

/**
 * Vista mínima de los campos de canal del Tenant.
 * Existen en schema.prisma (channelProvider/channelConfig); esta interfaz
 * los tipa mientras el cliente Prisma se regenera en el deploy.
 */
interface TenantChannel {
  channelProvider: string;
  channelConfig: any;
}

/**
 * API de alto nivel de WhatsApp. Orquesta EvolutionService + Prisma.
 * Es el servicio que consumen tenants y engine.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionService,
    private readonly twilio: TwilioService,
    private readonly meta: MetaService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Conexiones en vuelo por tenant: dos clicks casi simultáneos en "Conectar"
   * comparten la MISMA operación (y el mismo QR) en lugar de correr en
   * paralelo e intentar crear dos veces la instancia en Evolution.
   */
  private readonly connecting = new Map<string, Promise<{ qr: string | null }>>();

  /**
   * Asegura la instancia, configura el webhook, conecta y devuelve el QR.
   * Marca el tenant en QR_PENDING / CONNECTING.
   */
  async connectTenant(tenantId: string): Promise<{ qr: string | null }> {
    const inFlight = this.connecting.get(tenantId);
    if (inFlight) return inFlight;

    const promise = this.doConnectTenant(tenantId).finally(() =>
      this.connecting.delete(tenantId),
    );
    this.connecting.set(tenantId, promise);
    return promise;
  }

  private async doConnectTenant(tenantId: string): Promise<{ qr: string | null }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    // Nombre de instancia: usa el guardado o genera uno estable y persiste.
    let instanceName = tenant.evolutionInstanceName;
    const webhookUrl = this.buildWebhookUrl(tenant.webhookToken);
    if (!instanceName) {
      instanceName = `tenant_${tenant.slug}_${tenant.id.slice(-6)}`;
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { evolutionInstanceName: instanceName },
      });
    }

    // ¿Existe realmente la instancia en Evolution? (auto-sanable: la BD puede
    // tener un nombre de una Evolution anterior que ya no existe). Si NO existe,
    // se (re)crea — createInstance ya devuelve el QR.
    let qr: string | null = null;
    const state = await this.evolution.connectionState(instanceName);
    if (!state) {
      const created = await this.evolution.createInstance(instanceName, webhookUrl);
      qr = created?.qrcode?.base64 ?? created?.base64 ?? null;
    }

    // (Re)configura el webhook por si cambió la URL pública.
    await this.evolution.setWebhook(instanceName, webhookUrl, [
      'MESSAGES_UPSERT',
      'CONNECTION_UPDATE',
    ]);

    // Si aún no hay QR (instancia ya existía, o create no lo devolvió), pídelo.
    if (!qr) qr = await this.evolution.connect(instanceName);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        connectionState: qr ? WhatsappConnectionState.QR_PENDING : WhatsappConnectionState.CONNECTING,
        lastQrCode: qr ?? undefined,
      },
    });

    return { qr };
  }

  /** Cierra la sesión en Evolution y marca DISCONNECTED. */
  async disconnectTenant(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    if (tenant.evolutionInstanceName) {
      await this.evolution.logout(tenant.evolutionInstanceName);
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        connectionState: WhatsappConnectionState.DISCONNECTED,
        lastQrCode: null,
      },
    });
  }

  /** Consulta el estado real a Evolution y lo refleja en BD. */
  async getState(tenantId: string): Promise<{ connectionState: WhatsappConnectionState }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    if (!tenant.evolutionInstanceName) {
      return { connectionState: tenant.connectionState };
    }

    const remote = await this.evolution.connectionState(tenant.evolutionInstanceName);
    const mapped = mapConnectionState(remote?.instance?.state ?? remote?.state);

    if (mapped && mapped !== tenant.connectionState) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { connectionState: mapped },
      });
      return { connectionState: mapped };
    }

    return { connectionState: tenant.connectionState };
  }

  /**
   * Envía un OutgoingMessage por WhatsApp y registra el MessageLog (OUT).
   * - text → sendText
   * - media → sendMedia
   * - interactive → Twilio y Meta usan botones/listas nativos de WhatsApp
   *   (con fallback a texto numerado); Evolution lo degrada a texto numerado.
   */
  async sendMessage(tenantId: string, to: string, msg: OutgoingMessage): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    // Enrutado por proveedor de canal. TWILIO toma su propia ruta y RETORNA.
    // (Cast a TenantChannel: los campos channelProvider/channelConfig existen en
    // el schema; el cliente Prisma se regenera en el deploy del orquestador.)
    const channel = tenant as unknown as TenantChannel;
    if (channel.channelProvider === 'TWILIO') {
      await this.sendViaTwilio({ id: tenant.id, channelConfig: channel.channelConfig }, to, msg);
      return;
    }
    if (channel.channelProvider === 'META') {
      await this.sendViaMeta({ id: tenant.id, channelConfig: channel.channelConfig }, to, msg);
      return;
    }

    // Comportamiento Evolution (intacto).
    if (!tenant.evolutionInstanceName) {
      throw new NotFoundException('Tenant sin instancia de WhatsApp');
    }
    const instance = tenant.evolutionInstanceName;

    let externalId: string | null = null;

    if (msg.type === 'text') {
      const res = await this.evolution.sendText(instance, to, msg.text ?? '');
      externalId = this.extractId(res);
    } else if (msg.type === 'media') {
      const res = await this.evolution.sendMedia(instance, to, {
        mediaUrl: msg.mediaUrl ?? '',
        caption: msg.caption,
      });
      externalId = this.extractId(res);
    } else {
      // interactive: degradado a texto con opciones numeradas.
      const res = await this.evolution.sendText(instance, to, this.buildTextContent(msg));
      externalId = this.extractId(res);
    }

    await this.logOutgoing(tenantId, to, this.buildLogContent(msg), {
      type: msg.type,
      externalId,
    });
  }

  /**
   * Envía un mensaje por el canal Twilio: descifra la config del tenant,
   * delega en TwilioService y registra el MessageLog (OUT).
   */
  private async sendViaTwilio(
    tenant: { id: string; channelConfig: any },
    to: string,
    msg: OutgoingMessage,
  ): Promise<void> {
    const raw = (tenant.channelConfig as Record<string, any>) ?? {};
    // Descifra los campos secretos antes de usarlos.
    const config = this.crypto.decryptFields(
      { ...raw } as TwilioConfig & Record<string, any>,
      ['apiKeySecret', 'authToken'],
    ) as TwilioConfig;

    if (!config.accountSid || !config.apiKeySid || !config.apiKeySecret || !config.fromNumber) {
      throw new NotFoundException('Tenant sin configuración de canal Twilio');
    }

    const sid = await this.twilio.send(config, to, msg);

    await this.logOutgoing(tenant.id, to, this.buildLogContent(msg), {
      type: msg.type,
      externalId: sid,
    });
  }

  /**
   * Envía por el canal Meta (Cloud API): descifra la config del tenant, delega
   * en MetaService y registra el MessageLog (OUT).
   */
  private async sendViaMeta(
    tenant: { id: string; channelConfig: any },
    to: string,
    msg: OutgoingMessage,
  ): Promise<void> {
    const raw = (tenant.channelConfig as Record<string, any>) ?? {};
    const config = this.crypto.decryptFields(
      { ...raw } as MetaConfig & Record<string, any>,
      ['accessToken', 'appSecret'],
    ) as MetaConfig;

    if (!config.phoneNumberId || !config.accessToken) {
      throw new NotFoundException('Empresa sin configuración de canal Meta');
    }

    const externalId = await this.meta.send(config, to, msg);

    await this.logOutgoing(tenant.id, to, this.buildLogContent(msg), {
      type: msg.type,
      externalId,
    });
  }

  /**
   * Texto plano de un OutgoingMessage: para 'interactive' concatena el texto
   * con el menú numerado ("1. opción"); para el resto devuelve msg.text.
   */
  private buildTextContent(msg: OutgoingMessage): string {
    if (msg.type !== 'interactive') return msg.text ?? '';
    const options = msg.options ?? [];
    const lines = options.map((o, i) => `${i + 1}. ${o.label}`).join('\n');
    return [msg.text, lines].filter(Boolean).join('\n\n');
  }

  /** Contenido a registrar en el MessageLog según el tipo de mensaje. */
  private buildLogContent(msg: OutgoingMessage): any {
    if (msg.type === 'text') return { text: msg.text ?? '' };
    if (msg.type === 'media') return { mediaUrl: msg.mediaUrl ?? '', caption: msg.caption };
    return { text: this.buildTextContent(msg), options: msg.options ?? [] };
  }

  /**
   * Registra el MessageLog OUT asociado a la conversación existente (si la hay)
   * por (tenantId, contactPhone).
   */
  private async logOutgoing(
    tenantId: string,
    to: string,
    content: any,
    meta?: { type?: string; externalId?: string | null },
  ): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { tenantId_contactPhone: { tenantId, contactPhone: to } },
      select: { id: true },
    });

    await this.prisma.messageLog.create({
      data: {
        tenantId,
        conversationId: conversation?.id ?? null,
        direction: 'OUT',
        type: meta?.type ?? 'text',
        content,
        externalId: meta?.externalId ?? null,
      },
    });
  }

  /** Construye la URL pública del webhook de Evolution para este tenant. */
  private buildWebhookUrl(webhookToken: string): string {
    const base = this.config.get<string>('PUBLIC_BACKEND_URL') ?? 'http://localhost:3000';
    return `${base}/api/webhooks/evolution/${webhookToken}`;
  }

  /** Extrae el id externo del mensaje de la respuesta de Evolution. */
  private extractId(res: any): string | null {
    return res?.key?.id ?? res?.message?.key?.id ?? null;
  }
}
