import { Injectable, Logger } from '@nestjs/common';
import {
  ExecutionContext,
  FlowNode,
  NodeExecutor,
  NodeResult,
  NodeType,
} from '../../../common/types/engine.types';
import { errorMessage } from '../../../common/text/error-message.util';
import { interpolateDeep } from './interpolate';

/**
 * Nodo Gmail: delega en la integración (kind 'gmail') con la data del nodo
 * interpolada. Sale 'out' / 'onError'.
 */
@Injectable()
export class GmailExecutor implements NodeExecutor {
  readonly type: NodeType = 'gmail';
  private readonly logger = new Logger(GmailExecutor.name);

  async execute(node: FlowNode, ctx: ExecutionContext): Promise<NodeResult> {
    try {
      const data = interpolateDeep(node.data ?? {}, ctx.variables);
      // Pasa source ('platform'|'tenant') y tenantId para resolver la cuenta de
      // Gmail conectada cuando el nodo no trae integrationId explícito (igual que
      // el nodo Calendar). Default 'tenant' = la cuenta de la empresa.
      const result = await ctx.services.callIntegration(node.data?.integrationId, {
        kind: 'gmail',
        ...data,
        source: node.data?.gmailSource || 'tenant',
        tenantId: ctx.tenantId,
      });

      const saveTo = node.data?.saveTo || 'gmail';
      return { setVariables: { [saveTo]: result }, nextHandle: 'out' };
    } catch (err) {
      // Registra la causa antes de derivar por 'onError' (no cambia el flujo).
      this.logger.warn(`Nodo ${node.id} (gmail): ${errorMessage(err)}`);
      return { nextHandle: 'onError' };
    }
  }
}
