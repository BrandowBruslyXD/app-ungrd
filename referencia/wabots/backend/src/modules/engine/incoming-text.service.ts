import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext } from '../../common/types/engine.types';
import { MediaService } from './services/media.service';
import { TranscriptionService } from './services/transcription.service';
import { OcrService } from './services/ocr.service';

/**
 * Convierte el mensaje entrante en texto, sea lo que venga: texto tal cual, audio
 * transcrito con Whisper, imagen pasada por OCR con Tesseract (ambos offline, sin
 * costo de tokens), y una anotación legible para vídeo o documentos.
 *
 * Vivía dentro del ejecutor de `aiAgent`, así que solo ese nodo entendía una nota de
 * voz. En `captureInput` y `interactiveMenu` el mensaje llegaba con `text` vacío y se
 * descartaba en silencio: la captura respondía "no entendí" y el menú se repetía, sin
 * dejar rastro de que había llegado un audio perfectamente transcribible. En el
 * histórico de conversaciones reales eso toca el 31% de los casos — la gente manda
 * notas de voz y fotos de sus productos en mitad de un menú, no solo al principio.
 */
@Injectable()
export class IncomingTextService {
  private readonly logger = new Logger(IncomingTextService.name);

  constructor(
    private readonly media: MediaService,
    private readonly transcription: TranscriptionService,
    private readonly ocr: OcrService,
  ) {}

  /**
   * Devuelve el texto del mensaje. Nunca lanza: un fallo de transcripción no debe
   * tumbar la conversación, así que se devuelve una anotación y el flujo sigue.
   */
  async resolve(ctx: ExecutionContext): Promise<string> {
    const incoming = ctx.incoming;
    const text = (incoming?.text ?? '').trim();
    if (text) return text;
    if (!incoming) return '';

    // Memoización POR TURNO (ctx transitorio, no persistido): si varios nodos
    // procesan el mismo mensaje, el audio/imagen se transcribe/OCR una sola vez
    // (Whisper/Tesseract son costosos y bloqueantes).
    if (typeof ctx.mediaText === 'string') return ctx.mediaText;
    const remember = (value: string, fuente?: 'audio' | 'imagen'): string => {
      ctx.mediaText = value;
      if (fuente) (ctx as any).mediaFuente = fuente;
      return value;
    };

    const kind = incoming.mediaType || incoming.type;
    const mime = incoming.mediaMimeType ?? '';
    const hasMedia = !!incoming.mediaUrl || !!incoming.mediaBase64;

    try {
      if (hasMedia && (kind === 'audio' || mime.startsWith('audio/'))) {
        const buffer = await this.media.fetchIncomingMedia(
          ctx.tenantId,
          incoming,
          // Archiva el adjunto real (empresa/flujo/teléfono); en ensayo no (ya lo guarda el controller).
          ctx.dryRun ? undefined : { flowId: ctx.flowId, contactPhone: ctx.contactPhone, conversationId: ctx.conversationId },
        );
        const transcript = (await this.transcription.transcribe(buffer)).trim();
        return remember(transcript || '[Nota de voz recibida; no se entendió el audio.]', 'audio');
      }
      if (hasMedia && (kind === 'image' || mime.startsWith('image/'))) {
        const buffer = await this.media.fetchIncomingMedia(
          ctx.tenantId,
          incoming,
          ctx.dryRun ? undefined : { flowId: ctx.flowId, contactPhone: ctx.contactPhone, conversationId: ctx.conversationId },
        );
        const ocrText = (await this.ocr.extractText(buffer, 'spa+eng')).trim();
        return remember(
          ocrText
            ? `[Imagen recibida del cliente. Texto detectado:] ${ocrText}`
            : '[Imagen recibida del cliente, sin texto legible.]',
          'imagen',
        );
      }
    } catch (err) {
      // Se registra: antes un fallo aquí era indistinguible de "el cliente no escribió nada".
      this.logger.warn(`No se pudo procesar el adjunto entrante: ${String((err as any)?.message ?? err)}`);
      return remember('[No se pudo procesar el archivo enviado por el cliente.]');
    }

    if (kind === 'video') return remember('[El cliente envió un video (no se puede ver).]');
    if (kind === 'document') return remember('[El cliente envió un documento.]');
    return '';
  }

  /**
   * Igual que `resolve`, pero para nodos que comparan el texto con algo concreto (una
   * opción de menú, una cédula, un email). Ahí una anotación como
   * "[El cliente envió un video]" no es un dato del cliente: es una nota interna, y
   * validarla contra un email o una opción daría un falso "no entendí" con un mensaje
   * confuso. Se devuelve el texto real y, aparte, la anotación para poder explicárselo.
   */
  async resolveForMatching(
    ctx: ExecutionContext,
  ): Promise<{ text: string; nota?: string; fuente?: 'audio' | 'imagen' }> {
    const resuelto = await this.resolve(ctx);
    const fuente = (ctx as any).mediaFuente as 'audio' | 'imagen' | undefined;
    if (!resuelto) return { text: '', fuente };
    // Las anotaciones internas van entre corchetes al principio; una transcripción no.
    const esAnotacion = /^\[[^\]]+\]$/.test(resuelto.trim());
    if (esAnotacion) return { text: '', nota: resuelto, fuente };
    // La imagen con texto detectado sí trae dato aprovechable tras el prefijo.
    const conOcr = resuelto.match(/^\[Imagen recibida del cliente\. Texto detectado:\]\s*([\s\S]+)$/);
    if (conOcr) return { text: conOcr[1].trim(), fuente };
    return { text: resuelto, fuente };
  }

  /**
   * Un número largo dictado no es de fiar. Probado con una nota de voz real: la cédula
   * "1020304050" se transcribió como "1.340.50" y el teléfono "300 123 4567" como
   * "3.0.1.2.3, 4.5.67" — no es un problema de formato, es que Whisper PIERDE dígitos.
   *
   * Guardar eso sería peor que rechazar el audio: queda una cédula corrupta con pinta
   * de válida y el pedido sale mal, que en contraentrega es un flete perdido. Cuando el
   * dato lleva números, se le pide al cliente que los escriba.
   */
  numerosNoFiables(text: string, fuente?: 'audio' | 'imagen'): boolean {
    if (fuente !== 'audio' || !text) return false;
    const digitos = (text.match(/\d/g) || []).length;
    // Un "5" o un "20 de agosto" se transcriben bien; una cédula o un teléfono, no.
    return digitos >= 5;
  }
}
