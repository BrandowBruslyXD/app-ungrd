// Constructor IA: chat donde el admin pide en lenguaje natural y el agente
// arma/edita el flujo en el lienzo en vivo.
// Envía el grafo actual + la instrucción a /flow-agent/build y aplica el
// grafo resultante al store (loadGraph), reflejándolo al instante en el editor.
import { useEffect, useRef, useState } from 'react';
import { buildFlow, getRubroTemplates } from '../lib/flowAgentApi';

// Sugerencias rápidas para arrancar (se envían tal cual al agente).
const SUGGESTIONS = [
  'Agrega una opción de "Hablar con un humano" al menú principal.',
  'Haz un bot con IA para un restaurante que responda dudas y tome reservas.',
  'Conecta todos los nodos sueltos y valida el flujo.',
];

export default function BuilderChat({ getGraph, applyGraph, onClose, context }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: '👋 Soy tu constructor de flujos. Dime qué bot necesitas y lo armo en el lienzo. Por ejemplo: "crea un bot de citas para una clínica con agendamiento".',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [expert, setExpert] = useState(false);
  const [templates, setTemplates] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Carga las plantillas por rubro una vez.
  useEffect(() => {
    let alive = true;
    getRubroTemplates()
      .then((t) => alive && setTemplates(Array.isArray(t) ? t : []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const send = async (text) => {
    const t = (text ?? '').trim();
    if (!t || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: t }]);
    setBusy(true);

    // Historial para el agente (solo turnos de texto, sin la burbuja actual).
    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.text }));

    try {
      const res = await buildFlow({
        graph: getGraph(),
        message: t,
        history,
        context,
        mode: expert ? 'expert' : 'fast',
      });
      // Aplica el grafo resultante al lienzo en vivo.
      if (res?.graph && res.changed) applyGraph(res.graph);
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: res?.reply || 'Listo.',
          problems: res?.problems || [],
          changed: !!res?.changed,
          via: res?.via,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: '⚠️ No pude completar la construcción. Revisa que el constructor tenga API key configurada e inténtalo de nuevo.' },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-col bg-white">
      {/* Cabecera */}
      <div className="flex items-center justify-between bg-accent-gradient px-3 py-2 text-white">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20">🤖</span>
          <div>
            <div className="text-sm font-semibold leading-tight">Constructor IA</div>
            <div className="text-[10px] opacity-80">{busy ? 'Construyendo…' : 'Pídeme un flujo'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpert((v) => !v)}
            title="Modo experto: un equipo de sub-agentes (Arquitecto + Redactor + Constructor) arma flujos más completos (usa más tokens)."
            className={`rounded px-2 py-1 text-[11px] font-medium ${expert ? 'bg-white text-accent-dark' : 'bg-white/15 text-white hover:bg-white/25'}`}
          >
            {expert ? '★ Experto' : '☆ Experto'}
          </button>
          {onClose && (
            <button onClick={onClose} title="Ocultar" className="rounded px-2 py-1 text-sm hover:bg-white/20">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm shadow ${
                m.role === 'user' ? 'bg-accent-dark text-white' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {m.text}
              {m.changed && (
                <div className="mt-1 text-[10px] text-brand">✓ flujo actualizado en el lienzo</div>
              )}
              {/* Doble seguro: qué LLM construyó (web vs API). */}
              {m.via && (
                <div
                  className={`mt-1 text-[10px] font-medium ${
                    m.via === 'web'
                      ? 'text-emerald-600'
                      : m.via === 'fallback'
                        ? 'text-amber-600'
                        : 'text-slate-500'
                  }`}
                >
                  {m.via === 'web'
                    ? '🟢 Sesión DeepSeek'
                    : m.via === 'fallback'
                      ? '⚠️ API key (fallback)'
                      : '🔑 API key'}
                </div>
              )}
              {Array.isArray(m.problems) && m.problems.length > 0 && (
                <div className="mt-2 rounded border border-warn/25 bg-warn/10 p-2 text-[11px] text-warn">
                  <div className="font-semibold">Avisos:</div>
                  <ul className="ml-3 list-disc">
                    {m.problems.map((p, j) => (
                      <li key={j}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">Construyendo el flujo…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Plantillas por rubro + sugerencias (solo al inicio) */}
      {messages.length <= 1 && (
        <div className="space-y-2 border-t border-slate-200/80 p-2">
          {templates.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Plantillas por rubro
              </div>
              <div className="flex flex-wrap gap-1">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => send(tpl.seed)}
                    disabled={busy}
                    title={tpl.summary + (tpl.usesAI ? ' (usa IA)' : ' (sin IA)')}
                    className="rounded-md border border-slate-200/80 bg-slate-900/[0.04] px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-900/[0.07] disabled:opacity-50"
                  >
                    {tpl.emoji} {tpl.name}
                    {tpl.usesAI && <span className="ml-1 text-[9px] text-accent">IA</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Ideas</div>
            <div className="flex flex-wrap gap-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={busy}
                  className="rounded-md border border-slate-200/80 bg-slate-900/[0.04] px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-900/[0.07] disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Entrada */}
      <div className="flex items-center gap-2 border-t border-slate-200/80 bg-slate-900/[0.04] p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send(input);
          }}
          placeholder="Describe el bot que quieres…"
          className="input flex-1"
          disabled={busy}
        />
        <button className="btn-primary px-3" onClick={() => send(input)} disabled={busy}>
          ➤
        </button>
      </div>
    </div>
  );
}
