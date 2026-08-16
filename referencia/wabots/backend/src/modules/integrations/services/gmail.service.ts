import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/** Configuración (ya descifrada) de una integración Gmail. */
export interface GmailConfig {
  // Token OAuth de acceso (Bearer). Se obtiene del flujo OAuth de Google.
  accessToken?: string;
  // Remitente opcional ("from"); por defecto la cuenta autenticada (me).
  from?: string;
  // ── Config opcional del AGENTE DE CORREO (poller) ──
  // Si es true, el agente de correo procesa los correos no leídos del tenant.
  agentEnabled?: boolean;
  // Prompt de sistema con el que el LLM clasifica/redacta (opcional).
  systemPrompt?: string;
  // Calendario destino al agendar (correo del calendario / 'primary').
  calendarId?: string;
  // Si es true, el agente puede responder correos automáticamente.
  autoReply?: boolean;
}

/** Parámetros para enviar un correo. */
export interface GmailSendParams {
  to: string;
  subject: string;
  body: string;
}

/** Parámetros para listar correos. */
export interface GmailListParams {
  // Consulta estilo Gmail (por defecto 'is:unread').
  query?: string;
  // Máximo de resultados (por defecto 10).
  maxResults?: number;
}

/** Parámetros para modificar etiquetas de un correo. */
export interface GmailModifyParams {
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

/** Correo ya parseado y legible. */
export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
}

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * Servicio Gmail. Lee, envía y modifica correos usando la API REST de Gmail
 * con un accessToken OAuth (Bearer) en config.accessToken.
 *
 * El accessToken se obtiene/refresca en IntegrationsService a partir del
 * refreshToken almacenado por el flujo OAuth de Google.
 */
@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);

  /** Envía un correo. Lanza error claro si falta el accessToken. */
  async send(config: GmailConfig, params: GmailSendParams): Promise<any> {
    this.ensureToken(config);

    const raw = this.buildRawMessage(config.from ?? 'me', params);

    try {
      const { data } = await axios.post(
        `${GMAIL_BASE}/messages/send`,
        { raw },
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        },
      );
      return data;
    } catch (err) {
      this.logger.error(`send() falló: ${this.msg(err)}`);
      throw new Error(`Envío de Gmail fallido: ${this.msg(err)}`);
    }
  }

  /**
   * Lista ids de correos según una consulta (por defecto no leídos).
   * GET /messages?q=...&maxResults=...  → devuelve string[] de ids.
   */
  async list(
    config: GmailConfig,
    params: GmailListParams = {},
  ): Promise<string[]> {
    this.ensureToken(config);

    const q = params.query ?? 'is:unread';
    const maxResults = Number(params.maxResults) || 10;

    try {
      const { data } = await axios.get(`${GMAIL_BASE}/messages`, {
        headers: { Authorization: `Bearer ${config.accessToken}` },
        params: { q, maxResults },
        timeout: 20000,
      });
      const messages: Array<{ id: string }> = data?.messages ?? [];
      return messages.map((m) => m.id).filter(Boolean);
    } catch (err) {
      this.logger.error(`list() falló: ${this.msg(err)}`);
      throw new Error(`Listado de Gmail fallido: ${this.msg(err)}`);
    }
  }

  /**
   * Obtiene un correo completo y lo parsea a un objeto legible.
   * GET /messages/{id}?format=full
   */
  async get(config: GmailConfig, id: string): Promise<GmailMessage> {
    this.ensureToken(config);
    if (!id) throw new Error('Falta el id del correo a obtener.');

    try {
      const { data } = await axios.get(`${GMAIL_BASE}/messages/${id}`, {
        headers: { Authorization: `Bearer ${config.accessToken}` },
        params: { format: 'full' },
        timeout: 20000,
      });

      const headers: Array<{ name: string; value: string }> =
        data?.payload?.headers ?? [];
      const header = (name: string): string =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
          ?.value ?? '';

      const snippet: string = data?.snippet ?? '';
      const body = this.extractBody(data?.payload) || snippet;

      return {
        id: data?.id ?? id,
        threadId: data?.threadId ?? '',
        from: header('From'),
        subject: header('Subject'),
        date: header('Date'),
        snippet,
        body,
      };
    } catch (err) {
      this.logger.error(`get() falló: ${this.msg(err)}`);
      throw new Error(`Lectura de Gmail fallida: ${this.msg(err)}`);
    }
  }

  /**
   * Modifica las etiquetas de un correo (p.ej. quitar 'UNREAD' para marcarlo
   * como leído). POST /messages/{id}/modify.
   */
  async modify(
    config: GmailConfig,
    id: string,
    params: GmailModifyParams = {},
  ): Promise<any> {
    this.ensureToken(config);
    if (!id) throw new Error('Falta el id del correo a modificar.');

    try {
      const { data } = await axios.post(
        `${GMAIL_BASE}/messages/${id}/modify`,
        {
          ...(params.addLabelIds ? { addLabelIds: params.addLabelIds } : {}),
          ...(params.removeLabelIds
            ? { removeLabelIds: params.removeLabelIds }
            : {}),
        },
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        },
      );
      return data;
    } catch (err) {
      this.logger.error(`modify() falló: ${this.msg(err)}`);
      throw new Error(`Modificación de Gmail fallida: ${this.msg(err)}`);
    }
  }

  // ───────────────────────────── Internos ─────────────────────────────

  /** Verifica que haya accessToken; lanza error claro si falta. */
  private ensureToken(config: GmailConfig): void {
    if (!config?.accessToken) {
      throw new Error(
        'Falta accessToken de Gmail. Completa el flujo OAuth de la integración.',
      );
    }
  }

  /**
   * Extrae el cuerpo de texto plano de un payload de Gmail. Recorre las partes
   * (multipart) buscando text/plain; decodifica base64url. Devuelve '' si no
   * encuentra texto (el llamador hace fallback al snippet).
   */
  private extractBody(payload: any): string {
    if (!payload) return '';

    // Caso simple: el cuerpo viene directo en payload.body.
    const mimeType: string = payload.mimeType ?? '';
    if (mimeType.startsWith('text/plain') && payload.body?.data) {
      return this.decodeBase64Url(payload.body.data);
    }

    // Caso multipart: buscar recursivamente la parte text/plain.
    const parts: any[] = payload.parts ?? [];
    for (const part of parts) {
      const found = this.extractBody(part);
      if (found) return found;
    }

    // Último recurso: si hay HTML, lo devolvemos (mejor que nada).
    if (mimeType.startsWith('text/html') && payload.body?.data) {
      return this.decodeBase64Url(payload.body.data);
    }
    return '';
  }

  /** Decodifica una cadena base64url (formato de Gmail) a texto UTF-8. */
  private decodeBase64Url(data: string): string {
    try {
      const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
      return Buffer.from(normalized, 'base64').toString('utf8');
    } catch {
      return '';
    }
  }

  /**
   * Construye el mensaje MIME y lo codifica en base64url (formato que exige
   * la API de Gmail para el campo `raw`).
   *
   * Sanea las cabeceras contra inyección MIME (elimina CR/LF de from/to/subject)
   * y codifica el Subject en RFC 2047 cuando contiene caracteres no ASCII.
   */
  private buildRawMessage(from: string, params: GmailSendParams): string {
    // Elimina saltos de línea: un CR/LF en una cabecera permitiría inyectar
    // cabeceras MIME arbitrarias (p.ej. Bcc) en el mensaje.
    const stripCrLf = (value: string): string =>
      String(value ?? '').replace(/[\r\n]+/g, ' ').trim();

    const safeFrom = stripCrLf(from);
    const safeTo = stripCrLf(params.to);
    let safeSubject = stripCrLf(params.subject);
    // RFC 2047: los Subject con no-ASCII deben viajar codificados (UTF-8/base64).
    if (/[^\x20-\x7e]/.test(safeSubject)) {
      safeSubject = `=?UTF-8?B?${Buffer.from(safeSubject, 'utf8').toString('base64')}?=`;
    }

    const lines = [
      `From: ${safeFrom}`,
      `To: ${safeTo}`,
      `Subject: ${safeSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      params.body ?? '',
    ];
    const mime = lines.join('\r\n');
    return Buffer.from(mime, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /** Extrae un mensaje legible de un error de axios. */
  private msg(err: unknown): string {
    if (axios.isAxiosError(err)) {
      return `${err.response?.status ?? ''} ${JSON.stringify(
        err.response?.data ?? err.message,
      )}`;
    }
    return err instanceof Error ? err.message : String(err);
  }
}
