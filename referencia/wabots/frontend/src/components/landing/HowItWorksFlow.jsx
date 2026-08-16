// Demo interactiva: el flujo de una conversación avanzando paso a paso.
import { useEffect, useState } from 'react';
import { FLOW } from './landing.data';
import { ChatHeader } from './mocks';

export default function HowItWorksFlow() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return undefined;
    const id = setInterval(() => setActive((a) => (a + 1) % FLOW.length), 3200);
    return () => clearInterval(id);
  }, [auto]);

  const bubbles = FLOW.slice(0, active + 1).flatMap((s) => s.add);

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      {/* Stepper clicable */}
      <div className="space-y-3">
        {FLOW.map((s, i) => (
          <button
            key={s.title}
            onClick={() => { setActive(i); setAuto(false); }}
            className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${
              i === active
                ? 'border-brand/40 bg-white/90 shadow-glow-brand'
                : 'border-white/70 bg-white/50 hover:-translate-y-0.5 hover:bg-white/80'
            }`}
          >
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${i === active ? 'bg-brand-gradient text-ink-950' : 'bg-brand/10 text-brand-dark'}`}>
              <s.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{i + 1}. {s.title}</p>
              <p className="text-sm leading-snug text-slate-600">{s.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Chat en vivo que refleja el paso activo */}
      <div className="flex justify-center">
        <div className="relative w-[21rem] max-w-full">
          <div className="pointer-events-none absolute inset-x-6 -bottom-4 h-24 rounded-full bg-brand/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl ring-1 ring-slate-900/5">
            <ChatHeader />
            <div className="flex min-h-[15rem] flex-col justify-end gap-2.5 p-4 text-[13px] leading-snug">
              {bubbles.map((b, i) => (
                <div
                  key={`${active}-${i}`}
                  className={`max-w-[85%] animate-fade-in-up rounded-2xl px-3 py-2 ${
                    b.from === 'user'
                      ? 'ml-auto rounded-br-sm bg-brand/15 text-slate-800'
                      : 'mr-auto rounded-bl-sm bg-slate-100 text-slate-700'
                  }`}
                >
                  {b.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
