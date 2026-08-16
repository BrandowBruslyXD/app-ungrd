import { Controller, Get, Post, Query, Req, Res, HttpCode, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { errorMessage } from '../../common/text/error-message.util';
import { digitsOnly } from '../../common/text/normalize';
import { IncomingMessage } from '../../common/types/engine.types';

/**
 * Webhook ÚNICO de Meta / WhatsApp Cloud API (una sola URL de callback para la
 * App). Cada empresa (tenant) guarda su phoneNumberId + verifyToken (planos) y
 * accessToken + appSecret (cifrados). El ruteo del mensaje entrante se hace por
 * `phone_number_id` → empresa; la firma se valida con el appSecret de ESA empresa.
 *
 * Configuración requerida en la App de Meta:
 *   Callback URL: {PUBLIC}/api/webhooks/meta
 *   Verify token: el mismo registrado en el formulario Meta de la empresa.
 */
// Límite propio, más holgado que el global: los proveedores entregan en ráfaga
// desde pocas IPs y el límite general de 300/min podría descartar mensajes
// legítimos. La firma HMAC sigue siendo la barrera de autenticidad.
@Throttle({ default: { limit: 1200, ttl: 60000 } })
@Controller('webhooks/meta')
export class MetaWebhookController {
  private readonly logger = new Logger(MetaWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly events: EventEmitter2,
  ) {}

  /** Handshake de verificación de Meta: devuelve hub.challenge si el token coincide. */
  @Public()
  @Get()
  async verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): Promise<void> {
    if (mode === 'subscribe' && token) {
      const match = await this.prisma.tenant.findFirst({
        where: {
          channelProvider: 'META',
          channelConfig: { path: ['verifyToken'], equals: token } as any,
        } as any,
        select: { id: true },
      });
      if (match) {
        res.status(200).send(challenge);
        return;
      }
    }
    res.status(403).send('forbidden');
  }

  /** Recepción de eventos: valida la firma, rutea por phone_number_id y emite al motor. */
  @Public()
  @Post()
  @HttpCode(200)
  async receive(@Req() req: Request): Promise<{ ok: true }> {
    const ok = { ok: true as const };
    try {
      const body = (req.body ?? {}) as any;
      const value = body?.entry?.[0]?.changes?.[0]?.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      const messages = value?.messages;
      if (!phoneNumberId || !Array.isArray(messages) || messages.length === 0) {
        return ok; // eventos de estado (delivered/read) u otros: se ignoran
      }

      const tenant = await this.prisma.tenant.findFirst({
        where: {
          channelProvider: 'META',
          channelConfig: { path: ['phoneNumberId'], equals: String(phoneNumberId) } as any,
        } as any,
      });
      if (!tenant) {
        this.logger.warn(`Webhook Meta sin empresa para phone_number_id=${phoneNumberId}. Descartado.`);
        return ok;
      }

      // Firma FAIL-CLOSED: si no hay appSecret configurado, no se puede validar → descarta.
      if (!this.verifySignature(req, tenant)) {
        this.logger.warn(`Webhook Meta con firma inválida (tenant ${tenant.id}). Descartado.`);
        return ok;
      }

      for (const m of messages) {
        const message = this.normalize(m);
        if (!message) continue;

        // Registra el MessageLog IN (misma semántica que Evolution/Twilio) para
        // que la consola de actividad refleje también el canal Meta.
        const conversation = await this.prisma.conversation.findUnique({
          where: { tenantId_contactPhone: { tenantId: tenant.id, contactPhone: message.from } },
          select: { id: true },
        });
        await this.prisma.messageLog.create({
          data: {
            tenantId: tenant.id,
            conversationId: conversation?.id ?? null,
            direction: 'IN',
            type: message.type,
            content: { text: message.text },
            externalId: m?.id ?? null,
          },
        });

        this.events.emit('whatsapp.incoming', { tenantId: tenant.id, message });
      }
      return ok;
    } catch (err) {
      this.logger.error(`Webhook Meta falló: ${errorMessage(err)}`);
      return ok; // nunca se propaga el error a Meta (reintentaría en bucle)
    }
  }

  /** Valida X-Hub-Signature-256 = sha256=HMAC_SHA256(appSecret, rawBody). */
  private verifySignature(req: Request, tenant: any): boolean {
    const cfg = (tenant.channelConfig as Record<string, any>) ?? {};
    if (!cfg.appSecret) {
      this.logger.warn(`Tenant ${tenant.id} sin appSecret Meta: se rechaza el webhook (no verificable).`);
      return false;
    }
    const header = req.header('x-hub-signature-256');
    const raw = (req as any).rawBody as Buffer | undefined;
    if (!header || !header.startsWith('sha256=') || !raw) return false;

    let appSecret: string;
    try {
      appSecret = this.crypto.decrypt(String(cfg.appSecret));
    } catch {
      return false;
    }
    const expected = 'sha256=' + createHmac('sha256', appSecret).update(raw).digest('hex');
    try {
      const a = Buffer.from(header);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  /** Convierte un mensaje de Cloud API en IncomingMessage del motor. */
  private normalize(m: any): IncomingMessage | null {
    const from = digitsOnly(m?.from);
    if (!from) return null;
    const type = m?.type;

    if (type === 'text') {
      return { from, text: m?.text?.body ?? '', type: 'text', externalId: m?.id ?? undefined, raw: m };
    }
    // Botones/listas interactivas: el texto elegido llega como title/id.
    if (type === 'interactive') {
      const i = m.interactive;
      const text = i?.button_reply?.title || i?.list_reply?.title || i?.button_reply?.id || i?.list_reply?.id || '';
      return { from, text, type: 'text', externalId: m?.id ?? undefined, raw: m };
    }
    // Ubicación compartida: Meta la manda como type 'location' con lat/lng y, si
    // el usuario eligió un sitio, también nombre y dirección. Sin esto el mensaje
    // llegaba con texto vacío y el nodo de captura respondía "no entendí" pese a
    // que la persona SÍ había compartido su ubicación.
    if (type === 'location') {
      const loc = m?.location;
      const partes = [loc?.name, loc?.address].filter(Boolean);
      const coords =
        loc?.latitude != null && loc?.longitude != null
          ? `${loc.latitude}, ${loc.longitude}`
          : '';
      const text = partes.length ? `${partes.join(' - ')} (${coords})` : coords;
      return { from, text, type: 'text', externalId: m?.id ?? undefined, raw: m };
    }

    if (type === 'button') {
      return { from, text: m?.button?.text ?? '', type: 'text', externalId: m?.id ?? undefined, raw: m };
    }
    // Media: se marca la familia; la descarga autenticada del medio queda fuera
    // del MVP (Cloud API entrega un media-id que requiere una segunda llamada).
    const familias: Record<string, IncomingMessage['mediaType']> = {
      image: 'image', audio: 'audio', video: 'video', document: 'document', sticker: 'image',
    };
    if (familias[type]) {
      return {
        from,
        text: m?.[type]?.caption ?? '',
        type: 'media',
        mediaType: familias[type],
        mediaMimeType: m?.[type]?.mime_type,
        raw: m,
      };
    }
    return { from, text: '', type: 'text', externalId: m?.id ?? undefined, raw: m };
  }
}
