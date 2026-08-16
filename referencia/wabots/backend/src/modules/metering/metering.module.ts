import { Module } from '@nestjs/common';
import { AiUsageService } from './ai-usage.service';
import { CreditService } from './credit.service';
import { MeteringController } from './metering.controller';

/**
 * Módulo de METERING de consumo de IA y SALDO PREPAGO por cliente (tenant).
 * PrismaModule es @Global, por eso no hace falta importarlo aquí.
 * Exporta AiUsageService para que IntegrationsService registre el consumo.
 */
@Module({
  providers: [AiUsageService, CreditService],
  controllers: [MeteringController],
  exports: [AiUsageService, CreditService],
})
export class MeteringModule {}
