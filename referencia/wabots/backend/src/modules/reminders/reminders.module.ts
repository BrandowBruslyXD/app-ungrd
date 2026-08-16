import { Module } from '@nestjs/common';

import { IntegrationsModule } from '../integrations/integrations.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { RemindersService } from './reminders.service';

/**
 * Módulo de recordatorios de cita. Un cron (RemindersService) entrega los
 * recordatorios cuando llega su hora, decidiendo con IA si enviarlos.
 * (PrismaModule y CryptoModule son globales — ver AppModule.)
 */
@Module({
  imports: [WhatsappModule, IntegrationsModule],
  providers: [RemindersService],
})
export class RemindersModule {}
