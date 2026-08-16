import { Injectable } from '@nestjs/common';
import {
  ExecutionContext,
  FlowNode,
  NodeExecutor,
  NodeResult,
  NodeType,
  OutgoingMessage,
} from '../../../common/types/engine.types';
import { interpolate } from './interpolate';

/**
 * Recibe un archivo del usuario.
 * Primera pasada: envía prompt (si hay) y espera.
 * Al reanudar con incoming.mediaUrl: guarda la url en variables[saveTo] y sale 'out'.
 * Si reanuda pero no llegó archivo, vuelve a esperar.
 */
@Injectable()
export class ReceiveFileExecutor implements NodeExecutor {
  readonly type: NodeType = 'receiveFile';

  async execute(node: FlowNode, ctx: ExecutionContext): Promise<NodeResult> {
    if (ctx.resuming && ctx.incoming?.mediaUrl) {
      const saveTo = node.data?.saveTo || 'file';
      return {
        setVariables: { [saveTo]: ctx.incoming.mediaUrl },
        nextHandle: 'out',
      };
    }

    const outgoing: OutgoingMessage[] = [];
    if (node.data?.prompt) {
      outgoing.push({ type: 'text', text: interpolate(node.data.prompt, ctx.variables) });
    }
    return { outgoing, waitForInput: true };
  }
}
