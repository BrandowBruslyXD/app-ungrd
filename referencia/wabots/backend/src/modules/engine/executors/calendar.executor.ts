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
 * Nodo Calendar: delega en la integración (kind 'calendar') con action + data
 * interpolada. Sale 'out' / 'onError'.
 */
@Injectable()
export class CalendarExecutor implements NodeExecutor {
  readonly type: NodeType = 'calendar';
  private readonly logger = new Logger(CalendarExecutor.name);

  async execute(node: FlowNode, ctx: ExecutionContext): Promise<NodeResult> {
    try {
      const data = interpolateDeep(node.data ?? {}, ctx.variables);
      // Pasa source ('platform'|'tenant') y tenantId para resolver la integración
      // cuando el nodo no trae un integrationId explícito. attendees/calendarId/
      // summary/start/etc. ya viajan interpolados dentro de `data`.
      const result = await ctx.services.callIntegration(node.data?.integrationId, {
        ...data,
        kind: 'calendar',
        action: node.data?.action,
        source: node.data?.calendarSource || 'tenant',
        tenantId: ctx.tenantId,
      });

      const saveTo = node.data?.saveTo || 'calendar';
      return { setVariables: { [saveTo]: result }, nextHandle: 'out' };
    } catch (err) {
      // Registra la causa antes de derivar por 'onError' (no cambia el flujo).
      this.logger.warn(`Nodo ${node.id} (calendar): ${errorMessage(err)}`);
      return { nextHandle: 'onError' };
    }
  }
}
