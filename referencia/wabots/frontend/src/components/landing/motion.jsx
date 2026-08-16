// Utilidades de movimiento de la landing: reveal por scroll e inclinación 3D.
import { useEffect, useRef, useState } from 'react';

/* ─────────────────── Reveal al hacer scroll (IntersectionObserver) ──────── */
export function useReveal() {
  const ref = useRef(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [shown, setShown] = useState(!!reduce);
  useEffect(() => {
    if (reduce || !ref.current) return;
    // Sin disconnect: la animación se reactiva CADA vez que la sección
    // entra al viewport (al bajar y al volver a subir).
    const io = new IntersectionObserver(
      ([e]) => setShown(e.isIntersecting),
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [reduce]);
  return { ref, shown };
}

export function Reveal({ children, delay = 0, y = 26, className = '' }) {
  const { ref, shown } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: 'opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1)',
        transitionDelay: `${delay}ms`,
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translateY(${y}px)`,
      }}
    >
      {children}
    </div>
  );
}

/* ─────── Inclinación 3D con el cursor (para el showcase del hero) ───────── */
export function useTilt(max = 9) {
  const ref = useRef(null);
  const frame = useRef(0);
  const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // rAF: una sola lectura de layout + escritura de transform por frame,
  // aunque lleguen decenas de eventos mousemove.
  const onMove = (e) => {
    const el = ref.current;
    if (reduce || !el || frame.current) return;
    const { clientX, clientY } = e;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const r = el.getBoundingClientRect();
      const px = (clientX - r.left) / r.width - 0.5;
      const py = (clientY - r.top) / r.height - 0.5;
      el.style.transform = `rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
    });
  };
  const onLeave = () => {
    if (frame.current) { cancelAnimationFrame(frame.current); frame.current = 0; }
    if (ref.current) ref.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
  };
  return { ref, onMove, onLeave };
}
