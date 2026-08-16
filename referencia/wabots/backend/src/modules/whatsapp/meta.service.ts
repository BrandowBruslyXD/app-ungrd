import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

import { errorMessage } from '../../common/text/error-message.util';
import { OutgoingMessage } from '../../common/types/engine.types';

/** Configuración (ya descifrada) del canal Meta / WhatsApp Cloud API. */
export interface MetaConfig {
  phoneNumberId: string; // ID del número (graph.facebook.com/{id}/messages)
  accessToken: string; // token permanente de la WABA / system user
  appSecret?: string; // para validar la firma X-Hub-Signature-256 del webhook
  verifyToken?: string; // para el handshake GET del webhook
  graphVersion?: string; // p. ej. 'v20.0' (default)
}

const DEFAULT_GRAPH_VERSION = 'v20.0';

/**
 * Cliente del canal Meta (WhatsApp Cloud API oficial de Facebook).
 * Envía mensajes vía POST graph.facebook.com/{version}/{phoneNumberId}/messages
 * con Authorization: Bearer {accessToken}.
 */
@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  /** Envía un OutgoingMessage y devuelve el id del mensaje de Meta (o null). */
  async send(config: MetaConfig, to: string, msg: OutgoingMessage): Promise<string | null> {
    const version = config.graphVersion || DEFAULT_GRAPH_VERSION;
    const url = `https://graph.facebook.com/${version}/${config.phoneNumberId}/messages`;
    const recipient = String(to).replace(/[^\d]/g, ''); // Meta espera solo dígitos

    const body = this.buildBody(recipient, msg);

    try {
      const { data } = await axios.post(url, body, {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
        maxRedirects: 0,
      });
      return data?.messages?.[0]?.id ?? null;
    } catch (err) {
      this.logger.error(`send(meta) falló: ${errorMessage(err)}`);
      throw new Error('No se pudo enviar por Meta WhatsApp Cloud API');
    }
  }

  /** Construye el cuerpo según el tipo de mensaje (texto, interactivo, media). */
  private buildBody(to: string, msg: OutgoingMessage): Record<string, any> {
    const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to };

    if (msg.type === 'media' && msg.mediaUrl) {
      // Imagen por URL (Meta también soporta document/audio/video; se usa image
      // por defecto y caption si aplica).
      return { ...base, type: 'image', image: { link: msg.mediaUrl, caption: msg.caption || undefined } };
    }

    if (msg.type === 'interactive' && (msg.options?.length ?? 0) > 0) {
      const options = msg.options ?? [];
      // Cloud API: botones de respuesta rápida (máx 3). Si hay más, cae a texto.
      if ((msg.menuType === 'buttons' || !msg.menuType) && options.length <= 3) {
        return {
          ...base,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: msg.text || 'Elige una opción:' },
            action: {
              buttons: options.slice(0, 3).map((o) => ({
                type: 'reply',
                reply: { id: String(o.id), title: String(o.label).slice(0, 20) },
              })),
            },
          },
        };
      }
      // Lista (o >3 opciones): usa list-picker (hasta 10 filas).
      if (options.length <= 10) {
        return {
          ...base,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: { text: msg.text || 'Elige una opción:' },
            action: {
              button: 'Ver opciones',
              sections: [
                { rows: options.slice(0, 10).map((o) => ({ id: String(o.id), title: String(o.label).slice(0, 24) })) },
              ],
            },
          },
        };
      }
      // Fallback: texto numerado.
      const lines = options.map((o, i) => `${i + 1}. ${o.label}`).join('\n');
      return { ...base, type: 'text', text: { body: [msg.text, lines].filter(Boolean).join('\n\n') } };
    }

    // Texto por defecto.
    return { ...base, type: 'text', text: { body: msg.text ?? '' } };
  }
}
