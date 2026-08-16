// Mockups del producto para la landing (tarjetas claras = la app real).
import { IconChart } from '../icons';

/* Cabecera de chat compartida entre el mock de conversación y la demo
   "Así trabaja" (misma identidad visual en ambos). */
export function ChatHeader() {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-ink-950">CD</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">Clínica Dental Sonrisa</p>
        <p className="flex items-center gap-1.5 text-[11px] text-brand-dark"><span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse-ring" /> en línea</p>
      </div>
    </div>
  );
}

export function ChatMock() {
  return (
    <div className="w-[19rem] max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl ring-1 ring-slate-900/5">
      <ChatHeader />
      <div className="space-y-2.5 p-4 text-[13px] leading-snug">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-brand/15 px-3 py-2 text-slate-800">Buenas tardes, ¿tienen disponibilidad para una limpieza dental esta semana?</div>
        <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-slate-700">Buenas tardes. Con gusto le ayudo. Hay disponibilidad el jueves a las 10:00 a. m. y el viernes a las 3:00 p. m. ¿Cuál horario prefiere?</div>
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-brand/15 px-3 py-2 text-slate-800">El jueves a las 10 está perfecto.</div>
        <div className="mr-auto flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
        </div>
      </div>
    </div>
  );
}

export function FlowMock() {
  const node = 'absolute rounded-xl border px-2.5 py-1.5 text-[11px] font-medium shadow-lg backdrop-blur';
  return (
    <div className="relative h-52 w-[20rem] max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl ring-1 ring-slate-900/5">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-800">Editor de flujos</span>
        <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-slate-600">4 nodos</span>
      </div>
      <div className="relative h-full">
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <path d="M86 60 C130 60 130 104 174 104" fill="none" stroke="#25d366" strokeWidth="1.6" opacity="0.6" />
          <path d="M174 104 C224 104 224 60 268 60" fill="none" stroke="#818cf8" strokeWidth="1.6" opacity="0.6" />
          <path d="M174 104 C224 104 224 146 268 146" fill="none" stroke="#22d3ee" strokeWidth="1.6" opacity="0.5" />
        </svg>
        <div className={`${node} left-3 top-11 border-brand/40 bg-brand/10 text-brand-dark`}>Mensaje recibido</div>
        <div className={`${node} left-[8.6rem] top-[5.8rem] border-slate-300 bg-white text-slate-800`}>IA · Intención</div>
        <div className={`${node} right-3 top-11 border-accent/40 bg-accent/10 text-accent-dark`}>Agendar cita</div>
        <div className={`${node} right-3 top-[8.6rem] border-cyan-glow/50 bg-cyan-glow/10 text-cyan-700`}>Confirmar</div>
      </div>
    </div>
  );
}

export function StatsMock() {
  const bars = [40, 62, 48, 78, 90, 70, 96];
  return (
    <div className="w-[17rem] max-w-full rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl ring-1 ring-slate-900/5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Actividad · hoy</span>
        <IconChart className="h-4 w-4 text-brand-dark" />
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-lg font-bold text-slate-900">128</p><p className="text-[11px] text-slate-500">Conversaciones</p></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-lg font-bold text-slate-900">34</p><p className="text-[11px] text-slate-500">Citas agendadas</p></div>
      </div>
      <div className="flex h-16 items-end gap-1.5">
        {bars.map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-brand to-teal-300" style={{ height: `${h}%`, opacity: 0.5 + i * 0.07 }} />)}
      </div>
    </div>
  );
}
