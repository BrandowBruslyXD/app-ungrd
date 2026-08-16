import { Module } from '@nestjs/common';

import { MeteringModule } from '../metering/metering.module';
import { DeepseekWebModule } from '../deepseek-web/deepseek-web.module';
import { FlowAgentController } from './flow-agent.controller';
import { FlowAgentService } from './flow-agent.service';

/** Módulo del agente constructor de flujos (IA que arma bots por instrucción NL). */
@Module({
  imports: [MeteringModule, DeepseekWebModule],
  controllers: [FlowAgentController],
  providers: [FlowAgentService],
  exports: [FlowAgentService],
})
export class FlowAgentModule {}
