import { normalizeText } from '../../../common/text/normalize';

/**
 * Comandos globales del motor: detección PURA (sin estado ni dependencias de
 * Nest) de las palabras que reinician/terminan/repiten/retroceden la
 * conversación, junto con los textos fijos que el bot responde en esos casos.
 */

/**
 * Palabras que reinician la conversación llevando al usuario al menú/inicio.
 * Solo tokens inequívocos: valores como '0' interceptan respuestas legítimas
 * del usuario (números de menú, cantidades) y quedan excluidos.
 */
const RESTART_WORDS = ['menu', 'menú', 'inicio', 'principal', 'volver'];

/** Palabras que terminan la conversación (despedida). */
const EXIT_WORDS = ['salir', 'cancelar', 'adios', 'adiós', 'chao', 'terminar'];

/**
 * Palabras que piden REPETIR/EXPLICAR de nuevo el paso actual.
 * Excluye tokens ambiguos ('que', 'qué', '?') que aparecen en respuestas
 * legítimas del usuario.
 */
const HELP_WORDS = [
  'ayuda', 'repite', 'repetir', 'otra vez', 'no entendi', 'no entendí',
  'no entiendo', 'explica', 'explicame', 'explícame',
];

/** Palabras que retroceden un paso en la conversación. */
const BACK_WORDS = ['atras', 'atrás', 'anterior', 'regresar', 'volver atras', 'volver atrás'];

/** Mensaje de despedida al salir (genérico: sirve para cualquier empresa). */
export const GOODBYE_TEXT =
  'Gracias por escribirnos. Escribe *hola* cuando quieras retomar la conversación.';

/** Mensaje genérico cuando un nodo falla y no hay edge onError. */
export const GENERIC_ERROR_TEXT =
  'Disculpa, tuvimos un inconveniente. Escribe *menú* para volver al inicio.';

/** Comando global detectado en el texto entrante. */
export type GlobalCommand = 'exit' | 'restart' | 'help' | 'back' | null;

/**
 * Detecta si el texto coincide con un comando global. Compara tanto la forma
 * cruda (en minúsculas) como la forma normalizada sin tildes, para tolerar
 * acentos faltantes. Solo dispara en coincidencia EXACTA (el texto completo es
 * el comando), para no confundir con datos que el usuario escribe.
 */
export function detectGlobalCommand(text: string | undefined | null): GlobalCommand {
  const raw = (text ?? '').trim().toLowerCase();
  const normalized = normalizeText(text);
  if (!normalized) return null;

  const matches = (words: string[]) =>
    words.some((w) => w === raw || normalizeText(w) === normalized);

  if (matches(EXIT_WORDS)) return 'exit';
  if (matches(BACK_WORDS)) return 'back';
  if (matches(RESTART_WORDS)) return 'restart';
  if (matches(HELP_WORDS)) return 'help';
  return null;
}

/**
 * Frases de CANCELACIÓN/arrepentimiento (coincidencia por SUBcadena sobre el
 * texto normalizado). Rescatan al usuario atrapado en un sub-flujo determinista
 * (captura de datos/menú) cuando ya no quiere continuar: la conversación vuelve
 * al inicio (agente IA) conservando el historial, para responder con contexto.
 */
const CANCEL_PHRASES = [
  'ya no quiero', 'ya no la necesito', 'ya no lo necesito', 'ya no necesito',
  'no quiero la cita', 'no quiero agendar', 'no quiero seguir', 'no quiero continuar',
  'cancela la cita', 'cancelar la cita', 'cancela mi cita', 'cancelar mi cita',
  'quita la cita', 'quitar la cita', 'quitame la cita', 'anula la cita', 'anular la cita',
  'olvidalo', 'olvidelo', 'dejalo asi', 'dejemoslo asi', 'mejor no', 'asi dejalo',
];

/** True si el mensaje expresa que el usuario quiere cancelar/abandonar el paso. */
export function detectCancelIntent(text: string | undefined | null): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  return CANCEL_PHRASES.some((p) => normalized.includes(normalizeText(p)));
}

/**
 * Pila de navegación para "atrás": guarda en `variables.__nav` la secuencia de
 * nodos donde la conversación se PAUSÓ. Evita duplicar el mismo nodo seguido.
 */
export function navPush(variables: Record<string, any>, nodeId: string): void {
  const nav: string[] = Array.isArray(variables.__nav) ? variables.__nav : [];
  if (nav[nav.length - 1] !== nodeId) nav.push(nodeId);
  variables.__nav = nav;
}

/** Retrocede un paso: quita el nodo actual de la pila y devuelve el anterior. */
export function navBack(variables: Record<string, any>): string | null {
  const nav: string[] = Array.isArray(variables.__nav) ? variables.__nav : [];
  nav.pop(); // descarta el paso actual
  const target = nav.length ? nav[nav.length - 1] : null;
  variables.__nav = nav;
  return target;
}
