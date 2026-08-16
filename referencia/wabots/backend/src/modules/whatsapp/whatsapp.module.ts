import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { EvolutionService } from './evolution.service';
import { TwilioService } from './twilio.service';
import { TwilioWebhookController } from './twilio-webhook.controller';
import { MetaService } from './meta.service';
import { MetaWebhookController } from './meta-webhook.controller';
import { WebhooksController } from './webhooks.controller';
import { WhatsappGateway } from './whatsapp.gateway';
import { WhatsappService } from './whatsapp.service';

/**
 * Módulo de WhatsApp: integración con Evolution API + canal Twilio,
 * webhooks y gateway socket.io.
 * Exporta WhatsappService para que lo consuman tenants y engine.
 * (PrismaModule, CryptoModule, ConfigModule y EventEmitterModule son globales — ver AppModule.)
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [WebhooksController, TwilioWebhookController, MetaWebhookController],
  providers: [EvolutionService, TwilioService, MetaService, WhatsappService, WhatsappGateway],
  exports: [WhatsappService, TwilioService, MetaService],
})
export class WhatsappModule {}
