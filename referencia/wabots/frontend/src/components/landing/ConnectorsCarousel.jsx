// Carrusel de conectores/integraciones de la landing.
import { CONNECTORS, TINT } from './landing.data';

function ConnectorCard({ icon: Ic, tint, name, desc }) {
  return (
    <div className="group/c w-64 shrink-0 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-[0_16px_40px_-24px_rgba(30,80,120,0.5)] backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:bg-white/90 hover:shadow-[0_28px_55px_-24px_rgba(16,185,129,0.45)]">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${TINT[tint]} transition-transform group-hover/c:scale-110`}>
          <Ic className="h-5 w-5" />
        </span>
        <p className="font-semibold text-slate-900">{name}</p>
      </div>
      <p className="mt-2 text-sm leading-snug text-slate-600">{desc}</p>
    </div>
  );
}

/* Carrusel infinito que SIEMPRE se mueve solo (no se pausa ni con el cursor
   encima). Animación CSS continua; la lista va duplicada para un bucle sin
   saltos. Sin flechas, sin arrastre. */
export default function ConnectorsCarousel() {
  return (
    <div className="relative overflow-hidden py-2">
      <div className="flex w-max gap-4 animate-marquee">
        {[...CONNECTORS, ...CONNECTORS].map((c, i) => (
          <ConnectorCard key={i} {...c} />
        ))}
      </div>
      {/* Difuminado en los bordes para que las tarjetas "entren y salgan". */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#eef3f9] to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#eef3f9] to-transparent sm:w-24" />
    </div>
  );
}
