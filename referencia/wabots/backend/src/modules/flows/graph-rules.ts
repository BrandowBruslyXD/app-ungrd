/**
 * Reglas de coherencia del grafo, del lado del servidor.
 *
 * Antes estas reglas vivían solo en el editor (`frontend/src/flow/validation.js`),
 * así que cualquier grafo que entrara por la API — incluidos los que genera el
 * flow-agent — las esquivaba: el backend solo comprobaba integridad estructural
 * (ids, types, positions). De ahí salían flujos guardados con condiciones sin
 * ramas, handles `onError` sueltos o menús a medio configurar.
 *
 * Aquí viven las reglas para que TODO grafo pase por el mismo filtro, venga del
 * editor, del constructor o de una llamada directa a la API.
 *
 * Se distingue entre:
 *  - `errors`: rompen la conversación en ejecución (el motor se queda sin camino).
 *  - `warnings`: no la rompen, pero degradan la experiencia.
 *
 * Ninguna de las dos bloquea el guardado: un flujo a medio diseñar tiene nodos
 * sueltos de forma legítima. Quien debe tratarlas como bloqueantes es el
 * generador automático, que no tiene excusa para entregar un grafo roto.
 */
import { FlowGraph, FlowNode } from '../../common/types/engine.types';

/** Nodos cuyo executor deriva por 'onError' y que por tanto deben tenerlo conectado. */
const REQUIRE_ON_ERROR = [
  'transcribeAudio',
  'ocrImage',
  'aiAgent',
  'httpRequest',
  'gmail',
  'calendar',
  'receiveFile',
  'translateText',
  'reminder',
];

/** Nodos terminales: no pueden tener salidas. */
const TERMINAL = ['end', 'handover'];

/** Campos obligatorios por tipo de nodo: [clave en data, etiqueta legible]. */
const REQUIRED_FIELDS: Record<string, [string, string][]> = {
  sendText: [['text', 'el texto del mensaje']],
  captureInput: [
    ['variable', 'la variable de destino'],
    ['prompt', 'la pregunta'],
  ],
  aiAgent: [['systemPrompt', 'las instrucciones (systemPrompt)']],
  interactiveMenu: [['body', 'el texto del menú']],
  httpRequest: [['url', 'la URL de la petición']],
  translateText: [['fromVar', 'la variable de origen']],
  sendFile: [['mediaUrl', 'la URL del archivo']],
};

/** Qué validación corresponde al dato que pide una captura, según su enunciado. */
const EXPECTED_VALIDATE: [RegExp, string][] = [
  [/tel[eé]fono|celular|whatsapp|n[uú]mero de contacto/i, 'phone'],
  [/correo|email|e-mail/i, 'email'],
  [/fecha|d[ií]a|cu[aá]ndo/i, 'date'],
];

/** Handles que legítimamente admiten varias salidas (una por rama/opción). */
const isMultiHandle = (handle: string): boolean =>
  handle.startsWith('opt:') || handle.startsWith('intent:') || handle === 'true' || handle === 'false';

export interface GraphIssues {
  errors: string[];
  warnings: string[];
}

/**
 * Revisa la coherencia de un grafo. No lanza: devuelve lo que encuentra para que
 * quien llama decida si bloquear, avisar o auto-reparar.
 */
export function inspectGraph(graph: FlowGraph): GraphIssues {
  const nodes: FlowNode[] = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const outOf = (id: string) => edges.filter((e) => e.source === id);
  const inTo = (id: string) => edges.filter((e) => e.target === id);
  const handlesOf = (id: string) => outOf(id).map((e) => e.sourceHandle || 'out');
  const label = (n: FlowNode) => `${n.type} (${n.id})`;

  // --- 1. Un solo disparador, sin entradas y con una única salida ---
  const triggers = nodes.filter((n) => n.type === 'trigger');
  if (triggers.length === 0) {
    errors.push('El flujo no tiene ningún nodo Disparador.');
  } else if (triggers.length > 1) {
    errors.push(`Hay ${triggers.length} nodos Disparador; debe haber solo uno.`);
  }
  for (const n of triggers) {
    if (inTo(n.id).length) errors.push(`El disparador ${n.id} no puede recibir conexiones.`);
    if (outOf(n.id).length > 1) {
      errors.push(`El disparador ${n.id} tiene ${outOf(n.id).length} salidas; debe tener una.`);
    }
  }

  // --- 2. Los nodos terminales no emiten salida ---
  for (const n of nodes) {
    if (TERMINAL.includes(n.type) && outOf(n.id).length) {
      errors.push(`El nodo ${label(n)} es terminal y no puede tener salidas.`);
    }
  }

  // --- 3. Salida de error sin conectar: el motor deriva por ahí y se queda sin camino ---
  for (const n of nodes) {
    if (REQUIRE_ON_ERROR.includes(n.type) && !handlesOf(n.id).includes('onError')) {
      errors.push(
        `El nodo ${label(n)} no tiene conectada su salida de error (onError): ante un fallo ` +
          `la conversación se corta en seco.`,
      );
    }
  }

  // --- 4. Nodos inalcanzables o sin continuación ---
  for (const n of nodes) {
    if (n.type !== 'trigger' && inTo(n.id).length === 0) {
      errors.push(`El nodo ${label(n)} no tiene conexión de entrada: nunca se alcanza.`);
    }
    if (!TERMINAL.includes(n.type) && outOf(n.id).length === 0) {
      errors.push(`El nodo ${label(n)} no tiene salidas: la conversación se queda encallada ahí.`);
    }
  }

  // --- 5. Un solo camino por conector (salvo ramas y opciones de menú) ---
  const perHandle = new Map<string, number>();
  for (const e of edges) {
    const key = `${e.source}::${e.sourceHandle || 'out'}`;
    perHandle.set(key, (perHandle.get(key) || 0) + 1);
  }
  for (const [key, count] of perHandle) {
    const [source, handle] = key.split('::');
    if (count > 1 && !isMultiHandle(handle)) {
      errors.push(
        `El nodo ${source} tiene ${count} salidas desde el mismo conector "${handle}": ` +
          `el motor solo seguirá una.`,
      );
    }
  }

  // --- 6. Condiciones: ambas ramas, con sus operandos, y a destinos distintos ---
  for (const n of nodes.filter((x) => x.type === 'condition')) {
    const hs = handlesOf(n.id);
    const missing = [!hs.includes('true') && 'Sí (true)', !hs.includes('false') && 'No (false)']
      .filter(Boolean)
      .join(' y ');
    if (missing) errors.push(`La condición ${n.id} no tiene conectada la salida ${missing}.`);

    if (!String(n.data?.left ?? '').trim()) {
      errors.push(`La condición ${n.id} no tiene lado izquierdo.`);
    }
    const op = (n.data?.op as string) || '==';
    if (op !== 'empty' && !String(n.data?.right ?? '').trim()) {
      errors.push(`La condición ${n.id} no tiene lado derecho (operador "${op}").`);
    }
    const targets = new Set(outOf(n.id).map((e) => e.target));
    if (targets.size === 1 && outOf(n.id).length > 1) {
      warnings.push(
        `Las dos ramas de la condición ${n.id} van al mismo nodo: no decide nada y se puede quitar.`,
      );
    }
  }

  // --- 7. Campos obligatorios por tipo ---
  for (const n of nodes) {
    for (const [key, name] of REQUIRED_FIELDS[n.type] ?? []) {
      const value = n.data?.[key];
      if (typeof value !== 'string' || !value.trim()) {
        errors.push(`El nodo ${label(n)} no tiene ${name}.`);
      }
    }
  }

  // --- 8. Menús: opciones etiquetadas, con salida, y mensaje para respuesta no reconocida ---
  for (const n of nodes.filter((x) => x.type === 'interactiveMenu')) {
    const options = Array.isArray(n.data?.options) ? (n.data.options as any[]) : [];
    if (!options.length || options.every((o) => !String(o?.label ?? '').trim())) {
      errors.push(`El menú ${n.id} no tiene opciones con etiqueta.`);
    } else {
      const withExit = handlesOf(n.id).filter((h) => h.startsWith('opt:')).length;
      if (withExit < options.length) {
        errors.push(
          `El menú ${n.id} tiene ${options.length} opciones pero solo ${withExit} con salida conectada.`,
        );
      }
    }
    if (!String(n.data?.invalidPrompt ?? '').trim()) {
      warnings.push(
        `El menú ${n.id} no tiene mensaje para respuestas no reconocidas (invalidPrompt): ` +
          `ante una nota de voz o un texto libre repetirá el menú sin explicar nada.`,
      );
    }
  }

  // --- 9. Agente IA: el marcador de salida debe ser coherente con su prompt ---
  for (const n of nodes.filter((x) => x.type === 'aiAgent')) {
    const marker = (n.data?.exitMarker as string) || '[[AGENDAR]]';
    const prompt = (n.data?.systemPrompt as string) || '';
    const usaIntenciones = Array.isArray(n.data?.exitIntents) && (n.data.exitIntents as any[]).length > 0;
    // Con intenciones declaradas el exitMarker no se usa: la salida la decide intent:<id>.
    if (!usaIntenciones && prompt && !prompt.includes(marker)) {
      errors.push(
        `El nodo ${label(n)} tiene exitMarker ${marker} pero su prompt nunca se lo pide: ` +
          `la salida por intención no se disparará jamás.`,
      );
    }
    // Intenciones declaradas: cada una genera un handle 'intent:<id>' que debe llevar
    // a algún sitio, igual que las opciones de un menú.
    const intents = Array.isArray(n.data?.exitIntents) ? (n.data.exitIntents as any[]) : [];
    for (const it of intents) {
      const id = String(it?.id ?? '').trim();
      if (!id) {
        errors.push(`El nodo ${label(n)} declara una intención sin "id".`);
        continue;
      }
      if (!handlesOf(n.id).includes(`intent:${id}`)) {
        errors.push(
          `El nodo ${label(n)} declara la intención "${id}" pero su salida intent:${id} no está conectada.`,
        );
      }
    }

    // El motor solo retira del texto visible los marcadores de [[doble corchete]].
    const withoutDoubles = prompt.replace(/\[\[[^\]]{0,60}\]\]/g, ' ');
    const leaked = [...new Set(withoutDoubles.match(/\[[A-ZÁÉÍÓÚÑ_]{3,20}\]/g) ?? [])].filter(
      (m) => m !== marker,
    );
    if (leaked.length) {
      errors.push(
        `El prompt del nodo ${label(n)} le pide emitir ${leaked.join(', ')}, que el motor no ` +
          `retira del texto: esos marcadores le llegarán al cliente.`,
      );
    }
  }

  // --- 10. Capturas: un dato por nodo, con la validación que le toca ---
  for (const n of nodes.filter((x) => x.type === 'captureInput')) {
    const prompt = String(n.data?.prompt ?? '');
    const validate = (n.data?.validate as string) || 'none';
    for (const [rx, expected] of EXPECTED_VALIDATE) {
      if (rx.test(prompt) && validate !== expected) {
        warnings.push(
          `La captura ${n.id} pide un dato de tipo ${expected} pero su validación es "${validate}".`,
        );
      }
    }
    if (!String(n.data?.invalidPrompt ?? '').trim()) {
      warnings.push(
        `La captura ${n.id} no tiene invalidPrompt: si la validación falla no le dirá al cliente qué corregir.`,
      );
    }
    if ((prompt.match(/,| y | e /gi) ?? []).length >= 2) {
      warnings.push(
        `La captura ${n.id} parece pedir varios datos a la vez ("${prompt.slice(0, 60)}"): ` +
          `si el cliente los manda en mensajes separados, los siguientes se pierden.`,
      );
    }
  }

  // --- 11. Desde el disparador se tiene que poder llegar a un final ---
  if (triggers.length === 1) {
    const seen = new Set<string>();
    const stack = [triggers[0].id];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const e of outOf(id)) stack.push(e.target);
    }
    const reachesEnd = [...seen].some((id) => TERMINAL.includes(byId.get(id)?.type ?? ''));
    if (!reachesEnd) {
      errors.push("Desde el disparador no se alcanza ningún nodo 'Fin' ni 'Transferir a humano'.");
    }
    const unreachable = nodes.filter((n) => !seen.has(n.id)).map((n) => label(n));
    if (unreachable.length) {
      warnings.push(`Nodos que nunca se alcanzan desde el disparador: ${unreachable.join(', ')}.`);
    }
  }

  return { errors, warnings };
}

/**
 * Repara automáticamente lo que es mecánico, sin adivinar intenciones de negocio.
 * Pensado para el generador automático: es preferible entregar un grafo que
 * funciona a uno "fiel al prompt" pero roto.
 *
 * Devuelve el grafo corregido y la lista de arreglos aplicados.
 */
export function autoRepairGraph(graph: FlowGraph): { graph: FlowGraph; repairs: string[] } {
  const repaired: FlowGraph = JSON.parse(JSON.stringify(graph ?? { nodes: [], edges: [] }));
  const nodes: FlowNode[] = Array.isArray(repaired.nodes) ? repaired.nodes : [];
  const edges = Array.isArray(repaired.edges) ? repaired.edges : [];
  const repairs: string[] = [];

  // 1. Aristas duplicadas (mismo origen, handle y destino).
  const seen = new Set<string>();
  const deduped = edges.filter((e) => {
    const key = `${e.source}|${e.sourceHandle || 'out'}|${e.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (deduped.length !== edges.length) {
    repairs.push(`Se eliminaron ${edges.length - deduped.length} conexiones duplicadas.`);
  }
  repaired.edges = deduped;

  // 2. Salida de error sin conectar: se deriva al primer 'handover' y, si no hay,
  //    al primer 'end'. Es mejor entregar la conversación que perderla.
  const fallback =
    nodes.find((n) => n.type === 'handover')?.id ?? nodes.find((n) => n.type === 'end')?.id;
  if (fallback) {
    for (const n of nodes) {
      if (!REQUIRE_ON_ERROR.includes(n.type)) continue;
      const hasOnError = repaired.edges.some(
        (e) => e.source === n.id && e.sourceHandle === 'onError',
      );
      if (hasOnError || n.id === fallback) continue;
      repaired.edges.push({
        id: `e_${n.id}_onError_${fallback}`,
        source: n.id,
        target: fallback,
        sourceHandle: 'onError',
        targetHandle: 'in',
      } as any);
      repairs.push(`Se conectó la salida de error de ${n.type} (${n.id}).`);
    }
  }

  // 3. Menús sin mensaje de respuesta no reconocida.
  for (const n of nodes.filter((x) => x.type === 'interactiveMenu')) {
    if (!String(n.data?.invalidPrompt ?? '').trim()) {
      n.data = {
        ...(n.data ?? {}),
        invalidPrompt:
          'No alcancé a entender esa opción. Escríbeme el número de la opción que quieres, ' +
          'o cuéntame con palabras qué necesitas.',
      };
      repairs.push(`Se añadió invalidPrompt al menú ${n.id}.`);
    }
  }

  // 4. exitMarker incoherente: si el prompt no lo menciona pero pide marcadores de
  //    corchete simple, se adopta el que el prompt realmente usa (en doble corchete).
  for (const n of nodes.filter((x) => x.type === 'aiAgent')) {
    const prompt = (n.data?.systemPrompt as string) || '';
    const marker = (n.data?.exitMarker as string) || '[[AGENDAR]]';
    if (!prompt || prompt.includes(marker)) continue;
    const withoutDoubles = prompt.replace(/\[\[[^\]]{0,60}\]\]/g, ' ');
    const candidates = [...new Set(withoutDoubles.match(/\[[A-ZÁÉÍÓÚÑ_]{3,20}\]/g) ?? [])];
    if (candidates.length === 1) {
      const core = candidates[0].replace(/^\[|\]$/g, '');
      n.data = { ...(n.data ?? {}), exitMarker: `[[${core}]]`, systemPrompt: prompt.split(candidates[0]).join(`[[${core}]]`) };
      repairs.push(`Se alineó el exitMarker del nodo ${n.id} a [[${core}]].`);
    }
  }

  return { graph: repaired, repairs };
}
