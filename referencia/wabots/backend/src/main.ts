import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';

/** Aborta el arranque si falta un secreto obligatorio o es demasiado débil. */
function assertRequiredSecrets(): void {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'];
  const weak = required.filter((name) => (process.env[name] ?? '').length < 32);
  if (weak.length > 0) {
    throw new Error(
      `Secretos ausentes o débiles (mínimo 32 caracteres): ${weak.join(', ')}. ` +
        'Genera cada uno con: openssl rand -hex 32',
    );
  }
}

async function bootstrap(): Promise<void> {
  assertRequiredSecrets();

  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');
  // Cadena real de proxies: cliente → Traefik → nginx → backend (2 saltos de
  // confianza). 'trust proxy' = 2 hace que req.ip resuelva al CLIENTE real
  // (Express cuenta 2 hops desde la derecha e ignora entradas X-Forwarded-For
  // falsificadas por el cliente a la izquierda). Es lo que usa el rate-limit
  // por IP (ThrottlerGuard) y los logs: con un valor incorrecto, todos los
  // clientes compartirían una IP interna de Docker y el límite por-IP sería un
  // único cubo global.
  app.getHttpAdapter().getInstance().set('trust proxy', 2);

  app.use(helmet());
  // Guarda el cuerpo CRUDO (para validar la firma HMAC del webhook de Meta,
  // que se calcula sobre los bytes exactos del payload).
  app.use(
    json({
      limit: '12mb', // media en base64 desde webhooks
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(urlencoded({ extended: true, limit: '12mb' }));
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  logger.log(`Backend escuchando en http://localhost:${port}/api`);
}

void bootstrap();
