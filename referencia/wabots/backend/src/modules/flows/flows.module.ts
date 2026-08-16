import { Module } from '@nestjs/common';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';

/**
 * Módulo de flujos: CRUD de flujos y plantillas.
 * Exporta FlowsService para que otros módulos (engine) lo inyecten.
 */
@Module({
  controllers: [FlowsController],
  providers: [FlowsService],
  exports: [FlowsService],
})
export class FlowsModule {}
