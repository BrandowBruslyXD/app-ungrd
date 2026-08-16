// Editor visual de flujos a pantalla completa.
// Layout en CSS Grid:
//   Shell = grid de columnas: [Paleta | split | Centro(1fr) | split | Propiedades | split | Chat]
//   Centro = grid de filas:   [Lienzo(1fr) | split horizontal | Consola inferior]
// La consola va DENTRO del editor, debajo del lienzo (no overlay).
// Cada panel se colapsa a un "rail" delgado con etiqueta vertical.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

import api from '../lib/api';
import { useFlowStore } from '../flow/store';
import { validateGraphDocument } from '../flow/validation';
import { PALETTE } from '../flow/palette';
import GenericNode from '../flow/nodes/GenericNode';
import Palette, { DND_MIME } from '../flow/Palette.jsx';
import PropertiesPanel from '../flow/PropertiesPanel';
import ChatPreview from '../flow/ChatPreview';
import BuilderChat from '../flow/BuilderChat.jsx';
import Resizer from '../flow/Resizer.jsx';
import CalendarModal from '../flow/CalendarModal.jsx';
import EditorConsole from '../flow/EditorConsole.jsx';

// --- Constantes de layout (tamaños por defecto + límites) ---
const PALETTE_DEFAULT = 220;
const PALETTE_MIN = 160;
const PALETTE_MAX = 360;
// Propiedades: columna propia a la derecha del lienzo.
const PROPS_DEFAULT = 320;
const PROPS_MIN = 260;
const PROPS_MAX = 520;
// Vista previa (chat): columna independiente, la más a la derecha.
const PREVIEW_DEFAULT = 360;
const PREVIEW_MIN = 300;
const PREVIEW_MAX = 520;
// Constructor IA (chat que arma el flujo): columna independiente.
const BUILDER_DEFAULT = 380;
const BUILDER_MIN = 320;
const BUILDER_MAX = 560;
// Consola inferior (altura).
const BOTTOM_DEFAULT = 220;
const BOTTOM_MIN = 120;
// Ancho del rail colapsado.
const RAIL = 32;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Rail delgado para un panel colapsado: etiqueta vertical clicable.
// `dir` controla a qué lado va el borde y el icono de expandir.
function CollapsedRail({ label, icon, onExpand, orientation = 'vertical' }) {
  // orientation 'vertical' = rail de columna (alto completo, ancho fino).
  // orientation 'horizontal' = rail de fila (ancho completo, alto fino).
  if (orientation === 'horizontal') {
    return (
      <div
        className="flex w-full shrink-0 cursor-pointer items-center gap-2 border-t border-slate-200/80 bg-white/80 px-3 text-slate-600 backdrop-blur hover:bg-slate-50"
        style={{ height: RAIL }}
        onClick={onExpand}
        title={`Expandir ${label}`}
      >
        <span>{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
    );
  }
  return (
    <div
      className="flex h-full shrink-0 cursor-pointer flex-col items-center gap-3 border-x border-slate-200/80 bg-white/80 py-3 backdrop-blur hover:bg-slate-50"
      style={{ width: RAIL }}
      onClick={onExpand}
      title={`Expandir ${label}`}
    >
      <span className="text-slate-600">{icon}</span>
      <span
        className="text-[10px] font-semibold uppercase tracking-wider text-slate-500"
        style={{ writingMode: 'vertical-rl' }}
      >
        {label}
      </span>
    </div>
  );
}

// Cabecera reutilizable de panel: título + botón de colapsar.
function PanelHeader({ title, onCollapse, collapseIcon = '«', side = 'left' }) {
  const btn = onCollapse ? (
    <button
      className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      onClick={onCollapse}
      title="Colapsar panel"
    >
      {collapseIcon}
    </button>
  ) : null;
  return (
    <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-3 py-2 backdrop-blur">
      {side === 'right' && btn}
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </span>
      {side === 'left' && btn}
    </div>
  );
}

// Todos los tipos del catálogo apuntan al mismo componente genérico.
const nodeTypes = PALETTE.reduce((acc, item) => {
  acc[item.type] = GenericNode;
  return acc;
}, {});

// Lienzo interno (necesita el contexto de ReactFlowProvider).
function EditorCanvas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const addNode = useFlowStore((s) => s.addNode);
  const setSelected = useFlowStore((s) => s.setSelected);
  const loadGraph = useFlowStore((s) => s.loadGraph);
  const getGraph = useFlowStore((s) => s.getGraph);
  const lastError = useFlowStore((s) => s.lastError);
  const clearError = useFlowStore((s) => s.clearError);
  const selectedId = useFlowStore((s) => s.selectedId);

  const [flowName, setFlowName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  // Error del último intento de guardado (red/servidor o validación).
  const [saveError, setSaveError] = useState(null);
  // Cambios sin guardar: se compara el grafo actual con el último guardado.
  const [dirty, setDirty] = useState(false);
  const savedSnapshotRef = useRef(null);
  // El chat de prueba abre por defecto sólo en pantallas anchas.
  const [showPreview, setShowPreview] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 1100,
  );
  const [showBuilder, setShowBuilder] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  // Empresa dueña del flujo (puede ser null si es plantilla sin tenant).
  const [flowTenantId, setFlowTenantId] = useState(null);
  // Camino recorrido en el último turno del simulador: nodos visitados + nodo actual.
  const [activeTrace, setActiveTrace] = useState({ nodes: [], current: null });

  // --- Estado del layout (tamaños en px + colapsos) ---
  const [paletteW, setPaletteW] = useState(PALETTE_DEFAULT);
  const [propsW, setPropsW] = useState(PROPS_DEFAULT);
  const [previewW, setPreviewW] = useState(PREVIEW_DEFAULT);
  const [builderW, setBuilderW] = useState(BUILDER_DEFAULT);
  const [bottomH, setBottomH] = useState(BOTTOM_DEFAULT);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  // Viewport angosto (tablet/móvil): los paneles laterales pasan a overlays
  // para que el lienzo conserve todo el ancho disponible.
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1100,
  );

  // Responsivo: al ENTRAR en viewport angosto colapsa paleta/consola y cierra
  // el chat (sólo en la transición, para no pisar lo que el usuario reabra).
  useEffect(() => {
    let wasNarrow = window.innerWidth < 1100;
    const apply = () => {
      const narrow = window.innerWidth < 1100;
      setIsNarrow(narrow);
      if (narrow && !wasNarrow) {
        setPaletteCollapsed(true);
        setConsoleCollapsed(true);
        setShowPreview(false);
      }
      wasNarrow = narrow;
    };
    if (wasNarrow) {
      setPaletteCollapsed(true);
      setConsoleCollapsed(true);
    }
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  // Carga el flujo y vuelca su graph al store.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get(`/flows/${id}`);
        const flow = res.data?.data ?? res.data; // payload real en res.data.data
        if (!active) return;
        setFlowName(flow?.name || 'Flujo');
        setFlowTenantId(flow?.tenantId || null);
        loadGraph(flow?.graph || { nodes: [], edges: [] });
        // Snapshot inicial: referencia para detectar cambios sin guardar.
        savedSnapshotRef.current = JSON.stringify(getGraph());
        setDirty(false);
      } catch {
        if (active) setFlowName('Flujo');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, loadGraph, getGraph]);

  // Marca cambios sin guardar comparando el grafo actual con el snapshot
  // del último guardado (incluye posiciones, que también se persisten).
  useEffect(() => {
    if (savedSnapshotRef.current == null) return;
    setDirty(JSON.stringify(getGraph()) !== savedSnapshotRef.current);
  }, [nodes, edges, getGraph]);

  // Con cambios sin guardar, avisa antes de cerrar/recargar la pestaña.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // Limpia el error de conexión tras unos segundos.
  useEffect(() => {
    if (!lastError) return;
    const t = setTimeout(clearError, 3000);
    return () => clearTimeout(t);
  }, [lastError, clearError]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Suelta un nodo de la paleta en la posición del cursor.
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData(DND_MIME);
      if (!raw) return;
      let item;
      try {
        item = JSON.parse(raw);
      } catch {
        return;
      }
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(item, position);
    },
    [screenToFlowPosition, addNode],
  );

  const onSave = useCallback(async () => {
    const graph = getGraph();
    // Validación del documento: informa los problemas pero permite guardar
    // igualmente (no bloquea el trabajo en curso).
    const problems = validateGraphDocument(graph.nodes, graph.edges);
    if (problems.length > 0) {
      setSaveError(`El flujo tiene problemas:\n• ${problems.join('\n• ')}`);
      const proceed = window.confirm(
        `El flujo tiene problemas:\n\n• ${problems.join('\n• ')}\n\n¿Guardar de todos modos?`,
      );
      if (!proceed) return;
    }
    setSaving(true);
    try {
      await api.patch(`/flows/${id}`, { graph });
      setSavedAt(new Date());
      setSaveError(null);
      savedSnapshotRef.current = JSON.stringify(graph);
      setDirty(false);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error desconocido';
      setSaveError(`No se pudo guardar el flujo: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [id, getGraph]);

  // Vuelve al listado confirmando primero si hay cambios sin guardar.
  const onBack = useCallback(() => {
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Salir de todos modos?')) return;
    navigate('/flows');
  }, [dirty, navigate]);

  const onSelectionChange = useCallback(
    ({ nodes: sel }) => setSelected(sel?.[0]?.id || null),
    [setSelected],
  );

  const minimapColor = useMemo(() => () => '#25d366', []);

  // ¿Hay un camino activo que resaltar? (preview abierto + trace con nodos)
  const hasTrace = showPreview && activeTrace.nodes.length > 0;

  // Aristas que conectan nodos consecutivos del trace (nodes[i] → nodes[i+1]).
  const tracedEdgeIds = useMemo(() => {
    if (!hasTrace) return new Set();
    const seq = activeTrace.nodes;
    const ids = new Set();
    for (let i = 0; i < seq.length - 1; i += 1) {
      const e = edges.find((x) => x.source === seq[i] && x.target === seq[i + 1]);
      if (e) ids.add(e.id);
    }
    return ids;
  }, [hasTrace, activeTrace.nodes, edges]);

  // Nodos con estilo resaltado: verde para el camino, ámbar para el paso actual.
  const displayNodes = useMemo(() => {
    if (!hasTrace) return nodes;
    const inTrace = new Set(activeTrace.nodes);
    return nodes.map((n) => {
      if (!inTrace.has(n.id)) return n;
      const isCurrent = n.id === activeTrace.current;
      return {
        ...n,
        style: {
          ...n.style,
          boxShadow: isCurrent
            ? '0 0 0 3px #fbbf24, 0 0 12px #fbbf2488' /* warn */
            : '0 0 0 2px #25d366' /* brand */,
          borderRadius: 8,
        },
      };
    });
  }, [hasTrace, nodes, activeTrace.nodes, activeTrace.current]);

  // Aristas con estilo resaltado: trazo verde grueso y animado.
  const displayEdges = useMemo(() => {
    if (!hasTrace) return edges;
    return edges.map((e) =>
      tracedEdgeIds.has(e.id)
        ? { ...e, animated: true, style: { ...e.style, stroke: '#25d366', strokeWidth: 3 } }
        : e,
    );
  }, [hasTrace, edges, tracedEdgeIds]);

  // --- Plantilla de columnas del shell ---
  // [Paleta | split | Centro(1fr) | split? | Propiedades | split? | Chat]
  // Las zonas opcionales se omiten cuando no aplican (selectedId / showPreview).
  const gridTemplateColumns = useMemo(() => {
    const cols = [];
    // Paleta + su splitter (rail si colapsada; en angosto SIEMPRE rail:
    // la paleta expandida se muestra como overlay).
    cols.push(isNarrow || paletteCollapsed ? `${RAIL}px` : `${paletteW}px`, '6px');
    // Centro flexible.
    cols.push('1fr');
    // En viewport angosto los paneles laterales NO ocupan columnas
    // (se renderizan como overlays) → el lienzo conserva el ancho.
    if (!isNarrow) {
      // Propiedades (sólo con nodo seleccionado): splitter + columna.
      if (selectedId) cols.push('6px', `${propsW}px`);
      // Chat (toggle): splitter + columna.
      if (showPreview) cols.push('6px', `${previewW}px`);
      // Constructor IA (toggle): splitter + columna.
      if (showBuilder) cols.push('6px', `${builderW}px`);
    }
    return cols.join(' ');
  }, [isNarrow, paletteCollapsed, paletteW, selectedId, propsW, showPreview, previewW, showBuilder, builderW]);

  // --- Plantilla de filas del centro ---
  // [Lienzo(1fr) | split horizontal | Consola]; rail si colapsada.
  const centerTemplateRows = useMemo(() => {
    if (consoleCollapsed) return `1fr ${RAIL}px`;
    return `1fr 6px ${bottomH}px`;
  }, [consoleCollapsed, bottomH]);

  return (
    <div className="grid h-screen w-screen grid-rows-[auto_1fr] bg-[#f0f4fa] text-slate-800">
      {/* Barra superior (header / toolbar) */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-white/80 px-4 py-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button className="btn-ghost px-3 py-1.5" onClick={onBack}>
            ← Volver
          </button>
          <h1 className="text-sm font-semibold tracking-tight">{loading ? 'Cargando…' : flowName}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty && !loading ? (
            <span
              className="flex items-center gap-1.5 text-xs text-warn"
              title="Hay cambios sin guardar"
            >
              <span className="h-2 w-2 rounded-full bg-warn" />
              Sin guardar
            </span>
          ) : (
            savedAt && (
              <span className="text-xs text-slate-500">
                Guardado {savedAt.toLocaleTimeString()}
              </span>
            )
          )}
          {/* Toggles de paneles */}
          <button
            className={paletteCollapsed ? 'btn-ghost' : 'btn-primary'}
            onClick={() => setPaletteCollapsed((v) => !v)}
            title="Mostrar/ocultar la paleta de nodos"
          >
            🧩 Paleta
          </button>
          <button
            className={showBuilder ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setShowBuilder((v) => !v)}
            title="Pídele a la IA que arme o edite el flujo por ti"
          >
            🤖 Constructor IA
          </button>
          <button
            className={showPreview ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setShowPreview((v) => !v)}
            title="Probar el flujo como en WhatsApp"
          >
            💬 Probar
          </button>
          <button
            className={consoleCollapsed ? 'btn-ghost' : 'btn-primary'}
            onClick={() => setConsoleCollapsed((v) => !v)}
            title="Mostrar/ocultar la consola inferior (actividad y errores)"
          >
            🗒 Consola
          </button>
          <button
            className={showCalendar ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setShowCalendar((v) => !v)}
            title="Ver el calendario de la empresa dueña del flujo"
          >
            📅 Calendario
          </button>
          <button className="btn-primary" onClick={onSave} disabled={saving || loading}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </header>

      {/* Cuerpo: grid de columnas */}
      <div
        className="grid min-h-0 overflow-hidden"
        style={{ gridTemplateColumns }}
      >
        {/* === Columna 1: Paleta (rail si colapsada o viewport angosto) === */}
        {isNarrow || paletteCollapsed ? (
          <CollapsedRail
            label="Nodos"
            icon="»"
            onExpand={() => setPaletteCollapsed(false)}
          />
        ) : (
          <div className="flex min-h-0 flex-col border-r border-slate-200/80 bg-white">
            <PanelHeader
              title="Nodos"
              collapseIcon="«"
              side="left"
              onCollapse={() => setPaletteCollapsed(true)}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <Palette />
            </div>
          </div>
        )}
        {/* Splitter de la paleta (no actúa cuando está colapsada) */}
        <Resizer
          orientation="vertical"
          onResize={(d) =>
            !paletteCollapsed &&
            setPaletteW((w) => clamp(w + d, PALETTE_MIN, PALETTE_MAX))
          }
        />

        {/* === Columna 2: Centro = grid de filas [Lienzo | split | Consola] === */}
        <div
          className="grid min-w-0 min-h-0"
          style={{ gridTemplateRows: centerTemplateRows }}
        >
          {/* --- Fila 1: Lienzo (ReactFlow) --- */}
          <div
            ref={wrapperRef}
            className="relative min-w-0 min-h-0"
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            {(lastError || saveError) && (
              <div className="absolute left-1/2 top-3 z-10 flex max-w-[85%] -translate-x-1/2 flex-col items-center gap-2">
                {lastError && (
                  <div className="rounded-xl border border-danger/40 bg-danger/15 px-3 py-2 text-xs text-danger shadow-soft backdrop-blur-md">
                    {lastError}
                  </div>
                )}
                {saveError && (
                  <div className="flex items-start gap-2 whitespace-pre-line rounded-xl border border-danger/40 bg-danger/15 px-3 py-2 text-xs text-danger shadow-soft backdrop-blur-md">
                    <span className="min-w-0 flex-1">{saveError}</span>
                    <button
                      className="shrink-0 rounded px-1 hover:bg-danger/20"
                      onClick={() => setSaveError(null)}
                      title="Cerrar aviso"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Mini-leyenda del resaltado (solo cuando hay un camino activo). */}
            {hasTrace && (
              <div className="glass absolute bottom-3 left-3 z-10 rounded-lg px-2.5 py-1 text-[10px] text-slate-600">
                🟢 camino · 🟠 paso actual
              </div>
            )}
            <ReactFlow
              nodes={displayNodes}
              edges={displayEdges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              onPaneClick={() => setSelected(null)}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#cbd5e1" gap={22} size={1.5} />
              <Controls />
              <MiniMap
                pannable
                zoomable
                nodeColor={minimapColor}
                maskColor="rgba(7,10,17,0.6)"
                style={{ background: '#f8fafc' }}
              />
            </ReactFlow>
          </div>

          {/* --- Consola inferior: rail si colapsada, o split horizontal + panel --- */}
          {consoleCollapsed ? (
            <CollapsedRail
              label="Consola"
              icon="▴"
              orientation="horizontal"
              onExpand={() => setConsoleCollapsed(false)}
            />
          ) : (
            <>
              {/* Splitter horizontal: ajusta la altura de la consola (clamp a 60% alto) */}
              <Resizer
                orientation="horizontal"
                onResize={(d) =>
                  setBottomH((h) =>
                    clamp(h - d, BOTTOM_MIN, Math.round(window.innerHeight * 0.6)),
                  )
                }
              />
              <div className="min-h-0 border-t border-slate-200/80">
                <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-3 py-1 backdrop-blur">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Consola
                  </span>
                  <button
                    className="grid h-7 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => setConsoleCollapsed(true)}
                    title="Colapsar consola"
                  >
                    ▾
                  </button>
                </div>
                <div className="min-h-0" style={{ height: 'calc(100% - 28px)' }}>
                  <EditorConsole tenantId={flowTenantId} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* === Columna 3: Propiedades (sólo con nodo seleccionado) === */}
        {!isNarrow && selectedId && (
          <>
            <Resizer
              orientation="vertical"
              onResize={(d) => setPropsW((w) => clamp(w - d, PROPS_MIN, PROPS_MAX))}
            />
            <div className="flex min-h-0 flex-col border-l border-slate-200/80 bg-white">
              <PanelHeader title="Propiedades" />
              {/* El scroll vive dentro de PropertiesPanel (un solo contenedor). */}
              <div className="min-h-0 flex-1 overflow-hidden">
                <PropertiesPanel />
              </div>
            </div>
          </>
        )}

        {/* === Columna 4: Chat (toggle, la más a la derecha) === */}
        {!isNarrow && showPreview && (
          <>
            <Resizer
              orientation="vertical"
              onResize={(d) => setPreviewW((w) => clamp(w - d, PREVIEW_MIN, PREVIEW_MAX))}
            />
            <div className="flex min-h-0 flex-col border-l border-slate-200/80 bg-white">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ChatPreview
                  getGraph={getGraph}
                  tenantId={flowTenantId}
                  flowId={id}
                  graphKey={`${nodes.length}:${edges.length}`}
                  onClose={() => setShowPreview(false)}
                  onTrace={(trace, current) => setActiveTrace({ nodes: trace || [], current })}
                />
              </div>
            </div>
          </>
        )}

        {/* === Columna 5: Constructor IA (toggle) === */}
        {!isNarrow && showBuilder && (
          <>
            <Resizer
              orientation="vertical"
              onResize={(d) => setBuilderW((w) => clamp(w - d, BUILDER_MIN, BUILDER_MAX))}
            />
            <div className="flex min-h-0 flex-col border-l border-slate-200/80 bg-white">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <BuilderChat
                  getGraph={getGraph}
                  applyGraph={(g) => loadGraph(g)}
                  onClose={() => setShowBuilder(false)}
                  context={{ flowName }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* === Overlays (viewport angosto): paneles laterales a casi pantalla completa === */}
      {isNarrow && !paletteCollapsed && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setPaletteCollapsed(true)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,320px)] flex-col border-r border-slate-200/80 bg-white shadow-lift animate-fade-in-up">
            <PanelHeader title="Nodos" collapseIcon="✕" side="left" onCollapse={() => setPaletteCollapsed(true)} />
            <div className="min-h-0 flex-1 overflow-hidden">
              <Palette />
            </div>
          </aside>
        </div>
      )}
      {isNarrow && (selectedId || showBuilder || showPreview) && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => {
              if (selectedId) setSelected(null);
              else if (showBuilder) setShowBuilder(false);
              else setShowPreview(false);
            }}
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(92vw,380px)] flex-col border-l border-slate-200/80 bg-white shadow-lift animate-fade-in-up">
            {/* Prioridad: Propiedades > Constructor IA > Chat de prueba */}
            {selectedId ? (
              <>
                <PanelHeader title="Propiedades" collapseIcon="✕" onCollapse={() => setSelected(null)} />
                {/* El scroll vive dentro de PropertiesPanel (un solo contenedor). */}
                <div className="min-h-0 flex-1 overflow-hidden">
                  <PropertiesPanel />
                </div>
              </>
            ) : showBuilder ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <BuilderChat
                  getGraph={getGraph}
                  applyGraph={(g) => loadGraph(g)}
                  onClose={() => setShowBuilder(false)}
                  context={{ flowName }}
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ChatPreview
                  getGraph={getGraph}
                  tenantId={flowTenantId}
                  flowId={id}
                  graphKey={`${nodes.length}:${edges.length}`}
                  onClose={() => setShowPreview(false)}
                  onTrace={(trace, current) => setActiveTrace({ nodes: trace || [], current })}
                />
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Modal del calendario de la empresa dueña del flujo (overlay centrado). */}
      {showCalendar && (
        <CalendarModal tenantId={flowTenantId} onClose={() => setShowCalendar(false)} />
      )}
    </div>
  );
}

export default function FlowEditorPage() {
  return (
    <ReactFlowProvider>
      <EditorCanvas />
    </ReactFlowProvider>
  );
}
