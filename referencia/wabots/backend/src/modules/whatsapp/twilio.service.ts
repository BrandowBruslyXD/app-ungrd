import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { createHash } from 'crypto';

import { errorMessage } from '../../common/text/error-message.util';
import { digitsOnly } from '../../common/text/normalize';
import { OutgoingMessage } from '../../common/types/engine.types';

/**
 * Configuración (ya descifrada) de un canal Twilio para WhatsApp.
 * - accountSid: SID de la cuenta de Twilio (parte de la URL de la API).
 * - apiKeySid / apiKeySecret: credenciales de API Key (auth BASIC).
 * - fromNumber: remitente, ej. 'whatsapp:+14155238886'.
 */
export interface TwilioConfig {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  fromNumber: string;
  // Token clásico de la cuenta (opcional, no usado para enviar con API Key).
  authToken?: string;
}

const MESSAGES_BASE = 'https://api.twilio.com/2010-04-01';
const CONTENT_URL = 'https://content.twilio.com/v1/Content';

/**
 * Cliente de bajo nivel del canal Twilio (WhatsApp).
 * Encapsula el HTTP a la API de mensajes de Twilio.
 *
 * Menús interactivos: cuando el OutgoingMessage es 'interactive' con
 * menuType 'buttons'/'list', se envían BOTONES o LISTA nativos de WhatsApp
 * usando la Content API (quick-reply ≤3 / list-picker ≤10). Si algo falla o el
 * modo es 'text', se cae con elegancia a un menú numerado en texto plano.
 */
@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);

  /** Caché en memoria: hash del contenido → ContentSid (evita recrear plantillas). */
  private readonly contentCache = new Map<string, string>();

  /**
   * Envía un OutgoingMessage por WhatsApp vía Twilio y devuelve el `sid`.
   * - text → Body con el texto.
   * - interactive (buttons/list) → botones/lista nativos vía Content API.
   * - interactive (text) → Body + opciones numeradas como texto plano.
   * - media → agrega MediaUrl (y Body como caption si lo hay).
   */
  async send(config: TwilioConfig, to: string, msg: OutgoingMessage): Promise<string | null> {
    // Menú interactivo con botones o lista → Content API (con fallback a texto).
    if (
      msg.type === 'interactive' &&
      (msg.menuType === 'buttons' || msg.menuType === 'list') &&
      (msg.options?.length ?? 0) > 0
    ) {
      try {
        return await this.sendInteractive(config, to, msg);
      } catch (err) {
        this.logger.warn(
          `Interactivo Twilio falló (${errorMessage(err)}); usando texto numerado.`,
        );
        // Cae a texto numerado: nunca rompe la conversación.
      }
    }

    return this.sendText(config, to, msg);
  }

  /** Envío clásico de texto/media (y menú interactivo degradado a texto). */
  private async sendText(
    config: TwilioConfig,
    to: string,
    msg: OutgoingMessage,
  ): Promise<string | null> {
    const url = `${MESSAGES_BASE}/Accounts/${config.accountSid}/Messages.json`;

    let body = msg.text ?? '';
    if (msg.type === 'interactive') {
      body = this.numberedText(msg);
    } else if (msg.type === 'media') {
      body = msg.caption ?? msg.text ?? '';
    }

    const params = new URLSearchParams();
    params.set('From', config.fromNumber);
    params.set('To', this.normalizeTo(to));
    if (body) params.set('Body', body);
    if (msg.type === 'media' && msg.mediaUrl) {
      params.set('MediaUrl', msg.mediaUrl);
    }

    try {
      const { data } = await axios.post(url, params, {
        auth: { username: config.apiKeySid, password: config.apiKeySecret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      });
      const sid = data?.sid ?? null;
      this.logger.log(`Mensaje Twilio enviado a ${params.get('To')} (sid=${sid})`);
      return sid;
    } catch (err) {
      this.logger.error(`Fallo al enviar mensaje Twilio: ${errorMessage(err)}`);
      throw new Error(`Twilio send falló: ${errorMessage(err)}`);
    }
  }

  /**
   * Envía un menú con BOTONES (quick-reply ≤3) o LISTA (list-picker ≤10) nativos
   * de WhatsApp. Crea (o reutiliza de caché) un Content y lo envía por ContentSid.
   * Auto-ajusta el modo: >3 opciones en 'buttons' pasa a 'list'; >10 cae a texto.
   */
  private async sendInteractive(
    config: TwilioConfig,
    to: string,
    msg: OutgoingMessage,
  ): Promise<string | null> {
    const options = (msg.options ?? []).slice(0, 10);
    let mode: 'buttons' | 'list' = msg.menuType === 'list' ? 'list' : 'buttons';
    if (mode === 'buttons' && options.length > 3) mode = 'list'; // botones: máx 3
    if (options.length > 10) {
      throw new Error('Demasiadas opciones para un menú nativo (máx 10).');
    }

    const types = this.buildContentTypes(msg, mode, options);
    const contentSid = await this.getOrCreateContent(config, types);

    const url = `${MESSAGES_BASE}/Accounts/${config.accountSid}/Messages.json`;
    const params = new URLSearchParams();
    params.set('From', config.fromNumber);
    params.set('To', this.normalizeTo(to));
    params.set('ContentSid', contentSid);

    const { data } = await axios.post(url, params, {
      auth: { username: config.apiKeySid, password: config.apiKeySecret },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });
    const sid = data?.sid ?? null;
    this.logger.log(
      `Menú ${mode} Twilio enviado a ${params.get('To')} (sid=${sid}, content=${contentSid})`,
    );
    return sid;
  }

  /** Construye el objeto `types` de la Content API según el modo, con fallback de texto. */
  private buildContentTypes(
    msg: OutgoingMessage,
    mode: 'buttons' | 'list',
    options: { id: string; label: string; description?: string }[],
  ): Record<string, any> {
    const body = (msg.text ?? 'Elige una opción:').slice(0, 1024);
    const fallbackText = this.numberedText(msg).slice(0, 1600);

    if (mode === 'buttons') {
      return {
        'twilio/quick-reply': {
          body,
          actions: options.slice(0, 3).map((o) => ({
            title: o.label.slice(0, 24),
            id: String(o.id).slice(0, 200),
          })),
        },
        'twilio/text': { body: fallbackText },
      };
    }

    // list-picker
    return {
      'twilio/list-picker': {
        body,
        button: (msg.listButtonText || 'Ver opciones').slice(0, 20),
        items: options.map((o) => ({
          item: o.label.slice(0, 24),
          id: String(o.id).slice(0, 200),
          ...(o.description ? { description: o.description.slice(0, 72) } : {}),
        })),
      },
      'twilio/text': { body: fallbackText },
    };
  }

  /**
   * Devuelve el ContentSid de un menú, creándolo en la Content API si no está
   * en caché. La clave de caché es un hash del contenido (cuenta + types).
   */
  private async getOrCreateContent(
    config: TwilioConfig,
    types: Record<string, any>,
  ): Promise<string> {
    const key = createHash('sha1')
      .update(config.accountSid + '|' + JSON.stringify(types))
      .digest('hex');

    const cached = this.contentCache.get(key);
    if (cached) return cached;

    const { data } = await axios.post(
      CONTENT_URL,
      {
        friendly_name: `wabots_${key.slice(0, 16)}`,
        language: 'es',
        types,
      },
      {
        auth: { username: config.apiKeySid, password: config.apiKeySecret },
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000,
      },
    );

    const sid = data?.sid;
    if (!sid) throw new Error('La Content API no devolvió un ContentSid.');
    this.contentCache.set(key, sid);
    return sid;
  }

  /** Representación en texto numerado de un menú interactivo. */
  private numberedText(msg: OutgoingMessage): string {
    const options = msg.options ?? [];
    const lines = options.map((o, i) => `${i + 1}. ${o.label}`).join('\n');
    return [msg.text, lines].filter(Boolean).join('\n\n');
  }

  /**
   * Normaliza el destino al formato 'whatsapp:+<dígitos>'.
   */
  private normalizeTo(to: string): string {
    return `whatsapp:+${digitsOnly(to)}`;
  }
}
