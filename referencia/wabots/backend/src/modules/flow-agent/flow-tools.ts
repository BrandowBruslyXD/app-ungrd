/**
 * TOOLS del agente constructor de flujos (formato OpenAI/DeepSeek function-calling)
 * + el GraphDraft que las EJECUTA contra un borrador del grafo en memoria.
 *
 * Patrón tomado del agente de Telar y adaptado a nuestro modelo multi-tenant
 * (el loop corre server-side; las tools mutan un borrador que luego se persiste):
 *  - Catálogo como única verdad (getCatalog / getNodeSpec).
 *  - addNodesBatch / addEdgesBatch con `ref`s: el modelo inventa alias (refs) y
 *    recibe el mapa ref→idReal, evitando que alucine IDs y rompa conexiones.
 *  - validateGraph para autorreparación dentro del mismo turno.
 */

import { FlowEdge, FlowGraph, FlowNode, NodeType } from '../../common/types/engine.types';
import {
  CATALOG_BY_TYPE,
  NODE_CATALOG,
  VALID_NODE_TYPES,
  defaultData,
  outHandleIds,
} from './node-catalog';
import { HUMAN_PERSONA_RULES } from './flow-agent.prompt';

/** Definiciones de tools en formato OpenAI (tool-calling). */
export const FLOW_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'getCatalog',
      description:
        'Devuelve el catálogo COMPLETO de tipos de nodo disponibles con sus handles y campos. Úsalo si dudas de qué nodos existen o cómo se conectan.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getNodeSpec',
      description:
        'Devuelve la ficha detallada de UN tipo de nodo: descripción, handles de entrada/salida y todos sus campos data válidos. Consúltalo antes de crear/editar un nodo si no recuerdas sus campos.',
      parameters: {
        type: 'object',
        properties: { type: { type: 'string', enum: VALID_NODE_TYPES, description: 'Tipo de nodo a inspeccionar.' } },
        required: ['type'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getActiveFlow',
      description: 'Devuelve el estado ACTUAL del flujo en construcción (nodos y conexiones, en forma compacta).',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'addNodesBatch',
      description:
        'Agrega VARIOS nodos de una vez. Cada nodo lleva un "ref" (alias que TÚ inventas, p.ej. "saludo", "menu1") y devuelve el mapa ref→idReal para usarlo en addEdgesBatch. Posición opcional (si la omites se auto-organiza).',
      parameters: {
        type: 'object',
        properties: {
          nodes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ref: { type: 'string', description: 'Alias único de este nodo dentro del lote.' },
                type: { type: 'string', enum: VALID_NODE_TYPES, description: 'Tipo de nodo (del catálogo).' },
                data: { type: 'object', description: 'Campos data del nodo (ver getNodeSpec).' },
                position: {
                  type: 'object',
                  properties: { x: { type: 'number' }, y: { type: 'number' } },
                  description: 'Posición opcional en el lienzo.',
                },
              },
              required: ['ref', 'type'],
            },
          },
        },
        required: ['nodes'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'addEdgesBatch',
      description:
        'Conecta nodos. source/target aceptan un "ref" (de addNodesBatch) o un id real. sourceHandle es OBLIGATORIO cuando el origen tiene varias salidas (p.ej. interactiveMenu: "opt:1"; condition: "true"/"false"; integraciones: "out"/"onError").',
      parameters: {
        type: 'object',
        properties: {
          edges: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source: { type: 'string', description: 'ref o id del nodo origen.' },
                target: { type: 'string', description: 'ref o id del nodo destino.' },
                sourceHandle: { type: 'string', description: 'Handle de salida del origen (out, onError, true, false, opt:<id>).' },
                targetHandle: { type: 'string', description: 'Handle de entrada del destino (normalmente "in").' },
              },
              required: ['source', 'target'],
            },
          },
        },
        required: ['edges'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateNode',
      description: 'Actualiza los campos data (y/o label) de un nodo existente. Fusiona el patch con lo que ya tiene. No cambia el type ni el id.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'id real del nodo a editar.' },
          patch: { type: 'object', description: 'Campos data a fusionar.' },
          label: { type: 'string', description: 'Etiqueta visible opcional.' },
        },
        required: ['id', 'patch'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'removeNode',
      description: 'Elimina un nodo y todas sus conexiones.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: 'id real del nodo a eliminar.' } },
        required: ['id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'removeEdge',
      description: 'Elimina una conexión entre dos nodos.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'id del nodo origen.' },
          target: { type: 'string', description: 'id del nodo destino.' },
          sourceHandle: { type: 'string', description: 'Handle de salida (opcional, para desambiguar).' },
        },
        required: ['source', 'target'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'clearCanvas',
      description: 'Borra TODO el flujo (nodos y conexiones). Úsalo solo si vas a reconstruir desde cero o si el usuario lo pide explícitamente.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validateGraph',
      description: 'Revisa el flujo y devuelve los problemas: trigger faltante/duplicado, nodos huérfanos, conexiones inválidas, campos requeridos vacíos. Úsalo al terminar para autorreparar.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
] as const;

/** Resultado de ejecutar una tool. */
export interface ToolResult {
  ok: boolean;
  [k: string]: any;
}

/**
 * Borrador de grafo manipulable por las tools. Mantiene un mapa ref→idReal
 * para resolver alias entre lotes. Genera ids deterministas (n1, n2, …) por
 * tipo para que sean legibles y estables dentro de la sesión.
 */
export class GraphDraft {
  nodes: FlowNode[];
  edges: FlowEdge[];
  private refMap = new Map<string, string>();
  private seq = 0;

  constructor(graph?: FlowGraph) {
    this.nodes = Array.isArray(graph?.nodes) ? JSON.parse(JSON.stringify(graph!.nodes)) : [];
    this.edges = Array.isArray(graph?.edges) ? JSON.parse(JSON.stringify(graph!.edges)) : [];
    // Continúa la secuencia para no colisionar con ids existentes.
    this.seq = this.nodes.length;
  }

  toGraph(): FlowGraph {
    return { nodes: this.nodes, edges: this.edges };
  }

  /** Resuelve un ref/alias a un id real (o lo deja igual si ya es un id). */
  private resolve(refOrId: string): string {
    return this.refMap.get(refOrId) ?? refOrId;
  }

  private genId(type: NodeType): string {
    this.seq += 1;
    return `${type}_${this.seq}`;
  }

  /** Despacha una tool por nombre con sus args ya parseados. */
  execute(name: string, args: any): ToolResult {
    switch (name) {
      case 'getCatalog':
        return { ok: true, catalog: NODE_CATALOG };
      case 'getNodeSpec': {
        const spec = CATALOG_BY_TYPE[args?.type];
        if (!spec) return { ok: false, error: `Tipo desconocido: ${args?.type}` };
        // Para aiAgent se adjuntan las reglas de identidad humana: el agente
        // DEBE copiarlas al pie de la letra dentro del systemPrompt del nodo.
        // (Viven aquí y no en el prompt base para no gastar tokens en flujos sin IA.)
        return args?.type === 'aiAgent'
          ? { ok: true, spec, personaRules: HUMAN_PERSONA_RULES }
          : { ok: true, spec };
      }
      case 'getActiveFlow':
        return { ok: true, flow: this.compact() };
      case 'addNodesBatch':
        return this.addNodesBatch(args?.nodes);
      case 'addEdgesBatch':
        return this.addEdgesBatch(args?.edges);
      case 'updateNode':
        return this.updateNode(args?.id, args?.patch, args?.label);
      case 'removeNode':
        return this.removeNode(args?.id);
      case 'removeEdge':
        return this.removeEdge(args?.source, args?.target, args?.sourceHandle);
      case 'clearCanvas':
        this.nodes = [];
        this.edges = [];
        this.refMap.clear();
        return { ok: true, message: 'Lienzo vacío.' };
      case 'validateGraph':
        return { ok: true, problems: this.validate() };
      default:
        return { ok: false, error: `Tool desconocida: ${name}` };
    }
  }

  /** Vista compacta para el modelo (sin posiciones ni data verbosa). */
  private compact() {
    return {
      nodes: this.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.data?.label || CATALOG_BY_TYPE[n.type]?.label,
        ...(n.type === 'interactiveMenu' ? { options: (n.data?.options || []).map((o: any) => ({ id: o.id, label: o.label })) } : {}),
      })),
      edges: this.edges.map((e) => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle })),
    };
  }

  private addNodesBatch(items: any[]): ToolResult {
    if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'nodes debe ser un array no vacío.' };
    const created: Record<string, string> = {};
    let row = this.nodes.length;
    for (const it of items) {
      if (!it?.type || !VALID_NODE_TYPES.includes(it.type)) {
        return { ok: false, error: `Tipo inválido "${it?.type}" en ref "${it?.ref}". Usa getCatalog.` };
      }
      const id = this.genId(it.type);
      if (it.ref) this.refMap.set(it.ref, id);
      const data = { ...defaultData(it.type), ...(it.data && typeof it.data === 'object' ? it.data : {}) };
      const position = it.position && typeof it.position.x === 'number' ? it.position : { x: 80 + (row % 4) * 280, y: 80 + Math.floor(row / 4) * 160 };
      this.nodes.push({ id, type: it.type, position, data });
      created[it.ref || id] = id;
      row += 1;
    }
    return { ok: true, created, message: `${items.length} nodo(s) creado(s).` };
  }

  private addEdgesBatch(items: any[]): ToolResult {
    if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'edges debe ser un array no vacío.' };
    const errors: string[] = [];
    let added = 0;
    for (const e of items) {
      const source = this.resolve(e?.source);
      const target = this.resolve(e?.target);
      const sn = this.nodes.find((n) => n.id === source);
      const tn = this.nodes.find((n) => n.id === target);
      if (!sn) { errors.push(`source inexistente: ${e?.source}`); continue; }
      if (!tn) { errors.push(`target inexistente: ${e?.target}`); continue; }
      // Valida el sourceHandle contra los handles reales del nodo origen.
      const validHandles = outHandleIds(sn.type, sn.data);
      let sourceHandle = e?.sourceHandle;
      if (validHandles.length === 0) { errors.push(`${sn.type} (${source}) no tiene salidas; no se puede conectar.`); continue; }
      if (!sourceHandle) {
        if (validHandles.length === 1) sourceHandle = validHandles[0];
        else { errors.push(`falta sourceHandle en ${sn.type} (${source}); opciones: ${validHandles.join(', ')}`); continue; }
      }
      if (!validHandles.includes(sourceHandle)) {
        errors.push(`sourceHandle "${sourceHandle}" inválido en ${sn.type} (${source}); opciones: ${validHandles.join(', ')}`);
        continue;
      }
      const id = `e_${source}_${sourceHandle}_${target}`.replace(/[^a-zA-Z0-9_]/g, '');
      // Evita duplicados exactos.
      if (this.edges.some((x) => x.source === source && x.target === target && x.sourceHandle === sourceHandle)) continue;
      this.edges.push({ id, source, target, sourceHandle, targetHandle: e?.targetHandle || 'in' });
      added += 1;
    }
    return { ok: errors.length === 0, added, ...(errors.length ? { errors } : {}) };
  }

  private updateNode(id: string, patch: any, label?: string): ToolResult {
    const node = this.nodes.find((n) => n.id === this.resolve(id));
    if (!node) return { ok: false, error: `Nodo no encontrado: ${id}` };
    if (patch && typeof patch === 'object') node.data = { ...node.data, ...patch };
    if (label !== undefined) node.data.label = label;
    return { ok: true, node: { id: node.id, type: node.type, data: node.data } };
  }

  private removeNode(id: string): ToolResult {
    const real = this.resolve(id);
    const before = this.nodes.length;
    this.nodes = this.nodes.filter((n) => n.id !== real);
    if (this.nodes.length === before) return { ok: false, error: `Nodo no encontrado: ${id}` };
    this.edges = this.edges.filter((e) => e.source !== real && e.target !== real);
    return { ok: true, message: `Nodo ${real} eliminado.` };
  }

  private removeEdge(source: string, target: string, sourceHandle?: string): ToolResult {
    const s = this.resolve(source);
    const t = this.resolve(target);
    const before = this.edges.length;
    this.edges = this.edges.filter((e) => !(e.source === s && e.target === t && (sourceHandle ? e.sourceHandle === sourceHandle : true)));
    return { ok: this.edges.length < before, removed: before - this.edges.length };
  }

  /** Detecta problemas estructurales (para autorreparación). */
  validate(): string[] {
    const problems: string[] = [];
    const triggers = this.nodes.filter((n) => n.type === 'trigger');
    if (triggers.length === 0) problems.push('Falta el nodo trigger (disparador): todo flujo necesita exactamente uno.');
    if (triggers.length > 1) problems.push(`Hay ${triggers.length} triggers; debe haber solo uno.`);

    const ids = new Set(this.nodes.map((n) => n.id));
    for (const e of this.edges) {
      if (!ids.has(e.source)) problems.push(`Conexión con source inexistente: ${e.source}`);
      if (!ids.has(e.target)) problems.push(`Conexión con target inexistente: ${e.target}`);
      const sn = this.nodes.find((n) => n.id === e.source);
      if (sn) {
        const valid = outHandleIds(sn.type, sn.data);
        if (e.sourceHandle && !valid.includes(e.sourceHandle)) {
          problems.push(`Conexión desde ${sn.type} (${e.source}) usa handle "${e.sourceHandle}" inválido (válidos: ${valid.join(', ') || 'ninguno'}).`);
        }
      }
    }

    // Nodos huérfanos (sin entrada y no son trigger) o sin salida cuando deberían.
    const hasIncoming = new Set(this.edges.map((e) => e.target));
    const hasOutgoing = new Set(this.edges.map((e) => e.source));
    for (const n of this.nodes) {
      if (n.type !== 'trigger' && !hasIncoming.has(n.id)) {
        problems.push(`Nodo huérfano sin entrada: ${n.type} (${n.id}).`);
      }
      const outs = outHandleIds(n.type, n.data);
      if (outs.length > 0 && !hasOutgoing.has(n.id) && n.type !== 'aiAgent') {
        problems.push(`Nodo sin salida conectada: ${n.type} (${n.id}). Conéctalo a un siguiente paso o a "end".`);
      }
      // Campos requeridos vacíos.
      const spec = CATALOG_BY_TYPE[n.type];
      if (spec) {
        for (const [field, fs] of Object.entries(spec.data)) {
          if (fs.required) {
            const v = n.data?.[field];
            const empty = v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
            if (empty) problems.push(`${n.type} (${n.id}): falta el campo requerido "${field}".`);
          }
        }
      }
      // interactiveMenu: cada opción debería tener salida.
      if (n.type === 'interactiveMenu') {
        const opts = Array.isArray(n.data?.options) ? n.data.options : [];
        for (const o of opts) {
          const handle = `opt:${o.id}`;
          if (!this.edges.some((e) => e.source === n.id && e.sourceHandle === handle)) {
            problems.push(`Menú (${n.id}): la opción "${o.label || o.id}" (${handle}) no está conectada a ningún camino.`);
          }
        }
      }
    }
    return problems;
  }
}
