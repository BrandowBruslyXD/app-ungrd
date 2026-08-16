// Sección "Conversaciones" de la ficha de empresa: lista los chats del tenant
// y, al pulsar uno, abre el historial completo en un panel dentro de la misma
// sección con burbujas estilo WhatsApp (IN a la izquierda, OUT a la derecha).
import { useMemo, useState } from 'react';
import useAsync from '../../hooks/useAsync';
import { listConversations, getConversation } from '../../lib/tenantsApi';
import TimeAgo from '../TimeAgo';
import Section from './Section';

// Estilos de badge por estado de conversación (mismo lenguaje visual que StatusBadge).
const STATUS_BADGE = {
  ACTIVE: { cls: 'border-brand/30 bg-brand/10 text-brand', label: 'Activa' },
  ENDED: { cls: 'border-slate-200 bg-slate-100 text-slate-600', label: 'Finalizada' },
  HANDED_OVER: { cls: 'border-warn/30 bg-warn/10 text-amber-700', label: 'Derivada a humano' },
};

function ConversationBadge({ status }) {
  const s =
    STATUS_BADGE[(status || '').toUpperCase()] || {
      cls: 'border-slate-200 bg-slate-100 text-slate-500',
      label: status || '—',
    };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

// Normaliza `content` del mensaje: puede llegar como objeto o como JSON string.
function parseContent(raw) {
  let c = raw;
  if (typeof c === 'string') {
    try {
      c = JSON.parse(c);
    } catch {
      return { text: c };
    }
  }
  return c && typeof c === 'object' ? c : { text: '' };
}

// Hora corta (HH:mm) para la esquina de cada burbuja.
function fmtHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

// Burbuja individual del historial (IN gris a la izquierda, OUT verde a la derecha).
function MessageBubble({ message }) {
  // Memoiza el parseo del content: evita re-parsear el JSON de cada burbuja
  // en cada re-render de la lista.
  const c = useMemo(() => parseContent(message?.content), [message?.content]);
  const text = c.text || (c.mediaUrl ? '📎 adjunto' : '');
  const isOut = message?.direction === 'OUT';
  return (
    <div className={isOut ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm shadow-sm ${
          isOut ? 'bg-[#d9fdd3] text-slate-900' : 'bg-white text-slate-900'
        }`}
      >
        {text || <span className="text-slate-400">(sin contenido)</span>}
        <div className="mt-0.5 text-right text-[10px] text-slate-500">
          {fmtHora(message?.createdAt)}
        </div>
      </div>
    </div>
  );
}

// Panel de historial de una conversación: pide hasta 2000 mensajes (tope del
// backend); la UI informa el número real recibido con messages.length.
function ConversationDetail({ conversation, onBack }) {
  const { data, loading, error, reload } = useAsync(
    () => getConversation(conversation.id, 2000),
    [conversation.id],
  );
  const messages = Array.isArray(data?.messages) ? data.messages : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-ghost" onClick={onBack} aria-label="Volver a la lista de conversaciones">
          ← Volver
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-slate-900">
            {conversation.contactPhone}
            {conversation.contactName ? ` · ${conversation.contactName}` : ''}
          </div>
          {!loading && !error && (
            <div className="text-xs text-slate-500">
              Mostrando últimos {messages.length} mensajes
            </div>
          )}
        </div>
        <ConversationBadge status={conversation.status} />
        <button
          className="btn-ghost"
          onClick={reload}
          disabled={loading}
          aria-label="Recargar mensajes de la conversación"
        >
          ↻
        </button>
      </div>

      {loading && <div className="text-sm text-slate-500">Cargando mensajes…</div>}
      {error && (
        <div className="text-sm text-danger-dark">
          {error?.response?.data?.message || 'No se pudieron cargar los mensajes'}
        </div>
      )}
      {!loading && !error && (
        <div
          className="max-h-96 space-y-2 overflow-y-auto rounded-xl border border-slate-200/80 p-3"
          style={{ background: '#efeae2' }}
        >
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500">Esta conversación no tiene mensajes.</p>
          ) : (
            messages.map((m) => <MessageBubble key={m?.id} message={m} />)
          )}
        </div>
      )}
    </div>
  );
}

export default function ChatsSection({ tenantId }) {
  const { data, loading, error, reload } = useAsync(() => listConversations(tenantId), [tenantId]);
  const conversations = Array.isArray(data) ? data : [];

  // Conversación abierta (objeto de la lista); null = se muestra la lista.
  const [selected, setSelected] = useState(null);

  return (
    <Section
      title="Conversaciones"
      description="Chats registrados para esta empresa. Pulse uno para ver su historial completo."
      actions={
        !selected && (
          <button
            className="btn-ghost"
            onClick={reload}
            disabled={loading}
            aria-label="Recargar la lista de conversaciones"
          >
            ↻
          </button>
        )
      }
    >
      {selected ? (
        <ConversationDetail conversation={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          {loading && <div className="text-sm text-slate-500">Cargando conversaciones…</div>}
          {error && (
            <div className="text-sm text-danger-dark">
              {error?.response?.data?.message || 'No se pudieron cargar las conversaciones'}
            </div>
          )}
          {!loading && !error && conversations.length === 0 && (
            <p className="text-sm text-slate-500">Esta empresa aún no tiene conversaciones.</p>
          )}
          {!loading && conversations.length > 0 && (
            <ul className="divide-y divide-slate-200/80">
              {conversations.map((c) => {
                const ts = c?.lastMessageAt || c?.createdAt;
                const tsMs = ts ? new Date(ts).getTime() : 0;
                return (
                  <li key={c?.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(c)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-slate-50"
                      aria-label={`Ver historial de la conversación con ${c?.contactPhone || 'contacto desconocido'}`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900">
                          {c?.contactPhone || '—'}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {c?.contactName || '—'}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {tsMs > 0 && (
                          <span className="text-xs text-slate-500">
                            <TimeAgo ts={tsMs} />
                          </span>
                        )}
                        <ConversationBadge status={c?.status} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Section>
  );
}
