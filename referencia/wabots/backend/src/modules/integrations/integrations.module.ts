import { Module } from '@nestjs/common';
import { MeteringModule } from '../metering/metering.module';
import { DeepseekWebModule } from '../deepseek-web/deepseek-web.module';
import { IntegrationsService } from './integrations.service';
import {
  IntegrationsController,
  TenantIntegrationsController,
} from './integrations.controller';
import { GoogleOAuthController } from './google-oauth.controller';
import { ServiceAccountController } from './service-account.controller';
import { AiAdminController } from './ai-admin.controller';
import { CalendarViewController } from './calendar-view.controller';
import { AiApiService } from './services/ai-api.service';
import { GmailService } from './services/gmail.service';
import { CalendarService } from './services/calendar.service';
import { HttpRequestService } from './services/http.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { IntegrationResolverService } from './services/integration-resolver.service';
import { IntegrationConfigService } from './services/integration-config.service';
import { AiRunnerService } from './services/ai-runner.service';
import { GmailRunnerService } from './services/gmail-runner.service';
import { CalendarRunnerService } from './services/calendar-runner.service';

/**
 * Módulo de integraciones externas por tenant (IA, Gmail, Calendar, HTTP).
 * Exporta IntegrationsService para que el motor (engine) lo inyecte y use
 * runForEngine como punto único de ejecución.
 *
 * Incluye además el flujo OAuth2 de Google (GoogleOAuthService + controller).
 */
@Module({
  imports: [MeteringModule, DeepseekWebModule],
  controllers: [
    TenantIntegrationsController,
    IntegrationsController,
    GoogleOAuthController,
    ServiceAccountController,
    AiAdminController,
    CalendarViewController,
  ],
  providers: [
    IntegrationsService,
    IntegrationResolverService,
    IntegrationConfigService,
    AiRunnerService,
    GmailRunnerService,
    CalendarRunnerService,
    AiApiService,
    GmailService,
    CalendarService,
    HttpRequestService,
    GoogleOAuthService,
  ],
  exports: [IntegrationsService, GoogleOAuthService, HttpRequestService],
})
export class IntegrationsModule {}
