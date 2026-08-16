import { Controller, Header, HttpCode, Logger, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { errorMessage } from '../../common/text/error-message.util';
import { digitsOnly } from '../../common/text/normalize';
import { IncomingMessage } from '../../common/types/engine.types';

/**
 * Webhook entrante de Twilio (WhatsApp). Ruta PÚBLICA (sin JwtAuthGuard).
 * Twilio envía application/x-www-form-urlencoded; se lee req.body directo
 * (sin DTO con class-validator, para que el ValidationPipe global,
 * configurado con forbidNonWhitelisted, no rechace el payload).
 * Responde 200 rápido y nunca truena (Twilio reintenta ante error).
 */
@Public()
// Límite propio, más holgado que el global: el proveedor entrega en ráfaga
// desde pocas IPs; la validación (firma/token) sigue siendo la autenticidad.
@Throttle({ default: { limit: 1200, ttl: 60000 } })
@Controller('webhooks/twilio')
export class TwilioWebhookController {
  private readonly logger = new Logger(TwilioWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly events: EventEmitter2,
  ) {}

  @Post()
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  async handle(@Req() req: Request): Promise<string> {
    const body = (req?.body ?? {}) as Record<string, any>;
    const empty = '<Response></Response>';

    try {
      const from = String(body.From ?? '');
      const to = String(body.To ?? '');
      const text = body.Body != null ? String(body.Body) : undefined;
      const numMedia = Number(body.NumMedia ?? 0);
      const mediaUrl = body.MediaUrl0 ? String(body.MediaUrl0) : undefined;
      // Twilio entrega el MIME del primer adjunto en MediaContentType0.
      const mediaMimeType = body.MediaContentType0 ? String(body.MediaContentType0) : undefined;
      const mediaType = this.mediaFamily(mediaMimeType);

      const fromDigits = digitsOnly(from);
      if (!fromDigits) return empty;

      // Enruta al tenant Twilio activo cuyo número (fromNumber) coincida EXACTO
      // con el `To` del webhook. Sin coincidencia → se descarta (no adivinar).
      const tenant = await this.findTwilioTenant(to);
      if (!tenant) {
        this.logger.warn(`Webhook Twilio sin tenant que coincida con To=${to}. Descartado.`);
        return empty;
      }

      // Verifica la firma X-Twilio-Signature con el authToken del tenant.
      if (!this.verifySignature(req, tenant)) {
        this.logger.warn(`Webhook Twilio con firma inválida (tenant ${tenant.id}). Descartado.`);
        return empty;
      }

      // Ignora mensajes que provengan del propio número del canal (eco).
      const cfg = ((tenant as any).channelConfig as any) ?? {};
      const ownDigits = digitsOnly(String(cfg.fromNumber ?? ''));
      if (ownDigits && fromDigits === ownDigits) {
        return empty;
      }

      const message: IncomingMessage = {
        from: fromDigits,
        text,
        // Tipo: si hay adjunto, refleja su familia (audio/image/...); si no, texto.
        type: numMedia > 0 ? mediaType ?? 'image' : 'text',
        mediaUrl: numMedia > 0 ? mediaUrl : undefined,
        mediaType: numMedia > 0 ? mediaType : undefined,
        mediaMimeType: numMedia > 0 ? mediaMimeType : undefined,
        externalId: body.MessageSid ?? body.SmsSid ?? undefined,
        raw: body,
      };

      // Registra el MessageLog IN (asociado a conversación si existe).
      const conversation = await this.prisma.conversation.findUnique({
        where: { tenantId_contactPhone: { tenantId: tenant.id, contactPhone: fromDigits } },
        select: { id: true },
      });

      await this.prisma.messageLog.create({
        data: {
          tenantId: tenant.id,
          conversationId: conversation?.id ?? null,
          direction: 'IN',
          type: message.type,
          content: { text: message.text, mediaUrl: message.mediaUrl },
          externalId: body.MessageSid ?? body.SmsSid ?? null,
        },
      });

      // Desacoplado del motor por eventos (igual que el webhook de Evolution).
      this.events.emit('whatsapp.incoming', { tenantId: tenant.id, message });
    } catch (err) {
      // Nunca truena el webhook: registra y responde 200.
      this.logger.error(`Webhook Twilio falló: ${errorMessage(err)}`);
    }

    return empty;
  }

  /**
   * Enruta al tenant Twilio ACTIVE cuyo `fromNumber` coincide EXACTAMENTE con el
   * `To` del webhook. Sin coincidencia devuelve null (no adivina el destinatario).
   */
  private async findTwilioTenant(to: string) {
    const toDigits = digitsOnly(to);
    if (!toDigits) return null;

    const tenants = await this.prisma.tenant.findMany({
      where: { channelProvider: 'TWILIO', status: 'ACTIVE' } as any,
    });
    return (
      tenants.find((t) => {
        const cfg = ((t as any).channelConfig as any) ?? {};
        return digitsOnly(String(cfg.fromNumber ?? '')) === toDigits;
      }) ?? null
    );
  }

  /**
   * Valida la firma X-Twilio-Signature: HMAC-SHA1(authToken) sobre la URL pública
   * del webhook concatenada con los parámetros del form ordenados por clave.
   * FAIL-CLOSED: si el tenant no tiene authToken configurado, se RECHAZA (no se
   * puede verificar el origen → no se aceptan mensajes que podrían ser falsos).
   */
  private verifySignature(req: Request, tenant: any): boolean {
    const cfg = (tenant.channelConfig as Record<string, any>) ?? {};
    const encrypted = cfg.authToken;
    if (!encrypted) {
      this.logger.warn(
        `Tenant ${tenant.id} sin authToken Twilio: se RECHAZA el webhook (no verificable). ` +
          'Configura el authToken para aceptar mensajes por este canal.',
      );
      return false;
    }

    const signature = req.header('x-twilio-signature');
    if (!signature) return false;

    let authToken: string;
    try {
      authToken = this.crypto.decrypt(String(encrypted));
    } catch {
      return false;
    }

    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const body = (req.body ?? {}) as Record<string, any>;
    const data = Object.keys(body)
      .sort()
      .reduce((acc, key) => acc + key + String(body[key]), url);
    const expected = createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    try {
      const a = Buffer.from(signature);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  /** Deduce la familia del adjunto (audio/image/video/document) a partir del MIME. */
  private mediaFamily(mime?: string): IncomingMessage['mediaType'] | undefined {
    if (!mime) return undefined;
    const m = mime.toLowerCase();
    if (m.startsWith('audio/')) return 'audio';
    if (m.startsWith('image/')) return 'image';
    if (m.startsWith('video/')) return 'video';
    return 'document';
  }

}
