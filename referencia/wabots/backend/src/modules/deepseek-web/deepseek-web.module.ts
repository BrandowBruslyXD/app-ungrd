import { Module } from '@nestjs/common';

import { DeepseekAccountService } from './deepseek-account.service';
import { DeepseekAdminController } from './deepseek-admin.controller';
import { DeepseekPanelController } from './deepseek-panel.controller';
import { DeepseekWebRunnerService } from './deepseek-web-runner.service';
import { DeepseekWebService } from './deepseek-web.service';

/**
 * Proveedor DeepSeek-web (sesión web, sin API key). AISLADO del resto. Prisma y
 * Crypto son @Global, así que no se importan. Exporta el runner y el servicio
 * de cuentas para que ai-runner (y el seed) los usen. El controller expone la
 * sincronización del bearer desde el daemon externo (token M2M).
 */
@Module({
  controllers: [DeepseekAdminController, DeepseekPanelController],
  providers: [DeepseekWebService, DeepseekAccountService, DeepseekWebRunnerService],
  exports: [DeepseekWebService, DeepseekAccountService, DeepseekWebRunnerService],
})
export class DeepseekWebModule {}
