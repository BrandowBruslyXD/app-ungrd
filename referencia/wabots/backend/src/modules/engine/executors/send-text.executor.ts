import { Injectable } from '@nestjs/common';
import {
  ExecutionContext,
  FlowNode,
  NodeExecutor,
  NodeResult,
  NodeType,
} from '../../../common/types/engine.types';
import { interpolate } from './interpolate';

/** Envía un texto interpolando {{variables}}. Continúa por 'out'. */
@Injectable()
export class SendTextExecutor implements NodeExecutor {
  readonly type: NodeType = 'sendText';

  async execute(node: FlowNode, ctx: ExecutionContext): Promise<NodeResult> {
    const text = interpolate(node.data?.text, ctx.variables);
    return {
      outgoing: [{ type: 'text', text }],
      nextHandle: 'out',
    };
  }
}
