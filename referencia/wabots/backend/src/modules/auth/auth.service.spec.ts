import {
  ConflictException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { AuthService, RefreshTokenPayload } from './auth.service';
import { ErrorCode } from '../../common/errors/error-codes';
import { PrismaService } from '../../common/prisma/prisma.service';

// argon2 mockeado: evita el hashing real (nativo y lento) en cada test.
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hash-falso'),
  verify: jest.fn(),
}));

const argonVerify = argon2.verify as jest.Mock;
const UA = 'Mozilla/5.0 (Windows) Chrome/120';

/** Usuario admin base, con sesión activa en este mismo dispositivo. */
function buildUser(overrides: Record<string, any> = {}) {
  return {
    id: 'u1',
    username: 'admin',
    email: 'admin@test.local',
    name: 'Admin',
    role: 'OWNER',
    isActive: true,
    tokenVersion: 1,
    passwordHash: 'hash-guardado',
    sessionId: 'sess-1',
    sessionRefreshId: 'nonce-actual',
    sessionRefreshPrevId: 'nonce-anterior',
    sessionRefreshRotatedAt: new Date(),
    sessionUa: UA,
    sessionIp: '1.2.3.4',
    sessionCreatedAt: new Date(),
    sessionLastSeenAt: new Date(),
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

/** Payload de refresh como si el JWT ya hubiera verificado. */
function refreshPayload(overrides: Partial<RefreshTokenPayload> = {}): RefreshTokenPayload {
  return {
    sub: 'u1',
    tokenVersion: 1,
    sessionId: 'sess-1',
    refreshId: 'nonce-actual',
    type: 'refresh',
    ...overrides,
  };
}

describe('AuthService', () => {
  let prisma: { adminUser: { findUnique: jest.Mock; update: jest.Mock } };
  let jwt: { verifyAsync: jest.Mock; signAsync: jest.Mock };
  let events: { emit: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      adminUser: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    jwt = {
      verifyAsync: jest.fn(),
      signAsync: jest.fn().mockResolvedValue('token-firmado'),
    };
    events = { emit: jest.fn() };
    const config = {
      getOrThrow: () => 'x'.repeat(64),
      get: () => '7d',
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      events as unknown as EventEmitter2,
    );
  });

  describe('login', () => {
    it('usuario inexistente → UnauthorizedException', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(service.login('nadie', 'pw', UA, false)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      // Timing homogéneo: aun sin usuario se paga un hash de argon2.
      expect(argon2.hash).toHaveBeenCalled();
    });

    it('password malo → registra intento fallido y lanza 401', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(buildUser());
      prisma.adminUser.update.mockResolvedValue({});
      argonVerify.mockResolvedValue(false);

      await expect(service.login('admin', 'mala', UA, false)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      // El fallo quedó contabilizado en la BD.
      expect(prisma.adminUser.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { failedLoginAttempts: 1 },
      });
    });

    it('al 5º fallo → HttpException 429 con lockedUntil', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(
        buildUser({ failedLoginAttempts: 4 }),
      );
      prisma.adminUser.update.mockResolvedValue({});
      argonVerify.mockResolvedValue(false);

      let capturado: unknown;
      try {
        await service.login('admin', 'mala', UA, false);
      } catch (err) {
        capturado = err;
      }

      expect(capturado).toBeInstanceOf(HttpException);
      expect((capturado as HttpException).getStatus()).toBe(429);
      expect(((capturado as HttpException).getResponse() as any).code).toBe(
        ErrorCode.AUTH_LOCKED,
      );
      // La penalización quedó persistida junto al contador.
      expect(prisma.adminUser.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { failedLoginAttempts: 5, lockedUntil: expect.any(Date) },
      });
    });

    it('sesión activa de OTRO user-agent sin force → ConflictException', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(
        buildUser({ sessionUa: 'Mozilla/5.0 (Android) Firefox/119' }),
      );
      argonVerify.mockResolvedValue(true);

      await expect(service.login('admin', 'buena', UA, false)).rejects.toBeInstanceOf(
        ConflictException,
      );
      // No se abrió sesión nueva (no hubo update).
      expect(prisma.adminUser.update).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('con el nonce vigente → rota (sessionRefreshId nuevo y sessionRefreshRotatedAt)', async () => {
      const user = buildUser();
      prisma.adminUser.findUnique.mockResolvedValue(user);
      prisma.adminUser.update.mockResolvedValue(buildUser());
      jwt.verifyAsync.mockResolvedValue(refreshPayload());

      const pair = await service.refresh('rt', UA);

      expect(pair.accessToken).toBe('token-firmado');
      expect(prisma.adminUser.update).toHaveBeenCalledTimes(1);
      const data = prisma.adminUser.update.mock.calls[0][0].data;
      // Rotación: el vigente pasa a prev y nace un nonce nuevo.
      expect(data.sessionRefreshPrevId).toBe('nonce-actual');
      expect(typeof data.sessionRefreshId).toBe('string');
      expect(data.sessionRefreshId).not.toBe('nonce-actual');
      expect(data.sessionRefreshRotatedAt).toBeInstanceOf(Date);
    });

    it('con el nonce anterior DENTRO de la ventana de gracia → acepta sin rotar', async () => {
      const user = buildUser({ sessionRefreshRotatedAt: new Date() });
      prisma.adminUser.findUnique.mockResolvedValue(user);
      prisma.adminUser.update.mockResolvedValue(buildUser());
      jwt.verifyAsync.mockResolvedValue(refreshPayload({ refreshId: 'nonce-anterior' }));

      const pair = await service.refresh('rt', UA);

      expect(pair.refreshToken).toBe('token-firmado');
      // Solo se refresca la actividad; NO hay rotación de nonces.
      expect(prisma.adminUser.update).toHaveBeenCalledTimes(1);
      const data = prisma.adminUser.update.mock.calls[0][0].data;
      expect(data).toEqual({ sessionLastSeenAt: expect.any(Date) });
    });

    it('con el nonce anterior FUERA de la ventana → invalida sesión y 401', async () => {
      const user = buildUser({
        sessionRefreshRotatedAt: new Date(Date.now() - 10 * 60 * 1000), // hace 10 min
      });
      prisma.adminUser.findUnique.mockResolvedValue(user);
      prisma.adminUser.update.mockResolvedValue({});
      jwt.verifyAsync.mockResolvedValue(refreshPayload({ refreshId: 'nonce-anterior' }));

      let capturado: unknown;
      try {
        await service.refresh('rt', UA);
      } catch (err) {
        capturado = err;
      }

      expect(capturado).toBeInstanceOf(UnauthorizedException);
      expect(((capturado as HttpException).getResponse() as any).code).toBe(
        ErrorCode.AUTH_SESSION_REUSE,
      );
      // La sesión entera queda limpia (nonce viejo = posible token robado).
      expect(prisma.adminUser.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({ sessionId: null, sessionRefreshId: null }),
      });
      expect(events.emit).toHaveBeenCalledWith(
        'session.revoked',
        expect.objectContaining({ sessionId: 'sess-1' }),
      );
    });

    it('con un nonce desconocido → invalida sesión (sessionId null) y 401', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(buildUser());
      prisma.adminUser.update.mockResolvedValue({});
      jwt.verifyAsync.mockResolvedValue(refreshPayload({ refreshId: 'nonce-robado' }));

      await expect(service.refresh('rt', UA)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.adminUser.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({ sessionId: null }),
      });
    });

    it('con la sesión inactiva (última actividad hace 1 hora) → 401 por inactividad', async () => {
      const user = buildUser({
        sessionLastSeenAt: new Date(Date.now() - 60 * 60 * 1000), // hace 1 h
      });
      prisma.adminUser.findUnique.mockResolvedValue(user);
      prisma.adminUser.update.mockResolvedValue({});
      jwt.verifyAsync.mockResolvedValue(refreshPayload());

      let capturado: unknown;
      try {
        await service.refresh('rt', UA);
      } catch (err) {
        capturado = err;
      }

      expect(capturado).toBeInstanceOf(UnauthorizedException);
      expect(((capturado as HttpException).getResponse() as any).code).toBe(
        ErrorCode.AUTH_SESSION_IDLE,
      );
      // Se limpió la sesión: hay que volver a iniciar sesión.
      expect(prisma.adminUser.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({ sessionId: null }),
      });
    });
  });
});
