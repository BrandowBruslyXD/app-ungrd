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

/** Mensaje por defecto QUE VE EL CLIENTE al transferir a humano. */
const DEFAULT_CLIENT_MESSAGE =
  'Listo, te comunico con una persona del equipo. En un momento te atienden por aquí mismo.';

/**
 * Transfiere la conversación a un humano. Termina el flujo (end:true) y
 * marca __handover para que el motor fije status HANDED_OVER y guarde silencio.
 * - `data.message`: texto amable QUE VE EL CLIENTE (hay uno por defecto).
 * - `data.note`: nota INTERNA para el equipo — NUNCA se envía al cliente,
 *   queda en __handoverNote para el registro/EventLog.
 */
@Injectable()
export class HandoverExecutor implements NodeExecutor {
  readonly type: NodeType = 'handover';

  async execute(node: FlowNode, ctx: ExecutionContext): Promise<NodeResult> {
    const outgoing: OutgoingMessage[] = [];
    const clientMsg = node.data?.message || DEFAULT_CLIENT_MESSAGE;
    outgoing.push({ type: 'text', text: interpolate(clientMsg, ctx.variables) });
    return {
      outgoing,
      setVariables: {
        __handover: true,
        ...(node.data?.note
          ? { __handoverNote: interpolate(node.data.note, ctx.variables) }
          : {}),
      },
      end: true,
    };
  }
}
