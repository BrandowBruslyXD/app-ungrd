// Panel lateral derecho que edita el `data` del nodo seleccionado.
// Actúa como dispatcher: elige el sub-formulario según el NodeType
// (src/flow/forms/*) y persiste los cambios llamando a updateNodeData del store.
import { useFlowStore } from './store';
import { getPaletteItem, GROUP_META } from './palette';
import { outHandles } from './handles';
import VarField from './VarField';
import { Field } from './forms/fields.jsx';
import TriggerForm from './forms/TriggerForm.jsx';
import MenuForm from './forms/MenuForm.jsx';
import ConditionForm from './forms/ConditionForm.jsx';
import AiAgentForm from './forms/AiAgentForm.jsx';
import HttpForm from './forms/HttpForm.jsx';
import GmailForm from './forms/GmailForm.jsx';
import CalendarForm from './forms/CalendarForm.jsx';
import ReminderForm from './forms/ReminderForm.jsx';

/**
 * Recolecta las variables/atributos que PRODUCE el flujo (de todos los nodos),
 * para ofrecerlas como fichas insertables. Así no hay que escribir {{...}}
 * a mano.
 */
function collectVariables(nodes) {
  const out = new Set();
  for (const n of nodes || []) {
    const d = n.data || {};
    switch (n.type) {
      case 'captureInput':
        if (d.variable) out.add(d.variable);
        break;
      case 'interactiveMenu':
        out.add(d.saveTo || `${n.id}_opcion`);
        break;
      case 'aiAgent':
        out.add(d.saveTo || 'aiReply');
        break;
      case 'httpRequest':
        out.add(d.saveTo || 'httpResult');
        break;
      case 'calendar':
        out.add(d.saveTo || 'cita');
        break;
      case 'transcribeAudio':
        out.add(d.saveTo || 'transcripcion');
        break;
      case 'ocrImage':
        out.add(d.saveTo || 'textoImagen');
        break;
      case 'translateText':
        out.add(d.saveTo || 'traduccion');
        break;
      case 'receiveFile':
        out.add(d.saveTo || 'file');
        break;
      default:
        break;
    }
  }
  // Variables SIEMPRE disponibles (atributos del tenant inyectados por el motor).
  out.add('clienteEmail'); // correo del cliente-empresa (para invitaciones)
  out.add('contacto'); // teléfono del contacto que escribe
  return [...out].filter(Boolean);
}

export default function PropertiesPanel() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const selectedId = useFlowStore((s) => s.selectedId);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const removeNode = useFlowStore((s) => s.removeNode);

  const node = nodes.find((n) => n.id === selectedId);

  if (!node) {
    return (
      <aside className="flex h-full w-full min-h-0 flex-col bg-white">
        <div className="border-b border-slate-200/80 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Propiedades</h2>
        </div>
        <div className="p-4 text-sm text-slate-500">
          Selecciona un nodo para editar sus propiedades.
        </div>
      </aside>
    );
  }

  const def = getPaletteItem(node.type);
  const meta = GROUP_META[def?.group] || {};
  const data = node.data || {};
  const patch = (p) => updateNodeData(node.id, p);

  // Variables del flujo: se pasan a cada VarField, que tiene su propio
  // insertor de fichas.
  const vars = collectVariables(nodes);

  return (
    <aside className="flex h-full w-full min-h-0 flex-col overflow-y-auto bg-white">
      <div className="border-b border-slate-200/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <span>{meta.emoji}</span>
          <h2 className="text-sm font-semibold text-slate-900">{def?.label || node.type}</h2>
        </div>
        <p className="text-[11px] text-slate-500">{node.id}</p>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <NodeForm type={node.type} data={data} patch={patch} vars={vars} />
      </div>

      {/* Caminos / casos: a qué nodo lleva cada salida del nodo seleccionado. */}
      <NodeCases node={node} edges={edges} nodes={nodes} />

      <div className="mt-auto border-t border-slate-200/80 p-4">
        <button
          type="button"
          className="btn-ghost w-full text-danger hover:text-danger"
          onClick={() => removeNode(node.id)}
        >
          Eliminar nodo
        </button>
      </div>
    </aside>
  );
}

// Lista las salidas (casos) del nodo seleccionado y a qué nodo lleva cada una.
// Ayuda al admin a ver de un vistazo las ramas conectadas y las que faltan.
function NodeCases({ node, edges, nodes }) {
  const outs = outHandles(node.type, node.data || {});

  // Nodos sin salidas (end / handover): el flujo termina aquí.
  if (outs.length === 0) {
    return (
      <div className="border-t border-slate-200/80 px-4 py-3">
        <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">
          Caminos / casos
        </p>
        <p className="text-xs text-slate-500">Este nodo finaliza el flujo.</p>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200/80 px-4 py-3">
      <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">
        Caminos / casos
      </p>
      <div className="flex flex-col gap-1.5">
        {outs.map((h) => {
          // Resuelve el destino por arista: source = este nodo, sourceHandle = h.id.
          const edge = edges.find(
            (e) => e.source === node.id && (e.sourceHandle || 'out') === h.id,
          );
          const target = edge ? nodes.find((n) => n.id === edge.target) : null;
          const targetLabel = target
            ? getPaletteItem(target.type)?.label || target.id
            : null;
          const handleLabel = h.label || h.id;
          return (
            <div key={h.id} className="flex items-center gap-1.5 text-xs">
              <span className="shrink-0 rounded bg-slate-900/[0.04] px-1.5 py-0.5 text-[11px] text-accent">
                {handleLabel}
              </span>
              <span className="text-slate-500">→</span>
              {target ? (
                <span className="truncate text-slate-700">{targetLabel}</span>
              ) : (
                <span className="text-warn">— sin conectar —</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Selecciona el formulario por tipo.
function NodeForm({ type, data, patch, vars }) {
  switch (type) {
    case 'trigger':
      return <TriggerForm data={data} patch={patch} />;
    case 'sendText':
      return (
        <Field label="Texto del mensaje">
          <VarField
            multiline
            vars={vars}
            value={data.text || ''}
            placeholder="Escribe el mensaje. Usa variables."
            onChange={(next) => patch({ text: next })}
          />
        </Field>
      );
    case 'interactiveMenu':
      return <MenuForm data={data} patch={patch} vars={vars} />;
    case 'captureInput':
      return (
        <>
          <Field label="Pregunta (prompt)">
            <VarField
              multiline
              vars={vars}
              value={data.prompt || ''}
              onChange={(next) => patch({ prompt: next })}
            />
          </Field>
          <Field label="Guardar en variable">
            <input
              className="input"
              value={data.variable || ''}
              placeholder="nombreVariable"
              onChange={(e) => patch({ variable: e.target.value })}
            />
          </Field>
          <Field label="Validación">
            <select
              className="input"
              value={data.validate || 'none'}
              onChange={(e) => patch({ validate: e.target.value })}
            >
              <option value="none">Ninguna</option>
              <option value="date">Fecha/hora (rechaza pasado)</option>
              <option value="name">Nombre real (anti-bromas)</option>
              <option value="email">Correo</option>
              <option value="phone">Teléfono</option>
            </select>
          </Field>
          <Field label="Mensaje si es inválido (opcional)">
            <input
              className="input"
              value={data.invalidPrompt || ''}
              onChange={(e) => patch({ invalidPrompt: e.target.value })}
            />
          </Field>
        </>
      );
    case 'condition':
      return <ConditionForm data={data} patch={patch} vars={vars} />;
    case 'aiAgent':
      return <AiAgentForm data={data} patch={patch} vars={vars} />;
    case 'httpRequest':
      return <HttpForm data={data} patch={patch} vars={vars} />;
    case 'gmail':
      return <GmailForm data={data} patch={patch} vars={vars} />;
    case 'calendar':
      return <CalendarForm data={data} patch={patch} vars={vars} />;
    case 'reminder':
      return <ReminderForm data={data} patch={patch} vars={vars} />;
    case 'sendFile':
      return (
        <>
          <Field label="URL / referencia del archivo">
            <input
              className="input"
              value={data.mediaUrl || ''}
              onChange={(e) => patch({ mediaUrl: e.target.value })}
            />
          </Field>
          <Field label="Pie (caption)">
            <input
              className="input"
              value={data.caption || ''}
              onChange={(e) => patch({ caption: e.target.value })}
            />
          </Field>
        </>
      );
    case 'receiveFile':
      return (
        <Field label="Guardar archivo en variable">
          <input
            className="input"
            value={data.saveTo || ''}
            onChange={(e) => patch({ saveTo: e.target.value })}
          />
        </Field>
      );
    case 'transcribeAudio':
      return (
        <>
          <Field label="Guardar texto en">
            <input
              className="input"
              value={data.saveTo || ''}
              placeholder="transcripcion"
              onChange={(e) => patch({ saveTo: e.target.value })}
            />
          </Field>
          <p className="text-[11px] text-slate-500">
            Transcribe el audio entrante de WhatsApp con Whisper (modelo
            multilingüe) de forma 100% offline y <b>detecta el idioma
            automáticamente</b> (español, inglés, francés, etc.). No usa API
            externa. Sale por <b>Error</b> si el mensaje no trae un audio.
          </p>
        </>
      );
    case 'ocrImage':
      return (
        <>
          <Field label="Guardar texto en">
            <input
              className="input"
              value={data.saveTo || ''}
              placeholder="textoImagen"
              onChange={(e) => patch({ saveTo: e.target.value })}
            />
          </Field>
          <Field label="Idioma (OCR)">
            <input
              className="input"
              value={data.lang || 'spa+eng'}
              placeholder="spa+eng"
              onChange={(e) => patch({ lang: e.target.value })}
            />
          </Field>
          <p className="text-[11px] text-slate-500">
            Extrae el texto de la imagen entrante (comprobantes, etc.) con
            tesseract.js de forma offline. Puedes combinar idiomas (p.ej.
            <code> spa+eng+fra</code>). Sale por <b>Error</b> si no hay imagen.
          </p>
        </>
      );
    case 'translateText':
      return (
        <>
          <Field label="Texto a traducir (variable)">
            <input
              className="input"
              value={data.fromVar || ''}
              placeholder="vacío = mensaje entrante (p.ej. transcripcion)"
              onChange={(e) => patch({ fromVar: e.target.value })}
            />
          </Field>
          <Field label="Idioma origen">
            <select
              className="input"
              value={data.sourceLang || 'auto'}
              onChange={(e) => patch({ sourceLang: e.target.value })}
            >
              <option value="auto">Detectar automáticamente</option>
              <option value="es">Español</option>
              <option value="en">Inglés</option>
              <option value="fr">Francés</option>
              <option value="pt">Portugués</option>
              <option value="de">Alemán</option>
              <option value="it">Italiano</option>
              <option value="zh">Chino</option>
              <option value="ja">Japonés</option>
              <option value="ru">Ruso</option>
              <option value="ar">Árabe</option>
            </select>
          </Field>
          <Field label="Idioma destino">
            <select
              className="input"
              value={data.targetLang || 'es'}
              onChange={(e) => patch({ targetLang: e.target.value })}
            >
              <option value="es">Español</option>
              <option value="en">Inglés</option>
              <option value="fr">Francés</option>
              <option value="pt">Portugués</option>
              <option value="de">Alemán</option>
              <option value="it">Italiano</option>
              <option value="zh">Chino</option>
              <option value="ja">Japonés</option>
              <option value="ru">Ruso</option>
              <option value="ar">Árabe</option>
            </select>
          </Field>
          <Field label="Guardar traducción en">
            <input
              className="input"
              value={data.saveTo || ''}
              placeholder="traduccion"
              onChange={(e) => patch({ saveTo: e.target.value })}
            />
          </Field>
          <p className="text-[11px] text-slate-500">
            Traduce el texto 100% offline (NLLB). Detecta el idioma origen si
            eliges <b>auto</b>. No usa ninguna IA/API externa ni gasta tokens.
          </p>
        </>
      );
    case 'delay':
      return (
        <Field label="Espera (milisegundos)">
          <input
            type="number"
            min="0"
            className="input"
            value={data.ms ?? 0}
            onChange={(e) => patch({ ms: Number(e.target.value) })}
          />
        </Field>
      );
    case 'handover':
      return (
        <>
          <Field label="Mensaje al cliente (opcional)">
            <textarea
              className="input min-h-[60px]"
              value={data.message || ''}
              placeholder="Un momento, te comunico con un asesor…"
              onChange={(e) => patch({ message: e.target.value })}
            />
          </Field>
          <Field label="Nota para el agente humano">
            <textarea
              className="input min-h-[80px]"
              value={data.note || ''}
              onChange={(e) => patch({ note: e.target.value })}
            />
          </Field>
        </>
      );
    case 'end':
      return <p className="text-sm text-slate-500">Este nodo finaliza la conversación. No tiene configuración.</p>;
    default:
      return <p className="text-sm text-slate-500">Sin configuración.</p>;
  }
}
