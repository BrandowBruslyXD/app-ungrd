import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { IntegrationsService } from './integrations.service';
import {
  GoogleOAuthService,
  GoogleOAuthType,
} from './services/google-oauth.service';

/**
 * Endpoints del flujo OAuth2 de Google.
 *  - GET /integrations/google/auth-url  (protegido): devuelve la URL de consentimiento.
 *  - GET /integrations/google/callback  (PÚBLICO): Google redirige el navegador aquí.
 */
@Controller('integrations/google')
export class GoogleOAuthController {
  private readonly logger = new Logger(GoogleOAuthController.name);

  constructor(
    private readonly integrations: IntegrationsService,
    private readonly oauth: GoogleOAuthService,
  ) {}

  /**
   * Genera la URL de consentimiento de Google para el tipo dado.
   * Acepta DOS modelos (excluyentes):
   *  - Modelo A (por empresa): query `tenantId=<id>`.
   *  - Modelo B (plataforma):  query `level=platform`.
   * Protegido con JwtAuthGuard (lo consume el panel de administración).
   */
  @Get('auth-url')
  authUrl(
    @Query('type') type: GoogleOAuthType,
    @Query('tenantId') tenantId?: string,
    @Query('level') level?: string,
  ) {
    if (type !== 'calendar' && type !== 'gmail') {
      throw new BadRequestException("type debe ser 'calendar' o 'gmail'.");
    }
    const isPlatform = level === 'platform';
    if (!isPlatform && !tenantId) {
      throw new BadRequestException(
        "Debes indicar tenantId (por empresa) o level=platform (plataforma).",
      );
    }
    const target = isPlatform ? { level: 'platform' as const } : { tenantId };
    const url = this.oauth.buildAuthUrl(target, type);
    return { data: { url } };
  }

  /**
   * Callback público al que Google redirige el navegador tras el consentimiento.
   * Intercambia el `code`, guarda los tokens y responde un HTML simple.
   * Pública porque la petición la inicia el navegador del usuario tras el consent.
   */
  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    res.type('html');
    try {
      if (error) {
        throw new Error(`Google devolvió un error: ${error}`);
      }
      if (!code || !state) {
        throw new Error('Faltan parámetros "code" o "state" en el callback.');
      }

      const parsed = this.oauth.parseState(state);
      const tokens = await this.oauth.exchangeCode(code);

      // Modelo B (plataforma): target null. Modelo A (empresa): target tenantId.
      const target =
        parsed.level === 'platform' ? null : parsed.tenantId ?? null;

      await this.integrations.saveGoogleTokens(target, parsed.type, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });

      return res.send(this.successHtml());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`callback() falló: ${message}`);
      return res.status(400).send(this.errorHtml(message));
    }
  }

  /** HTML de éxito mostrado en la ventana del navegador. */
  private successHtml(): string {
    return '<html><body><h2>✅ Google conectado. Ya puedes cerrar esta ventana.</h2></body></html>';
  }

  /** HTML de error (no expone secretos, solo el mensaje legible). */
  private errorHtml(message: string): string {
    const safe = String(message).replace(/[<>]/g, '');
    return `<html><body><h2>❌ No se pudo conectar Google.</h2><p>${safe}</p></body></html>`;
  }
}
