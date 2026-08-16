import { Injectable } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { GoogleOAuthService } from './google-oauth.service';
import { RunForEnginePayload } from './integration-run.types';

/**
 * Ejecución de nodos de Gmail para el motor: refresca el accessToken (si hay
 * refreshToken) y despacha la acción (list/get/modify/send) a GmailService.
 */
@Injectable()
export class GmailRunnerService {
  constructor(
    private readonly gmail: GmailService,
    private readonly googleOAuth: GoogleOAuthService,
  ) {}

  /**
   * Gmail. El flujo OAuth almacena refreshToken (igual que Calendar): si lo hay,
   * se refresca un accessToken fresco antes de cada acción para evitar tokens
   * expirados. Si no hay refreshToken pero sí accessToken (caso legado/manual),
   * se usa tal cual.
   */
  async runGmail(
    config: Record<string, any>,
    payload: RunForEnginePayload,
  ): Promise<any> {
    if (config.refreshToken) {
      try {
        const refreshed = await this.googleOAuth.refreshAccessToken(
          config.refreshToken,
        );
        config.accessToken = refreshed.access_token;
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err);
        throw new Error(`No se pudo refrescar el token de Gmail: ${m}`);
      }
    }

    // Despacho por acción (default 'send' para no romper el comportamiento).
    const action: string = payload.action ?? 'send';
    switch (action) {
      case 'list':
        return this.gmail.list(config as any, payload as any);
      case 'get':
        return this.gmail.get(config as any, payload.id);
      case 'modify':
        return this.gmail.modify(config as any, payload.id, payload as any);
      case 'send':
      default:
        return this.gmail.send(config as any, payload as any);
    }
  }
}
