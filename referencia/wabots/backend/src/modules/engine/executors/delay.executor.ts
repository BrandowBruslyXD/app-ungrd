import { Injectable } from '@nestjs/common';
import {
  ExecutionContext,
  FlowNode,
  NodeExecutor,
  NodeResult,
  NodeType,
} from '../../../common/types/engine.types';

/** Tope de espera: evita que un flujo mal configurado bloquee la conversación. */
const MAX_DELAY_MS = 60_000;

/** Pausa la ejecución node.data.ms milisegundos (acotado a MAX_DELAY_MS). Continúa por 'out'. */
@Injectable()
export class DelayExecutor implements NodeExecutor {
  readonly type: NodeType = 'delay';

  async execute(node: FlowNode, _ctx: ExecutionContext): Promise<NodeResult> {
    const ms = Math.min(Number(node.data?.ms) || 0, MAX_DELAY_MS);
    if (ms > 0) await sleep(ms);
    return { nextHandle: 'out' };
  }
}

/** Espera asíncrona simple. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
