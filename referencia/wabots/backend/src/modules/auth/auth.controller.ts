import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

import { Public } from '../../common/decorators/public.decorator';

/**
 * IP REAL del cliente detrás de Traefik + nginx. req.ip devuelve la IP interna
 * de Docker, así que se toma la primera entrada de X-Forwarded-For (el cliente
 * original). Es informativa (se muestra en el overlay), no un control de seguridad.
 */
function clientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  const first = Array.isArray(xff) ? xff[0] : (xff || '').split(',')[0];
  return (first || req.ip || '').trim().replace(/^::ffff:/, '');
}
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Autentica al admin y abre una sesión única atada al dispositivo. Si ya hay
   * sesión activa en otro equipo y no llega `force`, responde 409 para que el
   * panel confirme el reemplazo. Límite: 5 intentos/min.
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  // Tope por IP alto (solo anti-flooding). El gate real es el bloqueo POR USUARIO
  // (5 intentos → 30s), que se comprueba en el servicio y devuelve en cada
  // reintento los segundos restantes; este tope no debe taparlo.
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Req() req: Request,
  ) {
    return {
      data: await this.authService.login(
        dto.username,
        dto.password,
        userAgent ?? '',
        !!dto.force,
        clientIp(req),
      ),
    };
  }

  /** Renueva el par de tokens (revalida sesión y dispositivo). */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Headers('user-agent') userAgent: string) {
    return { data: await this.authService.refresh(dto.refreshToken, userAgent ?? '') };
  }

  /** Cierra la sesión activa del admin. */
  @Post('logout')
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logout(user.id);
    return { data: { ok: true } };
  }

  /** Devuelve el admin autenticado. */
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.authService.me(user.id) };
  }
}
