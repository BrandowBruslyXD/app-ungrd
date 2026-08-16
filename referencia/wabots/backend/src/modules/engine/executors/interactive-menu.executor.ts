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
import { IncomingTextService } from '../incoming-text.service';
import { normalizeText } from '../../../common/text/normalize';

interface MenuOption {
  id: string;
  label: string;
}

/**
 * Menú interactivo. Primera pasada: envía el menú (con opciones numeradas
 * legibles) y espera input. Al reanudar: interpreta la respuesta (número de
 * opción, o texto que coincide con id/label), guarda el label elegido en una
 * variable y sale por `opt:<id>`. Si no coincide, reenvía un mensaje amable
 * con el menú de nuevo y vuelve a esperar (sin usar onError).
 */
@Injectable()
export class InteractiveMenuExecutor implements NodeExecutor {
  readonly type: NodeType = 'interactiveMenu';

  constructor(private readonly incomingText: IncomingTextService) {}

  async execute(node: FlowNode, ctx: ExecutionContext): Promise<NodeResult> {
    const options: MenuOption[] = (node.data?.options ?? []) as MenuOption[];

    if (ctx.resuming && ctx.incoming) {
      // Se transcribe el audio y se pasa la imagen por OCR antes de buscar la opción:
      // quien contesta un menú con una nota de voz ("la uno") recibía el menú otra vez,
      // sin señal de que había mandado algo. Y elegir de viva voz es normal en WhatsApp.
      const { text: entrada } = await this.incomingText.resolveForMatching(ctx);
      const chosen = this.matchOption(entrada, options);
      if (chosen) {
        // Guarda el label elegido en la variable indicada por saveTo
        // o, por defecto, en `${node.id}_opcion`.
        const saveKey = (node.data?.saveTo as string) || `${node.id}_opcion`;
        const label = interpolate(chosen.label, ctx.variables);
        return {
          setVariables: { [saveKey]: label },
          nextHandle: `opt:${chosen.id}`,
        };
      }

      // Respuesta no reconocida → reenvía el menú con una nota breve y amable
      // (sin asumir "número"; sirve igual para texto, botones o lista).
      const menu = this.buildMenu(node, ctx, options);
      const hint = node.data?.invalidPrompt as string | undefined;
      if (hint) {
        return {
          outgoing: [{ type: 'text', text: hint }, menu],
          waitForInput: true,
        };
      }
      // Sin nota configurada: reenvía solo el menú (limpio, sin regaño).
      return { outgoing: [menu], waitForInput: true };
    }

    // Primera pasada: enviar menú y esperar respuesta del usuario.
    return { outgoing: [this.buildMenu(node, ctx, options)], waitForInput: true };
  }

  /**
   * Construye el mensaje interactivo con header/body/opciones interpolados.
   * El texto incluye SIEMPRE las opciones numeradas legibles (1. ..., 2. ...)
   * para clientes/canales que no renderizan botones interactivos.
   */
  private buildMenu(
    node: FlowNode,
    ctx: ExecutionContext,
    options: MenuOption[],
  ): OutgoingMessage {
    const header = interpolate(node.data?.header, ctx.variables);
    const body = interpolate(node.data?.body, ctx.variables);

    // Opciones interpoladas (id se conserva; label/description se resuelven).
    const interpolatedOptions = options.map((o) => ({
      id: o.id,
      label: interpolate(o.label, ctx.variables),
      ...((o as any).description
        ? { description: interpolate((o as any).description, ctx.variables) }
        : {}),
    }));

    // Listado numerado legible: "1. Etiqueta" (fallback en texto y para canales
    // sin botones nativos).
    const numbered = interpolatedOptions
      .map((o, i) => `${i + 1}. ${o.label}`)
      .join('\n');

    const text = [header, body, numbered].filter(Boolean).join('\n');

    return {
      type: 'interactive',
      text,
      options: interpolatedOptions,
      // Modo de render: 'text' | 'buttons' | 'list' (default 'text').
      menuType: (node.data?.menuType as 'text' | 'buttons' | 'list') || 'text',
      listButtonText: node.data?.listButtonText
        ? interpolate(node.data.listButtonText, ctx.variables)
        : undefined,
    };
  }

  /**
   * Empareja la respuesta del usuario con una opción:
   * 1) por posición numérica (1-based),
   * 2) por id (case-insensitive, contains),
   * 3) por label (case-insensitive, contains).
   */
  private matchOption(input: string, options: MenuOption[]): MenuOption | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Por número de opción. Se aceptan también las formas dictadas ("la dos", "el 2")
    // y el número con punto ("2."), que es como lo repite quien lee el menú en voz alta.
    const soloNumero = trimmed.match(/^(?:la|el|opci[oó]n|numero|n[uú]mero)?\s*(\d{1,2})\s*[.)]?$/i);
    const num = Number(soloNumero ? soloNumero[1] : trimmed);
    if (Number.isInteger(num) && num >= 1 && num <= options.length) {
      return options[num - 1];
    }
    const dictados = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const palabra = normalizeText(trimmed).replace(/^(la|el|opcion|numero)\s+/, '');
    const idx = dictados.indexOf(palabra);
    if (idx >= 0 && idx < options.length) return options[idx];

    // Por id o label. La comparación ignora tildes, signos y espacios: una respuesta
    // dictada llega con otra puntuación y otro espaciado que el label del menú
    // ("Contraentrega" se transcribió "Contra entrega." y no coincidía con nada).
    const compacta = (v: string) => normalizeText(v).replace(/[^a-z0-9]/g, '');
    const entrada = compacta(trimmed);
    if (!entrada) return null;
    const casa = (valor: string | undefined): boolean => {
      const v = compacta(valor ?? '');
      // La contención exige 3+ caracteres: con menos, "si" casaría con cualquier cosa.
      return v.length > 0 && (v === entrada || (v.length >= 3 && (v.includes(entrada) || entrada.includes(v))));
    };
    const exacto = options.find((o) => casa(o.id)) ?? options.find((o) => casa(o.label));
    if (exacto) return exacto;

    // Última pasada, tolerante a errores de una o dos letras. La transcripción de voz
    // los comete: "Contraentrega" se transcribió "Contraintrega" — una vocal cambiada,
    // que ninguna comparación por contención resuelve. Solo se acepta si hay UN
    // candidato cercano: con dos, elegir sería adivinar por el cliente.
    const cercanos = options.filter((o) => {
      const v = compacta(o.label ?? o.id ?? '');
      if (v.length < 4) return false;                 // en palabras cortas un error cambia el sentido
      const margen = Math.min(2, Math.floor(v.length / 6) + 1);
      return this.distanciaEdicion(entrada, v) <= margen;
    });
    return cercanos.length === 1 ? cercanos[0] : null;
  }

  /**
   * Distancia de edición entre dos cadenas ya normalizadas. Implementada aquí porque
   * es lo único que hacía falta y no justifica una dependencia.
   */
  private distanciaEdicion(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length || !b.length) return Math.max(a.length, b.length);
    let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const actual = [i];
      for (let j = 1; j <= b.length; j++) {
        actual[j] = Math.min(
          previa[j] + 1,                                        // borrado
          actual[j - 1] + 1,                                    // inserción
          previa[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),       // sustitución
        );
      }
      previa = actual;
    }
    return previa[b.length];
  }
}
