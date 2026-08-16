import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HealthController } from './common/health/health.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AdminSeedService } from './common/seed/admin-seed.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { CryptoModule } from './common/crypto/crypto.module';

import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { FlowsModule } from './modules/flows/flows.module';
import { EngineModule } from './modules/engine/engine.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { MeteringModule } from './modules/metering/metering.module';
import { EmailAgentModule } from './modules/email-agent/email-agent.module';
import { LogsModule } from './modules/logs/logs.module';
import { FlowAgentModule } from './modules/flow-agent/flow-agent.module';
import { RemindersModule } from './modules/reminders/reminders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    // Rate-limit base por IP; el login/refresh aplican límites más estrictos.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
    PrismaModule,
    CryptoModule,
    AuthModule,
    TenantsModule,
    WhatsappModule,
    FlowsModule,
    EngineModule,
    ConversationsModule,
    IntegrationsModule,
    MeteringModule,
    EmailAgentModule,
    LogsModule,
    FlowAgentModule,
    RemindersModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Guards globales (orden de ejecución): rate-limit → JWT (fail-closed,
    // salvo @Public) → roles (@Roles).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Siembra idempotente del admin al arrancar.
    AdminSeedService,
  ],
})
export class AppModule {}
