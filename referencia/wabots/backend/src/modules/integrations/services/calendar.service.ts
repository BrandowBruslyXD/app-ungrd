import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { createSign } from 'crypto';
import { GoogleOAuthService } from './google-oauth.service';

/** Configuración (ya descifrada) de una integración de Google Calendar. */
export interface CalendarConfig {
  // Refresh token OAuth (obtenido en el flujo de consentimiento). Requerido en
  // el flujo OAuth (Modelo A/B).
  refreshToken?: string;
  // Access token cacheado (opcional); se refresca con refreshToken al ejecutar.
  accessToken?: string;
  // Calendario destino; por defecto 'primary' (solo válido en flujo OAuth).
  calendarId?: string;
  // Cuenta de servicio de Google (Modelo C: agenda directa, sin OAuth/consent).
  // Si está presente, tiene prioridad sobre refreshToken.
  serviceAccount?: { client_email: string; private_key: string };
}

/** Parámetros de una acción de calendario. */
export interface CalendarRunParams {
  action:
    | 'listEvents'
    | 'createEvent'
    | 'checkAvailability'
    | 'updateEvent'
    | 'deleteEvent'
    | 'findEvents';
  [key: string]: any;
}

const CAL_BASE = 'https://www.googleapis.com/calendar/v3';
const DEFAULT_TZ = 'America/Bogota';
const DEFAULT_DURATION_MIN = 60;
// Endpoint y scope para el intercambio JWT-bearer de cuenta de servicio.
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

/**
 * Servicio de Google Calendar. Obtiene un access_token fresco a partir del
 * refreshToken (vía GoogleOAuthService) en cada ejecución, y soporta crear y
 * listar eventos.
 */
@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private readonly oauth: GoogleOAuthService) {}

  /**
   * Ejecuta una acción de calendario. Obtiene un access_token según el modo:
   *  - Cuenta de servicio (Modelo C): si config.serviceAccount tiene
   *    client_email y private_key → JWT-bearer (agenda directa, sin consent).
   *  - OAuth (Modelo A/B): si config.refreshToken → refresco vía OAuth.
   *  - Si no hay ninguno → error claro.
   *
   * El calendarId del nodo (params.calendarId) tiene prioridad sobre el de la
   * integración (config.calendarId).
   */
  async run(config: CalendarConfig, params: CalendarRunParams): Promise<any> {
    const sa = config?.serviceAccount;
    const usaServiceAccount = !!(sa?.client_email && sa?.private_key);

    // params.calendarId (del nodo) tiene prioridad sobre config.calendarId.
    const rawCalendarId =
      (typeof params.calendarId === 'string' && params.calendarId.trim()) ||
      config?.calendarId ||
      '';

    let access_token: string;
    let calendarId: string;

    if (usaServiceAccount) {
      // Modelo C: la cuenta de servicio NO tiene calendario propio; el
      // calendarId DEBE ser el correo del calendario compartido con la SA.
      const normalized = String(rawCalendarId).trim();
      if (!normalized || normalized === 'primary') {
        throw new Error(
          'Con cuenta de servicio debes indicar calendarId (el correo del ' +
            'calendario compartido con la cuenta de servicio). No se permite ' +
            "'primary' porque la cuenta de servicio no tiene calendario propio.",
        );
      }
      calendarId = normalized;
      access_token = await this.getServiceAccountToken(sa!);
    } else if (config?.refreshToken) {
      // Modelo A/B (OAuth): siempre refrescamos para evitar tokens expirados.
      const refreshed = await this.oauth.refreshAccessToken(
        config.refreshToken,
      );
      access_token = refreshed.access_token;
      calendarId = rawCalendarId || 'primary';
    } else {
      throw new Error(
        'No hay credenciales de Calendar. Configura una cuenta de servicio ' +
          '(serviceAccount) o completa el flujo OAuth de Google (refreshToken).',
      );
    }

    switch (params.action) {
      case 'listEvents':
        return this.listEvents(access_token, calendarId, params);
      case 'findEvents':
        return this.findEvents(access_token, calendarId, params);
      case 'createEvent':
        return this.createEvent(
          access_token,
          calendarId,
          params,
          usaServiceAccount,
        );
      case 'checkAvailability':
        return this.checkAvailability(access_token, calendarId, params);
      case 'updateEvent':
        return this.updateEvent(access_token, calendarId, params);
      case 'deleteEvent':
        return this.deleteEvent(access_token, calendarId, params);
      default:
        throw new Error(`Acción de calendario no soportada: ${params.action}`);
    }
  }

  /**
   * Obtiene un access_token de Google para una cuenta de servicio mediante el
   * flujo JWT-bearer:
   *  1. Arma un JWT RS256 con el claim del scope de Calendar.
   *  2. Lo firma con la private_key (PEM) de la cuenta de servicio.
   *  3. Lo intercambia en el endpoint de token de Google.
   */
  private async getServiceAccountToken(sa: {
    client_email: string;
    private_key: string;
  }): Promise<string> {
    try {
      const now = Math.floor(Date.now() / 1000);

      const header = { alg: 'RS256', typ: 'JWT' };
      const claim = {
        iss: sa.client_email,
        scope: CALENDAR_SCOPE,
        aud: GOOGLE_TOKEN_URL,
        iat: now,
        exp: now + 3600,
      };

      // Codificación base64url de header y claim.
      const encodedHeader = this.base64url(JSON.stringify(header));
      const encodedClaim = this.base64url(JSON.stringify(claim));
      const signingInput = `${encodedHeader}.${encodedClaim}`;

      // La private_key (PEM) debe tener saltos de línea reales. Si vino con
      // secuencias literales "\n" (típico al copiar el JSON), las restauramos.
      const privateKey = sa.private_key.includes('\\n')
        ? sa.private_key.replace(/\\n/g, '\n')
        : sa.private_key;

      // Firma RS256 (RSA-SHA256) del signing input.
      const signer = createSign('RSA-SHA256');
      signer.update(signingInput);
      signer.end();
      const signature = signer.sign(privateKey);
      const encodedSignature = this.base64urlBuffer(signature);

      const assertion = `${signingInput}.${encodedSignature}`;

      // Intercambio del JWT por un access_token.
      const body = new URLSearchParams();
      body.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
      body.set('assertion', assertion);

      const { data } = await axios.post(GOOGLE_TOKEN_URL, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 20000,
      });

      if (!data?.access_token) {
        throw new Error('La respuesta de Google no incluyó access_token.');
      }
      return data.access_token as string;
    } catch (err) {
      this.logger.error(`getServiceAccountToken() falló: ${this.msg(err)}`);
      throw new Error(
        `No se pudo obtener el token de la cuenta de servicio: ${this.msg(err)}`,
      );
    }
  }

  /** Codifica un string UTF-8 en base64url (sin padding). */
  private base64url(value: string): string {
    return this.base64urlBuffer(Buffer.from(value, 'utf8'));
  }

  /** Codifica un Buffer en base64url (sin padding). */
  private base64urlBuffer(buf: Buffer): string {
    return buf
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * GET de eventos (crudo de Google). Acepta `q` (texto libre, p.ej. el teléfono
   * del cliente), `timeMin`/`timeMax` (RFC3339) y `maxResults`.
   */
  private async fetchEventsRaw(
    accessToken: string,
    calendarId: string,
    params: CalendarRunParams,
  ): Promise<any> {
    const url = `${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        timeMin: params.timeMin || new Date().toISOString(),
        ...(params.timeMax ? { timeMax: params.timeMax } : {}),
        ...(params.q ? { q: String(params.q) } : {}),
        maxResults: params.maxResults ?? 10,
        singleEvents: true,
        orderBy: 'startTime',
      },
      timeout: 20000,
    });
    return data;
  }

  /** Lista eventos (crudo de Google, con `items`). Lo consume el visor del panel. */
  private async listEvents(
    accessToken: string,
    calendarId: string,
    params: CalendarRunParams,
  ): Promise<any> {
    try {
      return await this.fetchEventsRaw(accessToken, calendarId, params);
    } catch (err) {
      this.logger.error(`listEvents() falló: ${this.msg(err)}`);
      throw new Error(`Listado de eventos fallido: ${this.msg(err)}`);
    }
  }

  /** Busca eventos y los devuelve COMPACTOS (id/summary/start/end) para el agente. */
  private async findEvents(
    accessToken: string,
    calendarId: string,
    params: CalendarRunParams,
  ): Promise<any> {
    try {
      const data = await this.fetchEventsRaw(accessToken, calendarId, params);
      const events = (data?.items || []).map((e: any) => ({
        id: e.id,
        summary: e.summary || '',
        start: e.start?.dateTime || e.start?.date || null,
        end: e.end?.dateTime || e.end?.date || null,
      }));
      return { events, count: events.length };
    } catch (err) {
      this.logger.error(`findEvents() falló: ${this.msg(err)}`);
      throw new Error(`Búsqueda de eventos fallida: ${this.msg(err)}`);
    }
  }

  /**
   * ¿Está libre un hueco `start` de `durationMin`? Consulta freeBusy del
   * calendario y devuelve { free, conflicts }. Es el chequeo que faltaba para
   * no agendar doble.
   */
  private async checkAvailability(
    accessToken: string,
    calendarId: string,
    params: CalendarRunParams,
  ): Promise<any> {
    if (!params.start) throw new Error('Falta "start" para consultar disponibilidad.');
    const durationMin = Number(params.durationMin) || DEFAULT_DURATION_MIN;
    const { startMs } = this.parseStart(params.start);
    const timeMin = new Date(startMs).toISOString();
    const timeMax = new Date(startMs + durationMin * 60_000).toISOString();
    try {
      const { data } = await axios.post(
        `${CAL_BASE}/freeBusy`,
        { timeMin, timeMax, items: [{ id: calendarId }] },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, timeout: 20000 },
      );
      const busy = data?.calendars?.[calendarId]?.busy || [];
      return { free: busy.length === 0, conflicts: busy, start: params.start, durationMin };
    } catch (err) {
      this.logger.error(`checkAvailability() falló: ${this.msg(err)}`);
      throw new Error(`Consulta de disponibilidad fallida: ${this.msg(err)}`);
    }
  }

  /** Reagenda un evento existente (por eventId): nuevo start y/o duración/summary. */
  private async updateEvent(
    accessToken: string,
    calendarId: string,
    params: CalendarRunParams,
  ): Promise<any> {
    if (!params.eventId) throw new Error('Falta "eventId" para reagendar.');
    const timeZone = params.timezone || DEFAULT_TZ;
    const body: any = {};
    if (params.summary) body.summary = params.summary;
    if (params.description) body.description = params.description;
    if (params.start) {
      const durationMin = Number(params.durationMin) || DEFAULT_DURATION_MIN;
      const { startNaive, startMs } = this.parseStart(params.start);
      const endNaive = new Date(startMs + durationMin * 60_000).toISOString().slice(0, 19);
      body.start = { dateTime: startNaive, timeZone };
      body.end = { dateTime: endNaive, timeZone };
    }
    const url = `${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(params.eventId)}`;
    try {
      const { data } = await axios.patch(url, body, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        timeout: 20000,
      });
      return { ok: true, id: data?.id, htmlLink: data?.htmlLink, start: data?.start?.dateTime };
    } catch (err) {
      this.logger.error(`updateEvent() falló: ${this.msg(err)}`);
      throw new Error(`Reagendar fallido: ${this.msg(err)}`);
    }
  }

  /** Cancela (borra) un evento por eventId. */
  private async deleteEvent(
    accessToken: string,
    calendarId: string,
    params: CalendarRunParams,
  ): Promise<any> {
    if (!params.eventId) throw new Error('Falta "eventId" para cancelar.');
    const url = `${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(params.eventId)}`;
    try {
      await axios.delete(url, { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 20000 });
      return { ok: true, deleted: params.eventId };
    } catch (err) {
      this.logger.error(`deleteEvent() falló: ${this.msg(err)}`);
      throw new Error(`Cancelación fallida: ${this.msg(err)}`);
    }
  }

  /**
   * Crea un evento. params: { summary, description?, start, durationMin?, timezone? }.
   * `start` puede venir como "YYYY-MM-DD HH:mm" o ISO; se convierte a RFC3339.
   */
  private async createEvent(
    accessToken: string,
    calendarId: string,
    params: CalendarRunParams,
    usaServiceAccount = false,
  ): Promise<any> {
    if (!params.summary) {
      throw new Error('Falta "summary" para crear el evento.');
    }
    if (!params.start) {
      throw new Error('Falta "start" para crear el evento.');
    }

    const timeZone = params.timezone || DEFAULT_TZ;
    const durationMin = Number(params.durationMin) || DEFAULT_DURATION_MIN;

    // Fecha "naive" (sin Z) + timeZone: Google interpreta la hora EN esa zona,
    // evitando el corrimiento por UTC (ej. 10:30 quedaba 05:30).
    const { startNaive, startMs } = this.parseStart(params.start);
    const endNaive = new Date(startMs + durationMin * 60_000)
      .toISOString()
      .slice(0, 19);

    const url = `${CAL_BASE}/calendars/${encodeURIComponent(
      calendarId,
    )}/events`;

    // Modelo B (OAuth): invitar por correo a uno o varios destinatarios.
    // Con cuenta de servicio (Modelo C) NO se usan attendees: la SA no puede
    // invitar; el evento se crea directo en el calendario compartido.
    const attendees = usaServiceAccount
      ? []
      : this.parseAttendees(params.attendees);

    const body: any = {
      summary: params.summary,
      description: params.description,
      start: { dateTime: startNaive, timeZone },
      end: { dateTime: endNaive, timeZone },
    };
    if (attendees.length) {
      body.attendees = attendees.map((email) => ({ email }));
    }

    try {
      const { data } = await axios.post(url, body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        // sendUpdates=all → Google envía el correo de invitación a los invitados.
        params: attendees.length ? { sendUpdates: 'all' } : undefined,
        timeout: 20000,
      });
      return { ok: true, htmlLink: data?.htmlLink, id: data?.id, invitados: attendees };
    } catch (err) {
      this.logger.error(`createEvent() falló: ${this.msg(err)}`);
      throw new Error(`Creación de evento fallida: ${this.msg(err)}`);
    }
  }

  /**
   * Normaliza "YYYY-MM-DD HH:mm" (o ISO) a fecha "naive" (sin zona) que se envía
   * junto al timeZone, y su epoch (tratando la naive como UTC) solo para sumar
   * la duración. Así la hora se respeta tal cual en la zona indicada.
   */
  private parseStart(value: string): { startNaive: string; startMs: number } {
    let n = String(value).trim().replace(/\s+/, 'T');
    n = n.replace(/(Z|[+-]\d{2}:?\d{2})$/, ''); // quita Z/offset → naive
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(n)) n += ':00';
    const ms = Date.parse(`${n}Z`);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(n) || isNaN(ms)) {
      throw new Error(`Fecha inválida: "${value}". Usa "YYYY-MM-DD HH:mm".`);
    }
    return { startNaive: n, startMs: ms };
  }

  /** Normaliza la lista de invitados (array o texto) a correos válidos. */
  private parseAttendees(value: unknown): string[] {
    if (!value) return [];
    const arr = Array.isArray(value) ? value : String(value).split(/[,;\s]+/);
    return arr
      .map((s) => String(s).trim())
      .filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
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
