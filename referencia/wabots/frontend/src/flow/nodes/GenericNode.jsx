// Nodo visual único y reutilizable, parametrizado por `type`.
// Renderiza cabecera (emoji + etiqueta de categoría), un resumen del data
// y los <Handle> de React Flow según handles.js.
import { Handle, Position } from 'reactflow';
import { getPaletteItem, GROUP_META } from '../palette';
import { inHandles, outHandles } from '../handles';

// Construye una línea de resumen legible según el tipo de nodo.
function summarize(type, data = {}) {
  switch (type) {
    case 'trigger':
      return data.match === 'keyword'
        ? `Palabras: ${(data.keywords || []).join(', ') || '—'}`
        : 'Cualquier mensaje';
    case 'sendText':
      return data.text ? truncate(data.text) : 'Sin texto';
    case 'interactiveMenu':
      return `${data.body ? truncate(data.body) : 'Menú'} · ${(data.options || []).length} opc.`;
    case 'captureInput':
      return data.variable ? `→ ${data.variable}` : 'Sin variable';
    case 'condition':
      return `${data.left || '?'} ${data.op || '=='} ${data.right || '?'}`;
    case 'aiAgent': {
      const dest = data.saveTo || 'aiReply';
      if (data.llmMode === 'platform') return `LLM plataforma → ${dest}`;
      if (data.llmMode === 'tenant') return `LLM empresa → ${dest}`;
      if (data.provider === 'deepseek_web') {
        return `🟢 Sesión DeepSeek · fallback ${data.fallbackProvider || 'API'} → ${dest}`;
      }
      return `API${data.provider ? `: ${data.provider}` : ''} → ${dest}`;
    }
    case 'httpRequest':
      return `${data.method || 'GET'} ${data.url ? truncate(data.url) : '...'}`;
    case 'gmail':
      return `Acción: ${data.action || '—'}`;
    case 'calendar':
      return `Acción: ${data.action || '—'}`;
    case 'reminder':
      return `🔔 ${data.leadMinutes ?? 120} min antes`;
    case 'sendFile':
      return data.mediaUrl ? truncate(data.mediaUrl) : 'Sin archivo';
    case 'receiveFile':
      return data.saveTo ? `→ ${data.saveTo}` : 'Recibe archivo';
    case 'transcribeAudio':
      return `🎙️ → ${data.saveTo || 'transcripcion'}`;
    case 'ocrImage':
      return `🖼️ → ${data.saveTo || 'textoImagen'}`;
    case 'translateText':
      return `🌐 ${data.sourceLang || 'auto'}→${data.targetLang || 'es'} · ${data.saveTo || 'traduccion'}`;
    case 'delay':
      return `${data.ms || 0} ms`;
    case 'handover':
      return data.note ? truncate(data.note) : 'Transferir a humano';
    case 'end':
      return 'Fin del flujo';
    default:
      return '';
  }
}

function truncate(text, len = 32) {
  const s = String(text);
  return s.length > len ? `${s.slice(0, len)}…` : s;
}

// Color visible para cada tipo de salida.
function handleColor(id) {
  if (id === 'true') return '#25d366';
  if (id === 'false') return '#f43f5e';
  if (id === 'onError') return '#f97316';
  if (id.startsWith('opt:')) return '#6366f1';
  return '#64748b';
}

export default function GenericNode({ id, type, data, selected }) {
  const def = getPaletteItem(type);
  const group = def?.group || 'Lógica';
  const meta = GROUP_META[group] || { emoji: '◻️', color: '#64748b' };
  const label = def?.label || type;

  const ins = inHandles(type);
  const outs = outHandles(type, data);

  return (
    <div
      className="rounded-2xl border bg-white/95 text-slate-900 backdrop-blur-sm transition-shadow duration-150"
      style={{
        borderColor: selected ? meta.color : 'rgba(226,232,240,0.9)',
        minWidth: 210,
        boxShadow: selected
          ? `0 0 0 2px ${meta.color}, 0 10px 30px -10px ${meta.color}66`
          : '0 10px 28px -16px rgba(15,23,42,0.25)',
      }}
    >
      {/* Cabecera con acento de color por categoría */}
      <div
        className="flex items-center gap-2.5 rounded-t-2xl px-3 py-2.5"
        style={{
          background: `linear-gradient(180deg, ${meta.color}1f, transparent)`,
          borderTop: `2px solid ${meta.color}`,
        }}
      >
        <span
          className="grid h-6 w-6 place-items-center rounded-lg text-sm leading-none"
          style={{ background: `${meta.color}22`, boxShadow: `inset 0 0 0 1px ${meta.color}44` }}
        >
          {meta.emoji}
        </span>
        <span className="text-sm font-semibold tracking-tight">{label}</span>
      </div>

      {/* Resumen del data */}
      <div className="px-3 py-2 text-xs leading-relaxed text-slate-500">{summarize(type, data)}</div>

      {/* Handles de entrada (izquierda) */}
      {ins.map((h, i) => (
        <Handle
          key={`t-${h.id}`}
          type="target"
          position={Position.Left}
          id={h.id}
          style={{
            top: 42 + i * 18,
            width: 11,
            height: 11,
            background: '#94a3b8',
            border: '2px solid #ffffff',
            boxShadow: '0 0 0 3px rgba(148,163,184,0.15)',
          }}
        />
      ))}

      {/* Handles de salida (derecha), etiquetados */}
      <div className="flex flex-col items-end gap-1.5 px-3 pb-2.5">
        {outs.map((h) => (
          <div key={`s-${h.id}`} className="relative flex items-center pr-2">
            {h.label && (
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ color: handleColor(h.id), background: `${handleColor(h.id)}1a` }}
              >
                {h.label}
              </span>
            )}
            <Handle
              type="source"
              position={Position.Right}
              id={h.id}
              style={{
                position: 'relative',
                right: -8,
                transform: 'none',
                width: 11,
                height: 11,
                background: handleColor(h.id),
                border: '2px solid #ffffff',
                boxShadow: `0 0 0 3px ${handleColor(h.id)}22`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
