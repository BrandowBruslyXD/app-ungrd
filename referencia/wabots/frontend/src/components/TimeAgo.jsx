import { useEffect, useState } from 'react';

// "hace Xs / hace X min" en texto corto.
function fmtHace(ms) {
  if (!ms) return '';
  const segs = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (segs < 60) return `hace ${segs}s`;
  const min = Math.round(segs / 60);
  return `hace ${min} min`;
}

/**
 * Marca de tiempo relativa que se refresca sola cada 10s.
 * El tick vive AQUÍ dentro: la página que lo usa no se re-renderiza.
 */
export default function TimeAgo({ ts, prefix = '' }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    // Con la pestaña oculta no hace tick (nadie ve el texto); al volver,
    // el próximo tick lo pone al día.
    const id = setInterval(() => {
      if (!document.hidden) setTick((n) => n + 1);
    }, 10000);
    return () => clearInterval(id);
  }, []);
  if (!ts) return null;
  return (
    <>
      {prefix}
      {fmtHace(ts)}
    </>
  );
}
