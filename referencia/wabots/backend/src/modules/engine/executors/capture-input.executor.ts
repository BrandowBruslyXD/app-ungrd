import { Injectable } from '@nestjs/common';
import {
  ExecutionContext,
  FlowNode,
  NodeExecutor,
  NodeResult,
  NodeType,
  OutgoingMessage,
} from '../../../common/types/engine.types';
import { fmt, parseSpanishDate } from '../validation/spanish-date.parser';
import { EMAIL_RE, titleCase, validarNombre, validarTelefono } from '../validation/name-validator';
import { interpolate } from './interpolate';
import { IncomingTextService } from '../incoming-text.service';

/**
 * Captura texto del usuario en una variable, con validación opcional.
 * `node.data.validate`: 'date' | 'name' | 'email' | 'phone' | 'nonempty'
 * (por defecto guarda tal cual). Primera pasada: envía el prompt y espera.
 * Al reanudar: valida y guarda, o re-pregunta amablemente si no es válido
 * (sin romper el flujo ni aceptar bromas).
 */
@Injectable()
export class CaptureInputExecutor implements NodeExecutor {
  readonly type: NodeType = 'captureInput';

  constructor(private readonly incomingText: IncomingTextService) {}

  async execute(node: FlowNode, ctx: ExecutionContext): Promise<NodeResult> {
    if (ctx.resuming && ctx.incoming) {
      const variable = node.data?.variable ?? 'input';
      // El audio se transcribe y la imagen pasa por OCR antes de validar: leer
      // `incoming.text` en crudo descartaba en silencio una nota de voz con la
      // dirección dentro, y el cliente recibía un "no entendí" sin motivo.
      const { text, nota, fuente } = await this.incomingText.resolveForMatching(ctx);
      const validate = node.data?.validate;

      // Un dato con números dictado por voz no se guarda: la transcripción pierde
      // dígitos (cédula "1020304050" → "1.340.50", comprobado con audio real). Se
      // repite lo que se entendió, para que el cliente solo corrija lo que falta.
      if (this.incomingText.numerosNoFiables(text, fuente)) {
        return {
          outgoing: [{
            type: 'text',
            text:
              `Entendí en tu nota de voz: "${text}". Los números no me quedan claros al ` +
              `escucharlos, ¿me los escribes por aquí para no equivocarme? 💗`,
          }],
          waitForInput: true,
        };
      }
      const reask = (fallback: string): NodeResult => ({
        // Si llegó un adjunto que no se puede leer (un vídeo, un documento), se dice
        // eso en vez del mensaje de validación, que sonaría a que escribió mal.
        outgoing: [{
          type: 'text',
          text: nota
            ? `${this.explicarAdjunto(nota)} ${node.data?.invalidPrompt || fallback}`
            : node.data?.invalidPrompt || fallback,
        }],
        waitForInput: true,
      });

      if (validate === 'date') {
        const now = new Date();
        const d = parseSpanishDate(text, now);
        if (!d || isNaN(d.getTime())) {
          return reask(
            'No entendí la fecha. Dime el día y la hora, por ejemplo: mañana 10:00, el viernes 3pm o 15 de julio a las 4.',
          );
        }
        // Nada de citas en el pasado ni a más de un año.
        if (d.getTime() < now.getTime() - 60_000) {
          return reask('Esa fecha ya pasó. ¿Qué día y hora te viene bien de aquí en adelante?');
        }
        const unAno = 365 * 24 * 60 * 60 * 1000;
        if (d.getTime() > now.getTime() + unAno) {
          return reask('Esa fecha está muy lejos. ¿Podemos agendar dentro del próximo año?');
        }
        return { setVariables: { [variable]: fmt(d) }, nextHandle: 'out' };
      }

      if (validate === 'name') {
        const res = validarNombre(text);
        if (!res.ok) {
          return reask('¿Me confirmas tu nombre y apellido, por favor? Solo el nombre real, sin números ni apodos.');
        }
        return { setVariables: { [variable]: titleCase(text) }, nextHandle: 'out' };
      }

      if (validate === 'email') {
        if (!EMAIL_RE.test(text)) {
          return reask('Ese correo no parece válido. ¿Me lo escribes de nuevo? (ejemplo: nombre@correo.com)');
        }
        return { setVariables: { [variable]: text.toLowerCase() }, nextHandle: 'out' };
      }

      if (validate === 'phone') {
        if (!validarTelefono(text)) {
          return reask('Ese número no parece válido. ¿Me lo confirmas con indicativo? (ejemplo: 300 123 4567)');
        }
        return { setVariables: { [variable]: text.replace(/[\s()+.-]/g, '') }, nextHandle: 'out' };
      }

      if (!text) {
        return reask('No entendí, ¿me lo repites por favor?');
      }
      return { setVariables: { [variable]: text }, nextHandle: 'out' };
    }

    const outgoing: OutgoingMessage[] = [];
    if (node.data?.prompt) {
      outgoing.push({ type: 'text', text: interpolate(node.data.prompt, ctx.variables) });
    }
    return { outgoing, waitForInput: true };
  }

  /**
   * Traduce la anotación interna del adjunto a algo que el cliente entienda. Sin esto
   * recibiría el mensaje de validación a secas y parecería que escribió mal, cuando lo
   * que pasa es que mandó un formato que no se puede leer.
   */
  private explicarAdjunto(nota: string): string {
    if (/video/i.test(nota)) return 'No puedo ver videos.';
    if (/documento/i.test(nota)) return 'No puedo abrir documentos.';
    if (/no se entendió el audio/i.test(nota)) return 'No logré entender la nota de voz.';
    if (/sin texto legible/i.test(nota)) return 'No pude leer texto en la imagen.';
    return 'No pude procesar el archivo.';
  }
}
