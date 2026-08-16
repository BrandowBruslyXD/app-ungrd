// Store Zustand del editor de flujos. Mantiene nodes/edges, expone los handlers
// que React Flow necesita y aplica la validación de conexiones (validation.js).
import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';
import { validateConnection } from './validation';
import { getPaletteItem } from './palette';

// Genera un id único de nodo con formato "n-<base36>-<rand>".
function genNodeId() {
  const base = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `n-${base}-${rand}`;
}

// Genera un id de arista con formato "e-<source>-<target>-<rand>".
function genEdgeId(source, target) {
  const rand = Math.random().toString(36).slice(2, 6);
  return `e-${source}-${target}-${rand}`;
}

export const useFlowStore = create((set, get) => ({
  nodes: [],
  edges: [],
  selectedId: null,
  lastError: null, // motivo de la última conexión rechazada (para feedback)

  // --- Carga / guardado del grafo activo ---
  loadGraph: (graph) => {
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];
    set({ nodes, edges, selectedId: null, lastError: null });
  },

  // Devuelve el grafo serializable con solo los campos persistibles.
  getGraph: () => {
    const { nodes, edges } = get();
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data || {},
        ...(n.style ? { style: n.style } : {}),
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
        ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
      })),
    };
  },

  // --- Handlers de React Flow ---
  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  // Valida con validation.js antes de crear la arista.
  onConnect: (connection) => {
    const { nodes, edges } = get();
    const result = validateConnection(connection, { nodes, edges });
    if (!result.ok) {
      set({ lastError: result.reason });
      return;
    }
    const edge = {
      ...connection,
      id: genEdgeId(connection.source, connection.target),
    };
    set({ edges: addEdge(edge, edges), lastError: null });
  },

  // --- Selección ---
  setSelected: (id) => set({ selectedId: id }),

  // --- Mutaciones de nodos ---
  // Añade un nodo a partir de un item de la paleta en la posición dada.
  addNode: (item, position) => {
    const def = getPaletteItem(item.type) || item;
    const node = {
      id: genNodeId(),
      type: item.type,
      position,
      data: { ...(def.defaults || {}) },
    };
    set({ nodes: [...get().nodes, node], selectedId: node.id });
    return node.id;
  },

  // Fusiona un parche en el data del nodo indicado.
  updateNodeData: (id, patch) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    });
  },

  // Elimina un nodo y todas sus aristas asociadas.
  removeNode: (id) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedId: get().selectedId === id ? null : get().selectedId,
    });
  },

  clearError: () => set({ lastError: null }),
}));
