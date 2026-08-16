import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { EmailAgentService } from './email-agent.service';

/**
 * Módulo del AGENTE DE CORREO. Registra el poller que revisa los correos no
 * leídos de los tenants con el agente habilitado y actúa con IA + Calendar/Gmail.
 *
 * Depende de IntegrationsModule (para runForEngine) y de PrismaService (global).
 * ScheduleModule.forRoot() ya está importado en AppModule, así que el @Cron
 * del servicio se activa automáticamente.
 */
@Module({
  imports: [IntegrationsModule],
  providers: [EmailAgentService],
})
export class EmailAgentModule {}
