import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

import { errorMessage } from '../../common/text/error-message.util';
import { withRetry } from '../../common/http/with-retry';

/**
 * Traduce el Markdown del modelo al formato que entiende WhatsApp.
 *
 * WhatsApp NO usa Markdown: la negrita es `*asi*` con UN asterisco, no dos. Cuando el
 * modelo escribe `**Café 08**`, WhatsApp toma el primer y el último asterisco como marcas
 * y deja los de dentro literales, así que al cliente le llega `*Café 08*` en negrita —
 * con los asteriscos a la vista. Comprobado en un chat real.
 *
 * Se hace aquí, en el único sitio por donde sale todo el texto, y no pidiéndoselo al
 * prompt: una instrucción de formato la cumple el modelo casi siempre, y "casi siempre"
 * significa que el cliente ve la costura de vez en cuando.
 */
export function aFormatoWhatsApp(texto: string): string {
  if (!texto) return texto;
  return texto
    // Encabezados de Markdown: WhatsApp no los tiene. Se quedan en negrita.
    .replace(/^\s{0,3}#{1,6}\s+(.+)$/gm, '*$1*')
    // Negrita: `**x**` o `__x__` → `*x*`
    .replace(/\*\*([^*\n]+)\*\*/g, '*$1*')
    .replace(/__([^_\n]+)__/g, '*$1*')
    // Cursiva de Markdown con guion bajo simple ya coincide con la de WhatsApp: se deja.
    // Viñetas: `-` y `*` al principio de línea → `•`, que WhatsApp sí muestra alineado.
    .replace(/^(\s*)[-*]\s+/gm, '$1• ')
    // Enlaces `[texto](url)` → `texto: url`, porque WhatsApp los enseña crudos.
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1: $2')
    // Bloques de código: los backticks no significan nada y ensucian.
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/`([^`\n]+)`/g, '$1')
    // Un asterisco suelto que quedara sin pareja rompería el formato de todo el mensaje.
    .replace(/\*{3,}/g, '*');
}

/**
 * Cliente HTTP de bajo nivel a Evolution API.
 * Encapsula TODAS las llamadas HTTP. Ver CONTRACTS.md §5.
 * No lanza errores fatales: ante fallo registra y devuelve null/false
 * para no tumbar la app si Evolution no responde.
 */
@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    const baseURL = this.config.get<string>('EVOLUTION_API_URL') ?? 'http://localhost:8080';
    const apiKey = this.config.get<string>('EVOLUTION_API_KEY') ?? '';

    this.http = axios.create({
      baseURL,
      headers: { apikey: apiKey, 'Content-Type': 'application/json' },
      // Configurable: si Evolution anda lento (media pesada), se sube por env
      // sin recompilar.
      timeout: Math.max(3000, Number(process.env.EVOLUTION_TIMEOUT_MS ?? 15000)),
    });
  }

  /** Crea una instancia en Evolution y la asocia a un webhook. */
  async createInstance(name: string, webhookUrl: string): Promise<any | null> {
    try {
      const { data } = await this.http.post('/instance/create', {
        instanceName: name,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          url: webhookUrl,
          byEvents: false,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
        },
      });
      return data;
    } catch (err) {
      this.logger.error(`createInstance(${name}) falló: ${errorMessage(err)}`);
      return null;
    }
  }

  /** Conecta la instancia y devuelve el QR en base64 (o null). */
  async connect(name: string): Promise<string | null> {
    try {
      const { data } = await this.http.get(`/instance/connect/${name}`);
      // Evolution devuelve { base64, code, ... } o { qrcode: { base64 } }
      return data?.base64 ?? data?.qrcode?.base64 ?? null;
    } catch (err) {
      this.logger.error(`connect(${name}) falló: ${errorMessage(err)}`);
      return null;
    }
  }

  /** Consulta el estado de conexión de la instancia. */
  async connectionState(name: string): Promise<any | null> {
    try {
      const { data } = await this.http.get(`/instance/connectionState/${name}`);
      return data;
    } catch (err) {
      this.logger.error(`connectionState(${name}) falló: ${errorMessage(err)}`);
      return null;
    }
  }

  /** Cierra la sesión de WhatsApp de la instancia. */
  async logout(name: string): Promise<boolean> {
    try {
      await this.http.delete(`/instance/logout/${name}`);
      return true;
    } catch (err) {
      this.logger.error(`logout(${name}) falló: ${errorMessage(err)}`);
      return false;
    }
  }

  /**
   * Envía un mensaje de texto. Con REINTENTOS (backoff) ante errores
   * transitorios: un hipo de red de Evolution ya no pierde la respuesta.
   *
   * El texto pasa por `aFormatoWhatsApp` porque el modelo escribe Markdown y
   * WhatsApp no lo entiende: ver el comentario de esa función.
   */
  async sendText(name: string, to: string, text: string): Promise<any | null> {
    try {
      const { data } = await withRetry(
        () => this.http.post(`/message/sendText/${name}`, { number: to, text: aFormatoWhatsApp(text) }),
        { onRetry: (n, e) => this.logger.warn(`sendText(${name}→${to}) reintento ${n}: ${errorMessage(e)}`) },
      );
      return data;
    } catch (err) {
      this.logger.error(`sendText(${name}→${to}) falló: ${errorMessage(err)}`);
      return null;
    }
  }

  /** Envía un mensaje multimedia (imagen/documento) con caption opcional. */
  async sendMedia(
    name: string,
    to: string,
    media: { mediaUrl: string; caption?: string },
  ): Promise<any | null> {
    try {
      const { data } = await withRetry(
        () =>
          this.http.post(`/message/sendMedia/${name}`, {
            number: to,
            mediatype: 'image',
            media: media.mediaUrl,
            caption: aFormatoWhatsApp(media.caption ?? ''),
          }),
        { onRetry: (n, e) => this.logger.warn(`sendMedia(${name}→${to}) reintento ${n}: ${errorMessage(e)}`) },
      );
      return data;
    } catch (err) {
      this.logger.error(`sendMedia(${name}→${to}) falló: ${errorMessage(err)}`);
      return null;
    }
  }

  /** Configura (o reconfigura) el webhook de la instancia. */
  async setWebhook(name: string, url: string, events: string[]): Promise<boolean> {
    try {
      await this.http.post(`/webhook/set/${name}`, {
        webhook: {
          enabled: true,
          url,
          byEvents: false,
          events,
        },
      });
      return true;
    } catch (err) {
      this.logger.error(`setWebhook(${name}) falló: ${errorMessage(err)}`);
      return false;
    }
  }

  /**
   * Pide a Evolution el adjunto YA DESCIFRADO, en base64.
   *
   * Los medios de WhatsApp viajan cifrados: la `mediaUrl` del webhook apunta a un
   * `.enc` en mmg.whatsapp.net que solo se puede abrir con la clave del mensaje.
   * Descargarla y pasarla a ffmpeg falla con "Invalid data found when processing
   * input", que es exactamente lo que le pasó a la primera nota de voz real.
   *
   * Devuelve null si no se puede obtener: quien llame decide qué decirle al cliente.
   */
  async getMediaBase64(name: string, message: any): Promise<string | null> {
    try {
      const { data } = await this.http.post(`/chat/getBase64FromMediaMessage/${name}`, {
        message,
        convertToMp4: false,
      });
      const b64 = data?.base64 ?? data?.media ?? data?.data?.base64 ?? null;
      if (!b64 || typeof b64 !== 'string') {
        this.logger.warn(`getMediaBase64(${name}): respuesta sin base64.`);
        return null;
      }
      return b64;
    } catch (err) {
      this.logger.warn(`getMediaBase64(${name}) falló: ${errorMessage(err)}`);
      return null;
    }
  }
}
