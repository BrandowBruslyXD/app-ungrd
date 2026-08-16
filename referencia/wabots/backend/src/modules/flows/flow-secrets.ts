import { CryptoService } from '../../common/crypto/crypto.service';
import { FlowGraph } from '../../common/types/engine.types';

/**
 * Campos secretos dentro de `node.data`, por tipo de nodo. Se cifran en reposo
 * (columna `graph`) y se descifran al leer, para no exponerlos en la base de datos.
 */
const SECRET_FIELDS_BY_TYPE: Record<string, string[]> = {
  aiAgent: ['apiKey', 'fallbackApiKey'],
  reminder: ['apiKey', 'fallbackApiKey'],
};

type Direction = 'encrypt' | 'decrypt';

function transformGraph(
  graph: FlowGraph,
  crypto: CryptoService,
  direction: Direction,
): FlowGraph {
  if (!graph || !Array.isArray(graph.nodes)) return graph;

  const nodes = graph.nodes.map((node) => {
    const fields = SECRET_FIELDS_BY_TYPE[node?.type];
    if (!fields || !node?.data) return node;

    const data: Record<string, any> = { ...node.data };
    for (const field of fields) {
      const value = data[field];
      if (typeof value !== 'string' || value === '') continue;
      data[field] =
        direction === 'encrypt' ? crypto.encrypt(value) : safeDecrypt(crypto, value);
    }
    return { ...node, data };
  });

  return { ...graph, nodes };
}

/** Descifra tolerando valores en claro (heredados de antes del cifrado en reposo). */
function safeDecrypt(crypto: CryptoService, value: string): string {
  try {
    return crypto.decrypt(value);
  } catch {
    return value;
  }
}

/** Cifra los campos secretos del grafo antes de persistirlo. */
export function encryptGraphSecrets(graph: FlowGraph, crypto: CryptoService): FlowGraph {
  return transformGraph(graph, crypto, 'encrypt');
}

/** Descifra los campos secretos del grafo tras leerlo de la base de datos. */
export function decryptGraphSecrets(graph: FlowGraph, crypto: CryptoService): FlowGraph {
  return transformGraph(graph, crypto, 'decrypt');
}

/**
 * ENMASCARA los campos secretos (los deja vacíos) para NUNCA enviarlos al
 * cliente. El editor muestra el campo vacío; al guardar, si sigue vacío, se
 * preserva la key original (ver preserveEmptySecrets). Recibe un grafo YA
 * descifrado y devuelve una copia sin los valores secretos.
 */
export function maskGraphSecrets(graph: FlowGraph): FlowGraph {
  if (!graph || !Array.isArray(graph.nodes)) return graph;
  const nodes = graph.nodes.map((node) => {
    const fields = SECRET_FIELDS_BY_TYPE[node?.type];
    if (!fields || !node?.data) return node;
    const data: Record<string, any> = { ...node.data };
    for (const field of fields) {
      const v = data[field];
      // PREVIEW parcial (últimos 4): el editor muestra que hay una key guardada
      // sin revelarla entera. El char '•' NUNCA aparece en una key real, así que
      // preserveEmptySecrets lo detecta como "sin cambios" y conserva la original.
      if (typeof v === 'string' && v !== '') {
        data[field] = v.length > 4 ? `••••${v.slice(-4)}` : '••••';
      }
    }
    return { ...node, data };
  });
  return { ...graph, nodes };
}

/**
 * Al guardar, PRESERVA los secretos que el cliente envía vacíos (porque los
 * recibió enmascarados): copia el valor previo (descifrado) del mismo nodo.
 * Así editar un flujo no borra su apiKey. `incoming` y `previous` van en claro.
 */
export function preserveEmptySecrets(incoming: FlowGraph, previous?: FlowGraph): FlowGraph {
  if (!incoming || !Array.isArray(incoming.nodes) || !previous?.nodes) return incoming;
  const prevById = new Map(previous.nodes.map((n) => [n.id, n]));
  const nodes = incoming.nodes.map((node) => {
    const fields = SECRET_FIELDS_BY_TYPE[node?.type];
    if (!fields || !node?.data) return node;
    const prev = prevById.get(node.id);
    const data: Record<string, any> = { ...node.data };
    for (const field of fields) {
      const val = data[field];
      // "Sin cambios" = vacío o el PREVIEW enmascarado (contiene '•') → conserva
      // la key original. Solo si el usuario escribió una nueva (sin '•') se usa.
      const untouched =
        val === undefined || val === '' || (typeof val === 'string' && val.includes('•'));
      const prevVal = prev?.data?.[field];
      if (untouched && typeof prevVal === 'string' && prevVal !== '') data[field] = prevVal;
    }
    return { ...node, data };
  });
  return { ...incoming, nodes };
}
