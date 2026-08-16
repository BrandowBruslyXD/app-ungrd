import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { CryptoService } from '../../../common/crypto/crypto.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IncomingMessage } from '../../../common/types/engine.types';
import { assertPublicUrl } from '../../integrations/services/http.service';
import { PreviewMediaService } from './preview-media.service';

/** Host (lowercase) de una URL, o '' si no es parseable. */
function hostOf(raw: string): string {
  try {
    return new URL(raw).host.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Descarga el adjunto (media) de un mensaje entrante de WhatsApp resolviendo
 * la autenticación según el proveedor de canal del tenant:
 *  - TWILIO  → auth Basic con las credenciales de API Key (sid:secret), que
 *              viven cifradas en tenant.channelConfig.
 *  - Evolution → header `apikey` global (EVOLUTION_API_KEY).
 *
 * Si el mensaje trae el media embebido en base64 (algunos webhooks de
 * Evolution), lo usa directamente y evita la descarga.
 *
 * Centralizar esto aquí mantiene los executors limpios: solo piden el buffer.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  /** Tope de descarga para no agotar memoria con adjuntos enormes. */
  private readonly MAX_BYTES = 25 * 1024 * 1024; // 25 MB
  private readonly TIMEOUT_MS = 30000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
    private readonly store: PreviewMediaService,
  ) {}

  /**
   * Obtiene el adjunto del mensaje entrante como Buffer.
   * Lanza si no hay media o si la descarga falla (el executor lo deriva a onError).
   */
  async fetchIncomingMedia(
    tenantId: string,
    incoming: IncomingMessage,
    /**
     * Si viene, ARCHIVA una copia en el árbol de media (empresa/flujo/teléfono)
     * para auditar/reproducir después lo que envió el usuario real.
     * Fire-and-forget: nunca bloquea ni rompe el procesamiento del mensaje.
     */
    archive?: { flowId?: string; contactPhone?: string; conversationId?: string },
  ): Promise<Buffer> {
    // 1) base64 embebido: ruta rápida sin red.
    if (incoming.mediaBase64) {
      const buf = Buffer.from(incoming.mediaBase64, 'base64');
      if (buf.length === 0) throw new Error('Adjunto base64 vacío.');
      this.archiveCopy(buf, tenantId, incoming, archive);
      return buf;
    }

    const url = incoming.mediaUrl;
    if (!url) throw new Error('El mensaje no contiene un adjunto (mediaUrl) para procesar.');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('Tenant no encontrado al descargar el adjunto.');

    const provider = (tenant as any).channelProvider as string | undefined;
    const urlHost = hostOf(url);

    // Host "de confianza" del proveedor: al SUYO se le adjuntan credenciales y
    // se le permite ser interno (Evolution suele servir el medio desde su
    // propio host en la red Docker). A cualquier OTRO host: sin credenciales y
    // debe ser público (anti-SSRF).
    const evolutionHost = hostOf(this.config.get<string>('EVOLUTION_API_URL') ?? '');

    // 2) Cabeceras/auth SOLO para el host esperado del proveedor (evita filtrar
    //    la apikey/credencial a un host ajeno inyectado en mediaUrl).
    const headers: Record<string, string> = {};
    let auth: { username: string; password: string } | undefined;

    if (provider === 'TWILIO') {
      const raw = ((tenant as any).channelConfig as Record<string, any>) ?? {};
      const cfg = this.crypto.decryptFields({ ...raw }, ['apiKeySecret', 'authToken']);
      if (!cfg.apiKeySid || !cfg.apiKeySecret) {
        throw new Error('Tenant Twilio sin credenciales para descargar el adjunto.');
      }
      if (urlHost.endsWith('twilio.com')) {
        auth = { username: cfg.apiKeySid, password: cfg.apiKeySecret };
      }
    } else {
      // Evolution: apikey global SOLO si la URL es del propio host de Evolution.
      const apiKey = this.config.get<string>('EVOLUTION_API_KEY') ?? '';
      if (apiKey && evolutionHost && urlHost === evolutionHost) headers.apikey = apiKey;
    }

    // Anti-SSRF: mediaUrl viene del webhook (controlable por quien tenga el
    // token). Se exige destino PÚBLICO salvo que sea el propio host de Evolution
    // (que es interno y legítimo). No se siguen redirects (evita exfiltrar la
    // credencial vía 3xx), salvo el host fijo de Twilio que redirige a su CDN.
    if (!(evolutionHost && urlHost === evolutionHost)) {
      await assertPublicUrl(url);
    }
    try {
      const res = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        headers,
        auth,
        timeout: this.TIMEOUT_MS,
        maxContentLength: this.MAX_BYTES,
        maxBodyLength: this.MAX_BYTES,
        maxRedirects: provider === 'TWILIO' && urlHost.endsWith('twilio.com') ? 2 : 0,
      });
      const buf = Buffer.from(res.data);
      if (buf.length === 0) throw new Error('La descarga del adjunto devolvió 0 bytes.');
      this.archiveCopy(buf, tenantId, incoming, archive);
      return buf;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`No se pudo descargar el adjunto (${url}): ${msg}`);
      throw new Error(`No se pudo descargar el adjunto: ${msg}`);
    }
  }

  /**
   * Archiva el adjunto en su rama (empresa/flujo/teléfono) en segundo plano.
   * El audio queda convertido a OGG/Opus por el propio almacén (liviano).
   */
  private archiveCopy(
    buffer: Buffer,
    tenantId: string,
    incoming: IncomingMessage,
    archive?: { flowId?: string; contactPhone?: string; conversationId?: string },
  ): void {
    if (!archive) return;
    const mime =
      (incoming.mediaMimeType ?? '').split(';')[0].trim().toLowerCase() ||
      (incoming.mediaType === 'audio' ? 'audio/ogg' : 'image/jpeg');
    void this.store
      .save(buffer, mime, {
        tenantId,
        flowId: archive.flowId,
        contactPhone: archive.contactPhone,
        conversationId: archive.conversationId,
      })
      .catch(() => undefined);
  }
}
