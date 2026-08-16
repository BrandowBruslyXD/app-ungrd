// Validación del grafo: conexiones individuales (al conectar en el lienzo)
// y documento completo (al guardar). Garantiza un grafo sano:
// sin auto-conexión, sin duplicados, sin ciclos, respetando trigger/end.

// Comprueba si al añadir una arista source->target se formaría un ciclo,
// recorriendo el grafo resultante con DFS desde `target`.
function createsCycle(source, target, edges) {
  // Lista de adyacencia incluyendo la arista candidata.
  const adjacency = new Map();
  const addEdge = (s, t) => {
    if (!adjacency.has(s)) adjacency.set(s, []);
    adjacency.get(s).push(t);
  };
  for (const e of edges) addEdge(e.source, e.target);
  addEdge(source, target);

  // Si desde `target` se alcanza de nuevo `source`, hay ciclo.
  const stack = [target];
  const visited = new Set();
  while (stack.length) {
    const current = stack.pop();
    if (current === source) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const next = adjacency.get(current) || [];
    for (const n of next) stack.push(n);
  }
  return false;
}

// Valida una conexión propuesta de React Flow.
// connection: { source, target, sourceHandle, targetHandle }
// graph: { nodes, edges }
// Devuelve { ok: true } o { ok: false, reason }.
export function validateConnection(connection, { nodes = [], edges = [] } = {}) {
  const { source, target, sourceHandle, targetHandle } = connection || {};

  if (!source || !target) {
    return { ok: false, reason: 'Conexión incompleta.' };
  }

  // 1) Sin auto-conexión.
  if (source === target) {
    return { ok: false, reason: 'Un nodo no puede conectarse consigo mismo.' };
  }

  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);
  if (!sourceNode || !targetNode) {
    return { ok: false, reason: 'Nodo de origen o destino inexistente.' };
  }

  // 2) trigger no recibe entrada.
  if (targetNode.type === 'trigger') {
    return { ok: false, reason: 'El disparador no puede recibir conexiones.' };
  }

  // 3) end / handover no emiten salida.
  if (sourceNode.type === 'end' || sourceNode.type === 'handover') {
    return { ok: false, reason: 'Este nodo no puede tener salidas.' };
  }

  // 4) Sin aristas duplicadas (mismo origen+handle hacia mismo destino+handle).
  const duplicate = edges.some(
    (e) =>
      e.source === source &&
      e.target === target &&
      (e.sourceHandle || null) === (sourceHandle || null) &&
      (e.targetHandle || null) === (targetHandle || null),
  );
  if (duplicate) {
    return { ok: false, reason: 'Esa conexión ya existe.' };
  }

  // 5) Sin ciclos.
  if (createsCycle(source, target, edges)) {
    return { ok: false, reason: 'La conexión crearía un ciclo.' };
  }

  return { ok: true };
}

// Campos obligatorios por tipo de nodo: [clave en data, etiqueta legible].
const REQUIRED_FIELDS = {
  sendText: [['text', 'el texto del mensaje']],
  captureInput: [
    ['variable', 'la variable de destino'],
    ['prompt', 'la pregunta (prompt)'],
  ],
  aiAgent: [['systemPrompt', 'las instrucciones (systemPrompt)']],
  interactiveMenu: [['body', 'el texto/pregunta del menú']],
  httpRequest: [['url', 'la URL de la petición']],
  translateText: [['fromVar', 'la variable de origen']],
  sendFile: [['mediaUrl', 'la URL del archivo']],
  // condition se valida aparte: `right` solo es obligatorio si el operador no es 'empty'.
};

// Valida el documento completo del grafo antes de guardar.
// Devuelve un array de problemas (strings); vacío si el grafo es válido.
export function validateGraphDocument(nodes = [], edges = []) {
  const problems = [];
  const label = (n) => `${n.type} (${n.id})`;

  // 1) Debe existir exactamente un disparador.
  const triggers = nodes.filter((n) => n.type === 'trigger');
  if (triggers.length === 0) {
    problems.push('El flujo no tiene ningún nodo Disparador.');
  } else if (triggers.length > 1) {
    problems.push(`Hay ${triggers.length} nodos Disparador; debe haber solo uno.`);
  }

  // 2) Nodos condition con ambas ramas (true/false) conectadas.
  for (const n of nodes) {
    if (n.type !== 'condition') continue;
    const outs = edges.filter((e) => e.source === n.id);
    const hasTrue = outs.some((e) => e.sourceHandle === 'true');
    const hasFalse = outs.some((e) => e.sourceHandle === 'false');
    if (!hasTrue || !hasFalse) {
      const missing = [!hasTrue && 'Sí (true)', !hasFalse && 'No (false)']
        .filter(Boolean)
        .join(' y ');
      problems.push(`La condición ${n.id} no tiene conectada la salida ${missing}.`);
    }
  }

  // 3) Campos obligatorios vacíos.
  for (const n of nodes) {
    const required = REQUIRED_FIELDS[n.type];
    if (!required) continue;
    for (const [key, name] of required) {
      const value = n.data?.[key];
      if (typeof value !== 'string' || !value.trim()) {
        problems.push(`El nodo ${label(n)} no tiene ${name}.`);
      }
    }
  }
  // 3b) condition: left siempre; right solo si el operador compara contra algo.
  for (const n of nodes) {
    if (n.type === 'condition') {
      if (!String(n.data?.left ?? '').trim()) {
        problems.push(`La condición ${n.id} no tiene lado izquierdo.`);
      }
      const op = n.data?.op || '==';
      if (op !== 'empty' && !String(n.data?.right ?? '').trim()) {
        problems.push(`La condición ${n.id} no tiene lado derecho (operador "${op}").`);
      }
    }
    if (n.type === 'interactiveMenu') {
      const options = Array.isArray(n.data?.options) ? n.data.options : [];
      if (options.length === 0 || options.every((o) => !String(o?.label ?? '').trim())) {
        problems.push(`El menú ${n.id} no tiene opciones con etiqueta.`);
      }
    }
  }

  // 4) Todo nodo no-trigger debe tener al menos una entrada.
  const withInput = new Set(edges.map((e) => e.target));
  for (const n of nodes) {
    if (n.type === 'trigger') continue;
    if (!withInput.has(n.id)) {
      problems.push(`El nodo ${label(n)} no tiene conexión de entrada.`);
    }
  }

  // 5) Como máximo una arista por cada sourceHandle de un nodo.
  const outCounts = new Map();
  for (const e of edges) {
    const key = `${e.source}::${e.sourceHandle || 'out'}`;
    outCounts.set(key, (outCounts.get(key) || 0) + 1);
  }
  for (const [key, count] of outCounts) {
    if (count > 1) {
      const [source, handle] = key.split('::');
      problems.push(`El nodo ${source} tiene ${count} salidas desde el mismo conector "${handle}".`);
    }
  }

  return problems;
}
