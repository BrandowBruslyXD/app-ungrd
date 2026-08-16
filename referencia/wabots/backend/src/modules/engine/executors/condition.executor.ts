import { Injectable } from '@nestjs/common';
import {
  ExecutionContext,
  FlowNode,
  NodeExecutor,
  NodeResult,
  NodeType,
} from '../../../common/types/engine.types';
import { interpolate } from './interpolate';

/**
 * Evalúa una condición { left, op, right } interpolando variables.
 * op ∈ ==, !=, >, <, contains, empty. Sale por 'true' o 'false'.
 */
@Injectable()
export class ConditionExecutor implements NodeExecutor {
  readonly type: NodeType = 'condition';

  async execute(node: FlowNode, ctx: ExecutionContext): Promise<NodeResult> {
    const left = interpolate(node.data?.left, ctx.variables);
    const right = interpolate(node.data?.right, ctx.variables);
    const op = String(node.data?.op ?? '==');

    const result = this.evaluate(left, op, right);
    return { nextHandle: result ? 'true' : 'false' };
  }

  /** Aplica el operador. Para >/< intenta comparación numérica. */
  private evaluate(left: string, op: string, right: string): boolean {
    switch (op) {
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case '>':
        return this.toNum(left) > this.toNum(right);
      case '<':
        return this.toNum(left) < this.toNum(right);
      case 'contains':
        return left.includes(right);
      case 'empty':
        return left.trim() === '';
      default:
        return false;
    }
  }

  private toNum(value: string): number {
    return Number(value);
  }
}
