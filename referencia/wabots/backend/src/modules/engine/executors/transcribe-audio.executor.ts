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
import { TranscriptionService } from '../services/transcription.service';

/**
 * Nodo "Audio a texto": toma el audio entrante de WhatsApp (OGG/Opus),
 * lo descarga (con la auth del canal del tenant), lo transcribe OFFLINE con
 * Whisper (multilingüe, autodetección de idioma) y guarda el texto en
 * variables[saveTo || 'transcripcion'].
 *
 * Sale por 'out' si transcribe; por 'onError' si no hay audio o algo falla.
 * Si llega texto (sin audio) en vez de un audio, sale por 'onError' sin romper.
 */
@Injectable()
export class TranscribeAudioExecutor implements NodeExecutor {
  readonly type: NodeType = 'transcribeAudio';
  private readonly logger = new Logger(TranscribeAudioExecutor.name);

  constructor(
    private readonly media: MediaService,
    private readonly transcription: TranscriptionService,
  ) {}

  async execute(node: FlowNode, ctx: ExecutionContext): Promise<NodeResult> {
    try {
      const incoming = ctx.incoming;
      // Sin adjunto de audio: no hay nada que transcribir.
      const hasAudio =
        !!incoming &&
        (incoming.mediaType === 'audio' ||
          incoming.type === 'audio' ||
          (incoming.mediaMimeType?.startsWith('audio/') ?? false)) &&
        (!!incoming.mediaUrl || !!incoming.mediaBase64);

      if (!hasAudio) {
        return { nextHandle: 'onError' };
      }

      const buffer = await this.media.fetchIncomingMedia(
        ctx.tenantId,
        incoming!,
        // Archiva el adjunto real (empresa/flujo/teléfono); en ensayo no (ya lo guarda el controller).
        ctx.dryRun ? undefined : { flowId: ctx.flowId, contactPhone: ctx.contactPhone, conversationId: ctx.conversationId },
      );
      const text = await this.transcription.transcribe(buffer);

      const saveTo = node.data?.saveTo || 'transcripcion';
      return {
        setVariables: { [saveTo]: text },
        nextHandle: 'out',
      };
    } catch (err) {
      // El motor no registra este error (el nodo lo captura); se loguea aquí
      // antes de derivar por 'onError'.
      this.logger.warn(`Nodo ${node.id} (transcribeAudio): ${errorMessage(err)}`);
      return { nextHandle: 'onError' };
    }
  }
}
