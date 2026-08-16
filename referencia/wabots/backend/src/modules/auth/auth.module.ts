import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { SessionCleanupService } from './session-cleanup.service';

@Module({
  imports: [
    PassportModule,
    // Secreto y expiración del ACCESS token (el refresh usa su propio secreto,
    // gestionado en AuthService).
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // jsonwebtoken v9 tipa expiresIn como StringValue de `ms` ('15m',
          // '7d'...); el valor viene del env como string plano → cast.
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '15m') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, SessionCleanupService],
  exports: [AuthService],
})
export class AuthModule {}
