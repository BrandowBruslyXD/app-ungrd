import { Injectable } from '@nestjs/common';
import {
  ExecutionContext,
  FlowNode,
  NodeExecutor,
  NodeResult,
  NodeType,
} from '../../../common/types/engine.types';

/** Disparador: punto de entrada del flujo. Continúa por 'out'. */
@Injectable()
export class TriggerExecutor implements NodeExecutor {
  readonly type: NodeType = 'trigger';

  async execute(_node: FlowNode, _ctx: ExecutionContext): Promise<NodeResult> {
    return { nextHandle: 'out' };
  }
}
