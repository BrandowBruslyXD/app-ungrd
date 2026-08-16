import { useEffect, useRef } from 'react';

/**
 * Fondo animado sutil: una RED DE NODOS conectados que deriva lentamente
 * (evoca los flujos/conexiones y el aire "IA" de la plataforma). Canvas
 * liviano: nº de puntos acotado, dpr máx 2, se pausa con la pestaña oculta y
 * respeta prefers-reduced-motion. Puramente decorativo (pointer-events-none).
 */
export default function ParticlesBackground({ className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;

    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let w = 0;
    let h = 0;
    let dpr = 1;
    let pts = [];
    let raf = 0;

    const count = () => Math.min(64, Math.max(24, Math.floor(window.innerWidth / 26)));
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = Math.floor(window.innerWidth * dpr);
      h = canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    const init = () => {
      pts = Array.from({ length: count() }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.16 * dpr,
        vy: (Math.random() - 0.5) * 0.16 * dpr,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const link = 130 * dpr;
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      // Líneas entre nodos cercanos (más tenues cuanto más lejos).
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < link) {
            const a = (1 - d / link) * 0.14;
            ctx.strokeStyle = `rgba(37,211,102,${a})`;
            ctx.lineWidth = dpr;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      // Nodos.
      ctx.fillStyle = 'rgba(37,211,102,0.35)';
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    init();
    raf = requestAnimationFrame(draw);

    const onResize = () => {
      resize();
      init();
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 opacity-60 ${className}`}
    />
  );
}
