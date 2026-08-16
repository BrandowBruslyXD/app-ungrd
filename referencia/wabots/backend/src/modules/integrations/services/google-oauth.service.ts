import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import axios from 'axios';

// Ventana de validez del `state` OAuth (evita replay de callbacks antiguos).
const STATE_TTL_MS = 15 * 60 * 1000;

/** Tipo de servicio de Google soportado por el flujo OAuth. */
export type GoogleOAuthType = 'calendar' | 'gmail';

/**
 * State que viaja en la URL de consentimiento (codificado en base64 JSON).
 * Lleva el `type` y, de forma EXCLUYENTE, uno de:
 *  - `tenantId`: Modelo A (integración por empresa).
 *  - `level: 'platform'`: Modelo B (integración GLOBAL de plataforma).
 */
export interface GoogleOAuthState {
  type: GoogleOAuthType;
  // Modelo A (por empresa). Ausente en plataforma.
  tenantId?: string;
  // Modelo B (plataforma global). Ausente cuando hay tenantId.
  level?: 'platform';
}

/** Tokens devueltos por el intercambio de código (authorization_code). */
export interface GoogleTokens {
  access_token: string;
  // Puede no venir si el usuario ya consintió antes (Google no lo reemite).
  refresh_token?: string;
  // Marca temporal (epoch ms) en que expira el access_token.
  expiry_date?: number;
}

// Endpoints oficiales de Google.
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Scopes por tipo de integración. Para Gmail pedimos lectura, envío y
// modificación (necesarios para el agente de correo: leer no leídos, responder
// y marcar como leído). Los scopes van separados por espacio en la URL.
const SCOPES: Record<GoogleOAuthType, string> = {
  calendar: 'https://www.googleapis.com/auth/calendar.events',
  gmail: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
  ].join(' '),
};

/**
 * Servicio que encapsula el flujo OAuth2 de Google (con refresh token):
 *  - Construye la URL de consentimiento.
 *  - Intercambia el `code` por tokens.
 *  - Refresca el access_token a partir del refresh_token.
 *  - Codifica/decodifica el `state`.
 *
 * Lee las credenciales con ConfigService (GOOGLE_CLIENT_ID,
 * GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI). Nunca registra secretos.
 */
@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);

  constructor(private readonly config: ConfigService) {}

  /** client_id de Google (lanza error claro si falta). */
  private get clientId(): string {
    const v = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!v) throw new Error('Falta GOOGLE_CLIENT_ID en la configuración.');
    return v;
  }

  /** client_secret de Google (lanza error claro si falta). */
  private get clientSecret(): string {
    const v = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!v) throw new Error('Falta GOOGLE_CLIENT_SECRET en la configuración.');
    return v;
  }

  /** redirect_uri registrado en Google Cloud (lanza error claro si falta). */
  private get redirectUri(): string {
    const v = this.config.get<string>('GOOGLE_REDIRECT_URI');
    if (!v) throw new Error('Falta GOOGLE_REDIRECT_URI en la configuración.');
    return v;
  }

  /**
   * Construye la URL de consentimiento de Google.
   * access_type=offline + prompt=consent fuerzan la emisión de refresh_token.
   *
   * `target` describe el destino de la integración:
   *  - { tenantId } → Modelo A (por empresa).
   *  - { level: 'platform' } → Modelo B (integración GLOBAL de plataforma).
   */
  buildAuthUrl(
    target: { tenantId?: string; level?: 'platform' },
    type: GoogleOAuthType,
  ): string {
    const scope = SCOPES[type];
    if (!scope) throw new Error(`Tipo OAuth no soportado: ${type}`);

    // Construye el state según el modelo (excluyente).
    let state: GoogleOAuthState;
    if (target?.level === 'platform') {
      state = { type, level: 'platform' };
    } else if (target?.tenantId) {
      state = { type, tenantId: target.tenantId };
    } else {
      throw new Error(
        "Debes indicar tenantId (por empresa) o level='platform' (plataforma).",
      );
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      scope,
      state: this.buildState(state),
    });

    return `${AUTH_URL}?${params.toString()}`;
  }

  /**
   * Intercambia el `code` recibido en el callback por tokens.
   * Devuelve access_token, refresh_token (si aplica) y expiry_date (epoch ms).
   */
  async exchangeCode(code: string): Promise<GoogleTokens> {
    if (!code) throw new Error('Falta el parámetro "code".');
    try {
      const { data } = await axios.post(
        TOKEN_URL,
        new URLSearchParams({
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 20000,
        },
      );

      const expiresInSec = Number(data?.expires_in ?? 0);
      return {
        access_token: data?.access_token,
        refresh_token: data?.refresh_token,
        expiry_date: expiresInSec ? Date.now() + expiresInSec * 1000 : undefined,
      };
    } catch (err) {
      this.logger.error(`exchangeCode() falló: ${this.msg(err)}`);
      throw new Error(`Intercambio de código OAuth fallido: ${this.msg(err)}`);
    }
  }

  /**
   * Obtiene un nuevo access_token usando el refresh_token almacenado.
   * Devuelve { access_token, expiresInSec }.
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ access_token: string; expiresInSec: number }> {
    if (!refreshToken) throw new Error('Falta refreshToken.');
    try {
      const { data } = await axios.post(
        TOKEN_URL,
        new URLSearchParams({
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 20000,
        },
      );

      if (!data?.access_token) {
        throw new Error('Google no devolvió access_token.');
      }
      return {
        access_token: data.access_token,
        expiresInSec: Number(data?.expires_in ?? 0),
      };
    } catch (err) {
      this.logger.error(`refreshAccessToken() falló: ${this.msg(err)}`);
      throw new Error(`Refresco de token OAuth fallido: ${this.msg(err)}`);
    }
  }

  /**
   * Codifica el state como `payload.firma`, donde payload es base64url(JSON con
   * marca temporal) y firma es HMAC-SHA256 del payload. Impide que un tercero
   * fabrique un state con el tenantId de otra empresa (secuestro de integración).
   */
  buildState(state: GoogleOAuthState): string {
    const payload = { ...state, ts: Date.now() };
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    return `${body}.${this.signState(body)}`;
  }

  /** Verifica la firma y frescura del state del callback. Lanza si es inválido. */
  parseState(state: string): GoogleOAuthState {
    try {
      const [body, signature] = String(state).split('.');
      if (!body || !signature || !this.verifyState(body, signature)) {
        throw new Error('firma inválida');
      }

      const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (!parsed?.type) throw new Error('state incompleto');
      if (!parsed.tenantId && parsed.level !== 'platform') {
        throw new Error('state incompleto');
      }
      if (typeof parsed.ts !== 'number' || Date.now() - parsed.ts > STATE_TTL_MS) {
        throw new Error('state expirado');
      }
      return { type: parsed.type, tenantId: parsed.tenantId, level: parsed.level };
    } catch (err) {
      this.logger.error(`parseState() falló: ${this.msg(err)}`);
      throw new Error('El parámetro "state" del callback es inválido.');
    }
  }

  private signState(body: string): string {
    const secret = this.config.getOrThrow<string>('JWT_SECRET');
    return createHmac('sha256', secret).update(body).digest('base64url');
  }

  private verifyState(body: string, signature: string): boolean {
    const expected = Buffer.from(this.signState(body));
    const received = Buffer.from(signature);
    return expected.length === received.length && timingSafeEqual(expected, received);
  }

  /** Extrae un mensaje legible de un error de axios (sin exponer secretos). */
  private msg(err: unknown): string {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? '';
      // Solo exponemos error/error_description de Google, no el payload completo.
      const data = err.response?.data as
        | { error?: string; error_description?: string }
        | undefined;
      const detail = data?.error_description || data?.error || err.message;
      return `${status} ${detail}`.trim();
    }
    return err instanceof Error ? err.message : String(err);
  }
}
