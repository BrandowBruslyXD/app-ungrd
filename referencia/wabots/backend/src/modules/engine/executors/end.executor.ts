import { Injectable } from '@nestjs/common';
import {
  ExecutionContext,
  FlowNode,
  NodeExecutor,
  NodeResult,
  NodeType,
} from '../../../common/types/engine.types';

/** Fin del flujo. Cierra la conversación. */
@Injectable()
export class EndExecutor implements NodeExecutor {
  readonly type: NodeType = 'end';

  async execute(_node: FlowNode, _ctx: ExecutionContext): Promise<NodeResult> {
    return { end: true };
  }
}
