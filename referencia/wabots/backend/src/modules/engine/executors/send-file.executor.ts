import { Injectable } from '@nestjs/common';
import {
  ExecutionContext,
  FlowNode,
  NodeExecutor,
  NodeResult,
  NodeType,
} from '../../../common/types/engine.types';
import { interpolate } from './interpolate';

/** Envía un archivo (media) con caption interpolado. Sale por 'out'. */
@Injectable()
export class SendFileExecutor implements NodeExecutor {
  readonly type: NodeType = 'sendFile';

  async execute(node: FlowNode, ctx: ExecutionContext): Promise<NodeResult> {
    const mediaUrl = interpolate(node.data?.mediaUrl ?? node.data?.fileRef, ctx.variables);
    const caption = interpolate(node.data?.caption, ctx.variables);
    return {
      outgoing: [{ type: 'media', mediaUrl, caption }],
      nextHandle: 'out',
    };
  }
}
