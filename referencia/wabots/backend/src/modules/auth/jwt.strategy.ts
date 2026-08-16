import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../common/prisma/prisma.service';
import { AccessTokenPayload, SESSION_IDLE_MS } from './auth.service';

/** Solo se reescribe sessionLastSeenAt si pasó este tiempo (evita 1 write/request). */
const TOUCH_THROTTLE_MS = 60 * 1000;

/**
 * Estrategia 'jwt' del panel: valida la firma del access token y revalida contra
 * la base de datos que el admin exista, esté activo, que la versión del token y
 * la sesión coincidan (sesión única) y que provenga del mismo dispositivo
 * (User-Agent). Así un token copiado a otro equipo, o de una sesión reemplazada
 * al iniciar en otro dispositivo, queda rechazado al instante.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'], // fija el algoritmo (evita confusión de algoritmo)
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: AccessTokenPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Tipo de token inválido');
    }

    const user = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        tokenVersion: true,
        sessionId: true,
        sessionUa: true,
        sessionLastSeenAt: true,
      },
    });

    const userAgent = req.headers['user-agent'] ?? '';
    if (
      !user ||
      !user.isActive ||
      user.tokenVersion !== payload.tokenVersion ||
      user.sessionId !== payload.sessionId ||
      user.sessionUa !== userAgent
    ) {
      throw new UnauthorizedException('Sesión inválida o revocada');
    }

    // Cierre por INACTIVIDAD: si la última actividad supera la ventana, invalida
    // la sesión (limpia el sessionId) y rechaza el token en el acto.
    const last = user.sessionLastSeenAt ? user.sessionLastSeenAt.getTime() : 0;
    const now = Date.now();
    if (last && now - last > SESSION_IDLE_MS) {
      await this.prisma.adminUser.update({
        where: { id: user.id },
        data: { sessionId: null, sessionUa: null, sessionIp: null, sessionCreatedAt: null, sessionLastSeenAt: null },
      });
      throw new UnauthorizedException('Sesión cerrada por inactividad');
    }

    // Refresca la marca de actividad (con throttle para no escribir en cada request).
    if (!last || now - last > TOUCH_THROTTLE_MS) {
      await this.prisma.adminUser.update({
        where: { id: user.id },
        data: { sessionLastSeenAt: new Date() },
      });
    }

    return { id: user.id, username: user.username, role: user.role };
  }
}
