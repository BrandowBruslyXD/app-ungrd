import { Injectable, Logger } from '@nestjs/common';
import {
  ExecutionContext,
  FlowNode,
  NodeExecutor,
  NodeResult,
  NodeType,
} from '../../../common/types/engine.types';
import { errorMessage } from '../../../common/text/error-message.util';
import { interpolate } from './interpolate';
import { TranslationService } from '../services/translation.service';

/**
 * Nodo "Traducir texto": traduce un texto a un idioma destino de forma OFFLINE
 * (NLLB-200), sin gastar tokens de ningún LLM ni API externa.
 *
 * Origen del texto:
 *  - `node.data.fromVar`: nombre de la variable a traducir, o
 *  - `node.data.text`: plantilla interpolable ({{var}}), o
 *  - si ninguno, usa el texto del mensaje entrante (ctx.incoming.text).
 *
 * `node.data.targetLang` (default 'es'), `node.data.sourceLang` (default 'auto'),
 * `node.data.saveTo` (default 'traduccion'). Sale por 'out' / 'onError'.
 */
@Injectable()
export class TranslateTextExecutor implements NodeExecutor {
  readonly type: NodeType = 'translateText';
  private readonly logger = new Logger(TranslateTextExecutor.name);

  constructor(private readonly translation: TranslationService) {}

  async execute(node: FlowNode, ctx: ExecutionContext): Promise<NodeResult> {
    try {
      // Resuelve el texto a traducir según la configuración del nodo.
      let text = '';
      if (node.data?.fromVar) {
        const v = ctx.variables?.[node.data.fromVar];
        text = v == null ? '' : String(v);
      } else if (node.data?.text) {
        text = interpolate(node.data.text, ctx.variables);
      } else {
        text = ctx.incoming?.text ?? '';
      }

      if (!text.trim()) {
        return { nextHandle: 'onError' };
      }

      const target = node.data?.targetLang || 'es';
      const source = node.data?.sourceLang || 'auto';
      const translated = await this.translation.translate(text, {
        target,
        source,
      });

      const saveTo = node.data?.saveTo || 'traduccion';
      return { setVariables: { [saveTo]: translated }, nextHandle: 'out' };
    } catch (err) {
      // Registra la causa antes de derivar por 'onError' (no cambia el flujo).
      this.logger.warn(`Nodo ${node.id} (translateText): ${errorMessage(err)}`);
      return { nextHandle: 'onError' };
    }
  }
}
