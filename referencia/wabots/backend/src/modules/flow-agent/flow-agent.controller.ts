import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FlowGraph } from '../../common/types/engine.types';
import { BuilderMessage, BuilderLlm, FlowAgentService } from './flow-agent.service';
import { RUBRO_TEMPLATES } from './flow-templates';

/**
 * API del agente constructor de flujos.
 * POST /flow-agent/build     → arma/edita un grafo a partir de una instrucción NL.
 * POST /flow-agent/templates → plantillas por rubro (punto de partida para el UI).
 */
@UseGuards(JwtAuthGuard)
@Controller('flow-agent')
export class FlowAgentController {
  constructor(private readonly agent: FlowAgentService) {}

  // Throttle estricto: cada build consume tokens de LLM (coste). Limita ráfagas.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post('build')
  async build(
    @Body()
    body: {
      graph?: FlowGraph;
      message: string;
      history?: BuilderMessage[];
      llm?: Partial<BuilderLlm>;
      context?: { tenantName?: string; flowName?: string };
      mode?: 'fast' | 'expert';
    },
  ) {
    const data = await this.agent.build({
      graph: body?.graph,
      message: body?.message ?? '',
      history: body?.history,
      llm: body?.llm,
      context: body?.context,
      mode: body?.mode,
    });
    return { data };
  }

  // Plantillas por rubro (estilo Dapta): el UI las ofrece como punto de partida.
  @Post('templates')
  templates() {
    return { data: RUBRO_TEMPLATES };
  }
}
