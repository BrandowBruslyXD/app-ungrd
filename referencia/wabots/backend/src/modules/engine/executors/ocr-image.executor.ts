import { Injectable, Logger } from '@nestjs/common';
import {
  ExecutionContext,
  FlowNode,
  NodeExecutor,
  NodeResult,
  NodeType,
} from '../../../common/types/engine.types';
import { errorMessage } from '../../../common/text/error-message.util';
import { MediaService } from '../services/media.service';
import { OcrService } from '../services/ocr.service';

/**
 * Nodo "Imagen a texto (OCR)": toma la imagen entrante de WhatsApp
 * (comprobantes, etc.), la descarga (con la auth del canal del tenant),
 * extrae el texto OFFLINE con tesseract.js (idioma 'spa' por defecto) y lo
 * guarda en variables[saveTo || 'textoImagen'].
 *
 * Sale por 'out' si extrae texto; por 'onError' si no hay imagen o algo falla.
 * Si llega texto (sin imagen) en vez de una imagen, sale por 'onError' sin romper.
 */
@Injectable()
export class OcrImageExecutor implements NodeExecutor {
  readonly type: NodeType = 'ocrImage';
  private readonly logger = new Logger(OcrImageExecutor.name);

  constructor(
    private readonly media: MediaService,
    private readonly ocr: OcrService,
  ) {}

  async execute(node: FlowNode, ctx: ExecutionContext): Promise<NodeResult> {
    try {
      const incoming = ctx.incoming;
      // Sin adjunto de imagen: no hay nada que analizar.
      const hasImage =
        !!incoming &&
        (incoming.mediaType === 'image' ||
          incoming.type === 'image' ||
          (incoming.mediaMimeType?.startsWith('image/') ?? false)) &&
        (!!incoming.mediaUrl || !!incoming.mediaBase64);

      if (!hasImage) {
        return { nextHandle: 'onError' };
      }

      const buffer = await this.media.fetchIncomingMedia(
        ctx.tenantId,
        incoming!,
        // Archiva el adjunto real (empresa/flujo/teléfono); en ensayo no (ya lo guarda el controller).
        ctx.dryRun ? undefined : { flowId: ctx.flowId, contactPhone: ctx.contactPhone, conversationId: ctx.conversationId },
      );
      // Idioma(s) de OCR. Default 'spa+eng'; se pueden combinar más (p.ej.
      // 'spa+eng+fra' o 'chi_sim'). Tesseract descarga los datos que falten.
      const lang = node.data?.lang || 'spa+eng';
      const text = await this.ocr.extractText(buffer, lang);

      const saveTo = node.data?.saveTo || 'textoImagen';
      return {
        setVariables: { [saveTo]: text },
        nextHandle: 'out',
      };
    } catch (err) {
      // Registra la causa antes de derivar por 'onError' (no cambia el flujo).
      this.logger.warn(`Nodo ${node.id} (ocrImage): ${errorMessage(err)}`);
      return { nextHandle: 'onError' };
    }
  }
}
