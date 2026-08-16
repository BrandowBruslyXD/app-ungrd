// Showcase del hero: 3 tarjetas 3D flotantes y clicables.
import { useState } from 'react';
import { useTilt } from './motion';
import { ChatMock, FlowMock, StatsMock } from './mocks';

/* Tarjeta del showcase, a nivel de módulo para conservar su identidad entre
   renders (evita el remount que provocaba definirla dentro del componente).
   La tarjeta activa deja de flotar (para leerla) y se agranda al frente; las
   demás siguen flotando detrás, más tenues. z-index por estado. */
function ShowcaseItem({ id, active, onSelect, wrapPos, floatCls, baseTransform, tz, children }) {
  const isActive = active === id;
  const stateCls = isActive
    ? 'z-30'
    : 'z-10 opacity-75 hover:opacity-100';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(id)}
      className={`${wrapPos} absolute cursor-pointer transition-[opacity,filter] duration-300 ${stateCls} ${isActive ? '' : floatCls}`}
      style={
        isActive
          ? { transform: `${baseTransform} translateZ(150px) scale(1.06)`, filter: 'none' }
          : { transform: `${baseTransform} translateZ(${tz}px)` }
      }
    >
      <div className={isActive ? 'rounded-2xl ring-2 ring-brand/40' : ''}>{children}</div>
    </div>
  );
}

export default function HeroShowcase() {
  const tilt = useTilt(8);
  const [active, setActive] = useState('chat'); // 'stats' | 'flow' | 'chat'

  return (
    <>
      <div className="flex justify-center" style={{ perspective: '1600px' }} onMouseMove={tilt.onMove} onMouseLeave={tilt.onLeave}>
        <div className="relative h-[19rem] w-full max-w-lg origin-top scale-[0.7] sm:h-[24rem] sm:scale-90 lg:h-[26rem] lg:scale-100">
          <div ref={tilt.ref} className="relative h-[26rem] w-full transition-transform duration-300 ease-out" style={{ transformStyle: 'preserve-3d' }}>
            {/* glow de base */}
            <div className="absolute inset-x-6 bottom-4 h-28 rounded-full bg-brand/25 blur-3xl" style={{ transform: 'translateZ(-60px)' }} />
            <ShowcaseItem id="stats" active={active} onSelect={setActive} wrapPos="left-0 top-2 hidden sm:block" floatCls="animate-float-sm" baseTransform="" tz={40}><StatsMock /></ShowcaseItem>
            <ShowcaseItem id="flow" active={active} onSelect={setActive} wrapPos="bottom-0 right-0" floatCls="animate-float [animation-delay:-3s]" baseTransform="" tz={25}><FlowMock /></ShowcaseItem>
            <ShowcaseItem id="chat" active={active} onSelect={setActive} wrapPos="left-1/2 top-12" floatCls="animate-float" baseTransform="translateX(-50%)" tz={95}><ChatMock /></ShowcaseItem>
          </div>
        </div>
      </div>
      {/* Selector / indicador clicable */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {[['chat', 'Chat'], ['flow', 'Flujos'], ['stats', 'Métricas']].map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setActive(k)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              active === k ? 'bg-brand-gradient text-ink-950 shadow-glow-brand' : 'border border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
            } ${k === 'stats' ? 'hidden sm:inline-block' : ''}`}
          >
            {lbl}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">Toque una tarjeta para verla en detalle · mueva el cursor para explorar</p>
    </>
  );
}
