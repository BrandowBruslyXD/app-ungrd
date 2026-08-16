import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';

import { ErrorCode } from '../../common/errors/error-codes';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: string;
  tokenVersion: number;
  sessionId: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
  sessionId: string;
  /** Nonce rotativo del refresh; detecta reutilización de tokens viejos. */
  refreshId: string;
  type: 'refresh';
}

export interface PublicUser {
  id: string;
  username: string;
  email: string | null;
  name: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

/** Ventana en la que una sesión existente se considera todavía activa. */
const SESSION_ACTIVE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Inactividad máxima: si no hay actividad en este tiempo, la sesión se cierra
 * automáticamente (aunque el navegador esté cerrado). Configurable con
 * SESSION_IDLE_MINUTES (default 15).
 */
export const SESSION_IDLE_MS =
  Number(process.env.SESSION_IDLE_MINUTES ?? 15) * 60 * 1000;

/**
 * Ventana de GRACIA del nonce anterior del refresh. Las pestañas de un mismo
 * navegador comparten el token (localStorage), así que la única carrera
 * legítima con el nonce viejo dura segundos (dos pestañas renovando a la vez).
 * Fuera de esta ventana, un nonce viejo = token robado → sesión revocada.
 * Configurable con REFRESH_GRACE_SECONDS (default 60).
 */
const REFRESH_PREV_GRACE_MS =
  Number(process.env.REFRESH_GRACE_SECONDS ?? 60) * 1000;

/** Intentos fallidos permitidos antes de penalizar. */
const MAX_LOGIN_ATTEMPTS = 5;
/**
 * Bloqueo con BACKOFF: la penalización crece con la cantidad de bloqueos
 * acumulados (cada tanda de MAX_LOGIN_ATTEMPTS fallos). Frena la fuerza bruta
 * de forma creciente en lugar de un castigo fijo y corto.
 * bloqueos 1→30s, 2→2m, 3→10m, 4→30m, 5+→60m (tope).
 */
const LOCK_BACKOFF_MS = [30_000, 120_000, 600_000, 1_800_000, 3_600_000];

type AdminRecord = {
  id: string;
  username: string;
  email: string | null;
  name: string;
  role: string;
  isActive: boolean;
  tokenVersion: number;
  passwordHash: string;
  sessionId: string | null;
  sessionRefreshId: string | null;
  sessionRefreshPrevId: string | null;
  sessionRefreshRotatedAt: Date | null;
  sessionUa: string | null;
  sessionIp: string | null;
  sessionCreatedAt: Date | null;
  sessionLastSeenAt: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
};

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;
  // Tipo de jsonwebtoken v9 ('7d', '15m'...); el valor viene del env.
  private readonly refreshExpiresIn: JwtSignOptions['expiresIn'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {
    this.refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.refreshExpiresIn = (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ??
      '7d') as JwtSignOptions['expiresIn'];
  }

  /**
   * Valida las credenciales y abre una sesión ÚNICA atada al dispositivo. Si el
   * usuario ya tiene una sesión activa en otro dispositivo y `force` es falso,
   * lanza 409 con los datos de esa sesión para que el panel pida confirmación;
   * con `force` la reemplaza (desconectando el dispositivo anterior).
   */
  async login(
    username: string,
    password: string,
    userAgent: string,
    force: boolean,
    ip?: string,
  ): Promise<TokenPair> {
    const user = (await this.prisma.adminUser.findUnique({ where: { username } })) as AdminRecord | null;
    if (!user || !user.isActive) {
      await argon2.hash(password).catch(() => undefined);
      throw new UnauthorizedException({
        message: 'Credenciales inválidas',
        code: ErrorCode.AUTH_BAD_CREDENTIALS,
      });
    }

    // Bloqueo por cuenta: si sigue penalizado, rechaza indicando los segundos restantes.
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw this.lockedError(user.lockedUntil);
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      await this.registerFailedAttempt(user);
      throw new UnauthorizedException({
        message: 'Credenciales inválidas',
        code: ErrorCode.AUTH_BAD_CREDENTIALS,
      });
    }

    if (!force && this.hasActiveSession(user) && user.sessionUa !== userAgent) {
      throw new ConflictException({
        message: 'Ya hay una sesión activa en otro dispositivo',
        code: ErrorCode.AUTH_SESSION_CONFLICT,
        activeSession: {
          device: this.deviceLabel(user.sessionUa),
          ip: user.sessionIp || null,
          since: user.sessionCreatedAt,
        },
      });
    }

    return this.openSession(user, userAgent, ip);
  }

  /**
   * Renovación deslizante: valida el refresh token, que la sesión siga siendo la
   * vigente y que provenga del mismo dispositivo; emite un par nuevo.
   */
  async refresh(refreshToken: string, userAgent: string): Promise<TokenPair> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.refreshSecret,
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException({
        message: 'Refresh token inválido o expirado',
        code: ErrorCode.AUTH_REFRESH_INVALID,
      });
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException({
        message: 'Tipo de token inválido',
        code: ErrorCode.AUTH_REFRESH_INVALID,
      });
    }

    const user = (await this.prisma.adminUser.findUnique({ where: { id: payload.sub } })) as AdminRecord | null;
    if (
      !user ||
      !user.isActive ||
      user.tokenVersion !== payload.tokenVersion ||
      user.sessionId !== payload.sessionId ||
      user.sessionUa !== userAgent
    ) {
      throw new UnauthorizedException({
        message: 'Sesión inválida o revocada',
        code: ErrorCode.AUTH_SESSION_REVOKED,
      });
    }

    // DETECCIÓN DE REUTILIZACIÓN: el nonce del refresh rota en cada renovación.
    // Se acepta el nonce VIGENTE, o el ANTERIOR solo dentro de una ventana
    // CORTA tras la rotación (gracia para dos pestañas que renuevan casi a la
    // vez; comparten localStorage, la carrera dura segundos). Cualquier otro
    // nonce —o el anterior fuera de la ventana— = token viejo reusado o robado
    // → se INVALIDA la sesión entera (atacante y legítimo deben reautenticarse).
    const matchesCurrent = !!user.sessionRefreshId && user.sessionRefreshId === payload.refreshId;
    const rotatedAt = user.sessionRefreshRotatedAt
      ? new Date(user.sessionRefreshRotatedAt).getTime()
      : 0;
    const withinGrace = rotatedAt > 0 && Date.now() - rotatedAt <= REFRESH_PREV_GRACE_MS;
    const matchesPrev =
      !!user.sessionRefreshPrevId &&
      user.sessionRefreshPrevId === payload.refreshId &&
      withinGrace;
    if (!matchesCurrent && !matchesPrev) {
      await this.invalidateSession(user.id);
      this.events.emit('session.revoked', {
        sessionId: user.sessionId,
        reason: 'Su sesión se cerró por seguridad.',
      });
      throw new UnauthorizedException({
        message: 'Sesión revocada por reutilización de token',
        code: ErrorCode.AUTH_SESSION_REUSE,
      });
    }

    // Cierre por INACTIVIDAD: si pasó la ventana sin actividad, invalida la
    // sesión (limpia el sessionId) y rechaza; hay que volver a iniciar sesión.
    const last = user.sessionLastSeenAt ? new Date(user.sessionLastSeenAt).getTime() : 0;
    if (last && Date.now() - last > SESSION_IDLE_MS) {
      await this.invalidateSession(user.id);
      this.events.emit('session.revoked', {
        sessionId: user.sessionId,
        reason: 'Su sesión se cerró por inactividad.',
      });
      throw new UnauthorizedException({
        message: 'Sesión cerrada por inactividad',
        code: ErrorCode.AUTH_SESSION_IDLE,
      });
    }

    // ROTACIÓN solo cuando el refresh presentó el nonce VIGENTE: el actual pasa
    // a `prev` (gracia) y se genera uno nuevo. Si vino con el `prev` (renovación
    // concurrente ya rotada por otra pestaña), NO se rota otra vez: se reemiten
    // los tokens del nonce vigente para converger sin ping-pong.
    let rotated = user;
    if (matchesCurrent) {
      rotated = (await this.prisma.adminUser.update({
        where: { id: user.id },
        data: {
          sessionRefreshPrevId: user.sessionRefreshId,
          sessionRefreshId: randomBytes(16).toString('hex'),
          sessionRefreshRotatedAt: new Date(), // arranca la ventana de gracia
          sessionLastSeenAt: new Date(),
        },
      })) as AdminRecord;
    } else {
      rotated = (await this.prisma.adminUser.update({
        where: { id: user.id },
        data: { sessionLastSeenAt: new Date() },
      })) as AdminRecord;
    }
    return this.issueTokens(rotated);
  }

  /** Limpia por completo la sesión activa del usuario (todos los campos). */
  private async invalidateSession(userId: string): Promise<void> {
    await this.prisma.adminUser.update({
      where: { id: userId },
      data: {
        sessionId: null,
        sessionRefreshId: null,
        sessionRefreshPrevId: null,
        sessionRefreshRotatedAt: null,
        sessionUa: null,
        sessionIp: null,
        sessionCreatedAt: null,
        sessionLastSeenAt: null,
      },
    });
  }

  /** Cierra la sesión activa del usuario (queda desconectado en su dispositivo). */
  async logout(userId: string): Promise<void> {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      select: { sessionId: true },
    });
    await this.invalidateSession(userId);
    // Corta al instante el socket de esa sesión (deja de recibir QR/estado).
    if (user?.sessionId) {
      this.events.emit('session.revoked', {
        sessionId: user.sessionId,
        reason: 'Su sesión se cerró.',
      });
    }
  }

  /**
   * Devuelve el admin autenticado con una ALLOW-LIST explícita de campos
   * públicos. Nunca expone secretos de servidor (sessionId), hash, ni
   * contadores internos (failedLoginAttempts, lockedUntil, tokenVersion).
   */
  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, name: true, role: true },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return user;
  }

  private hasActiveSession(user: AdminRecord): boolean {
    if (!user.sessionId || !user.sessionCreatedAt) return false;
    return Date.now() - new Date(user.sessionCreatedAt).getTime() < SESSION_ACTIVE_MS;
  }

  /**
   * Suma un intento fallido. Cada tanda de MAX_LOGIN_ATTEMPTS fallos penaliza la
   * cuenta con BACKOFF creciente (30s → 2m → 10m → 30m → 60m). El contador NO se
   * reintenta a 0 al bloquear (así el nivel de castigo escala); solo se limpia en
   * un login exitoso (openSession). Timing homogéneo: siempre verifica argon2 antes.
   */
  private async registerFailedAttempt(user: AdminRecord): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    if (attempts % MAX_LOGIN_ATTEMPTS === 0) {
      const level = attempts / MAX_LOGIN_ATTEMPTS; // 1, 2, 3, ...
      const penalty = LOCK_BACKOFF_MS[Math.min(level - 1, LOCK_BACKOFF_MS.length - 1)];
      const lockedUntil = new Date(Date.now() + penalty);
      await this.prisma.adminUser.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, lockedUntil },
      });
      throw this.lockedError(lockedUntil);
    }
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { failedLoginAttempts: attempts },
    });
  }

  /** Error 429 con el tiempo restante de penalización (segundos o minutos). */
  private lockedError(lockedUntil: Date): HttpException {
    const secs = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000));
    const human = secs >= 60 ? `${Math.ceil(secs / 60)} minuto(s)` : `${secs} segundos`;
    return new HttpException(
      {
        message: `Demasiados intentos fallidos. Espera ${human} e inténtalo de nuevo.`,
        code: ErrorCode.AUTH_LOCKED,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /** Registra una sesión nueva (reemplazando cualquier anterior) y emite tokens. */
  private async openSession(user: AdminRecord, userAgent: string, ip?: string): Promise<TokenPair> {
    // Sesión anterior que se está reemplazando (para expulsarla al instante).
    const previousSessionId = user.sessionId;
    const sessionId = randomBytes(24).toString('hex');
    const updated = (await this.prisma.adminUser.update({
      where: { id: user.id },
      data: {
        sessionId,
        sessionRefreshId: randomBytes(16).toString('hex'),
        // Sesión nueva = nonces de la anterior fuera de juego (higiene).
        sessionRefreshPrevId: null,
        sessionRefreshRotatedAt: new Date(),
        sessionUa: userAgent,
        sessionIp: ip || null,
        sessionCreatedAt: new Date(),
        sessionLastSeenAt: new Date(),
        lastLoginAt: new Date(),
        // Login exitoso: limpia cualquier penalización o contador de fallos.
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })) as AdminRecord;
    // Expulsión INSTANTÁNEA del dispositivo anterior vía WebSocket (evento
    // desacoplado que escucha el gateway). Si no había sesión previa, no hace nada.
    if (previousSessionId && previousSessionId !== sessionId) {
      this.events.emit('session.revoked', { sessionId: previousSessionId });
    }
    return this.issueTokens(updated);
  }

  private async issueTokens(user: AdminRecord): Promise<TokenPair> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion,
      sessionId: user.sessionId as string,
      type: 'access',
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenVersion: user.tokenVersion,
      sessionId: user.sessionId as string,
      refreshId: user.sessionRefreshId as string,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload),
      this.jwt.signAsync(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /** Etiqueta legible del dispositivo a partir del User-Agent (para el overlay). */
  private deviceLabel(ua: string | null): string {
    if (!ua) return 'dispositivo desconocido';
    const browser = /Edg/.test(ua)
      ? 'Edge'
      : /Chrome/.test(ua)
        ? 'Chrome'
        : /Firefox/.test(ua)
          ? 'Firefox'
          : /Safari/.test(ua)
            ? 'Safari'
            : 'navegador';
    const os = /Windows/.test(ua)
      ? 'Windows'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad|iOS/.test(ua)
          ? 'iOS'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'macOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'sistema';
    return `${browser} en ${os}`;
  }
}
