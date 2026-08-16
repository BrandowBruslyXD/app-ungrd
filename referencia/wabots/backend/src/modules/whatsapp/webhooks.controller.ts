import { Body, Controller, Logger, NotFoundException, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WhatsappConnectionState } from '@prisma/client';

import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { errorMessage } from '../../common/text/error-message.util';
import { IncomingMessage } from '../../common/types/engine.types';
import { mapConnectionState } from './connection-state.util';
import { WhatsappGateway } from './whatsapp.gateway';
import { EvolutionService } from './evolution.service';

/**
 * Recibe los webhooks de Evolution. Ruta pública autenticada por `webhookToken`.
 * Responde rápido { ok: true }.
 */
@Public()
// Límite propio, más holgado que el global: el proveedor entrega en ráfaga
// desde pocas IPs; la validación (firma/token) sigue siendo la autenticidad.
@Throttle({ default: { limit: 1200, ttl: 60000 } })
@Controller('webhooks/evolution')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: WhatsappGateway,
    private readonly events: EventEmitter2,
    private readonly evolution: EvolutionService,
  ) {}

  @Post(':webhookToken')
  async handle(
    @Param('webhookToken') webhookToken: string,
    @Body() payload: any,
  ): Promise<{ ok: true }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { webhookToken } });
    if (!tenant) throw new NotFoundException('Webhook token inválido');

    // Evolution usa nombres tipo "connection.update" o "CONNECTION_UPDATE".
    const event = String(payload?.event ?? '').toLowerCase().replace(/_/g, '.');

    try {
      if (event === 'connection.update') {
        await this.onConnectionUpdate(tenant.id, payload);
      } else if (event === 'messages.upsert') {
        await this.onMessagesUpsert(tenant.id, payload);
      }
    } catch (err) {
      this.logger.error(`Webhook ${event} (${tenant.id}) falló: ${errorMessage(err)}`);
    }

    return { ok: true };
  }

  /** Actualiza estado/QR/teléfono y lo emite por socket. */
  private async onConnectionUpdate(tenantId: string, payload: any): Promise<void> {
    const data = payload?.data ?? {};
    const state = mapConnectionState(data?.state);
    const qr = data?.qrcode?.base64 ?? data?.base64 ?? null;
    const phone = this.normalizePhone(data?.wuid ?? payload?.sender);

    // Al quedar CONECTADO el QR ya no sirve: se limpia (es sensible; con él
    // vigente se podría secuestrar la sesión de WhatsApp).
    const connected = state === WhatsappConnectionState.CONNECTED;
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(state ? { connectionState: state } : {}),
        ...(connected ? { lastQrCode: null } : qr ? { lastQrCode: qr } : {}),
        ...(phone ? { phoneNumber: phone } : {}),
      },
    });

    this.gateway.emitTenantUpdate(tenantId, {
      type: 'connection',
      connectionState: state,
      qr,
      phoneNumber: phone,
    });
  }

  /** Normaliza mensaje entrante, registra MessageLog IN y emite evento al motor. */
  private async onMessagesUpsert(tenantId: string, payload: any): Promise<void> {
    const data = payload?.data ?? {};
    const key = data?.key ?? {};

    // Ignora mensajes salientes (fromMe) y eco.
    if (key?.fromMe) return;

    // Ignora grupos, listas de difusión y canales: el bot es de atención uno a uno.
    // Un asistente de ventas contestando dentro de un grupo interrumpe a todos y
    // expone al negocio; y los estados (`status@broadcast`) no son mensajes para nadie.
    if (this.esConversacionColectiva(key?.remoteJid)) {
      this.logger.log(`Ignorado mensaje de ${key?.remoteJid} (grupo/difusión/canal).`);
      return;
    }

    const from = this.normalizePhone(key?.remoteJid);
    if (!from) return;

    const message = this.normalize(data, from);

    // Los medios de WhatsApp vienen CIFRADOS (.enc): se le pide a Evolution el
    // contenido ya descifrado. Sin esto, ffmpeg y Whisper reciben bytes cifrados y
    // el cliente recibe un "no me llegó bien el archivo" con el audio intacto.
    if (message.mediaUrl && !message.mediaBase64) {
      const tenantConIns = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { evolutionInstanceName: true },
      });
      const instancia = tenantConIns?.evolutionInstanceName;
      if (instancia) {
        const b64 = await this.evolution.getMediaBase64(instancia, { key: key, message: data?.message });
        if (b64) {
          message.mediaBase64 = b64;
        } else {
          this.logger.warn(`Adjunto de ${from} sin base64 descifrado: se intentará por URL.`);
        }
      }
    }

    // Asocia a conversación existente (si la hay).
    const conversation = await this.prisma.conversation.findUnique({
      where: { tenantId_contactPhone: { tenantId, contactPhone: from } },
      select: { id: true },
    });

    await this.prisma.messageLog.create({
      data: {
        tenantId,
        conversationId: conversation?.id ?? null,
        direction: 'IN',
        type: message.type,
        content: { text: message.text, mediaUrl: message.mediaUrl },
        externalId: key?.id ?? null,
      },
    });

    // Desacoplado del motor por eventos (sin dependencia de EngineModule).
    this.events.emit('whatsapp.incoming', { tenantId, message });
  }

  /** Convierte el payload de Evolution en IncomingMessage. */
  private normalize(data: any, from: string): IncomingMessage {
    const m = data?.message ?? {};
    let type = 'text';
    let text: string | undefined;
    let mediaUrl: string | undefined;
    let mediaType: IncomingMessage['mediaType'];
    let mediaMimeType: string | undefined;

    if (m.conversation) {
      text = m.conversation;
    } else if (m.extendedTextMessage) {
      text = m.extendedTextMessage.text;
    } else if (m.imageMessage) {
      type = 'image';
      mediaType = 'image';
      text = m.imageMessage.caption;
      mediaUrl = m.imageMessage.url;
      mediaMimeType = m.imageMessage.mimetype;
    } else if (m.documentMessage) {
      type = 'document';
      mediaType = 'document';
      text = m.documentMessage.caption;
      mediaUrl = m.documentMessage.url;
      mediaMimeType = m.documentMessage.mimetype;
    } else if (m.audioMessage) {
      type = 'audio';
      mediaType = 'audio';
      mediaUrl = m.audioMessage.url;
      mediaMimeType = m.audioMessage.mimetype;
    }

    // Evolution puede incluir el adjunto en base64 (config "convertir media").
    const mediaBase64: string | undefined =
      typeof data?.message?.base64 === 'string'
        ? data.message.base64
        : typeof data?.base64 === 'string'
          ? data.base64
          : undefined;

    return { from, text, type, mediaUrl, mediaType, mediaMimeType, mediaBase64,
      externalId: data?.key?.id ?? undefined, raw: data };
  }

  /**
   * Quita el sufijo de WhatsApp (@s.whatsapp.net / @c.us) y el sufijo de
   * dispositivo (':<n>'). NO usa digitsOnly a propósito: el jid de Evolution
   * puede contener guiones significativos (grupos '123-456@g.us') que deben
   * conservarse tal cual para identificar la conversación.
   */
  private normalizePhone(jid?: string): string | undefined {
    if (!jid) return undefined;
    const [local, dominio] = jid.split('@');
    const limpio = local.split(':')[0];
    if (!limpio) return undefined;
    // WhatsApp ya no manda siempre `@s.whatsapp.net`: con los identificadores nuevos
    // (`@lid`) el remitente llega como "38685424783407@lid", que NO es un telefono.
    // Al quitarle el sufijo, la respuesta se enviaba a un JID inexistente y Evolution
    // contestaba 400 {"exists": false}: el bot generaba el mensaje y no llegaba nunca.
    // Para esos casos se conserva el JID completo, que es lo unico direccionable.
    if (dominio && dominio !== 's.whatsapp.net') return `${limpio}@${dominio}`;
    return limpio;
  }

  /**
   * True si el JID no es un contacto individual.
   *
   * WhatsApp distingue por el dominio del JID: `@g.us` es un grupo, `@broadcast` una
   * lista de difusión o los estados, y `@newsletter` un canal. Solo `@s.whatsapp.net`
   * y `@lid` son personas con las que tiene sentido conversar.
   */
  private esConversacionColectiva(jid?: string): boolean {
    if (!jid) return true;
    const dominio = jid.split('@')[1]?.toLowerCase() ?? '';
    return dominio.endsWith('g.us') || dominio.includes('broadcast') || dominio.includes('newsletter');
  }
}
