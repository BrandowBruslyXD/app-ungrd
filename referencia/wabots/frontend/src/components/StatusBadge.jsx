// Badge de estado de la empresa o conexión, con punto de color.
const STYLES = {
  ACTIVE: { cls: 'border-brand/30 bg-brand/10 text-brand', dot: 'bg-brand', pulse: true },
  SUSPENDED: { cls: 'border-danger/30 bg-danger/10 text-danger-dark', dot: 'bg-danger' },
  PENDING: { cls: 'border-warn/30 bg-warn/10 text-amber-700', dot: 'bg-warn' },
};
const LABELS = { ACTIVE: 'Activa', SUSPENDED: 'Suspendida', PENDING: 'Pendiente' };

export default function StatusBadge({ status }) {
  const key = (status || 'PENDING').toUpperCase();
  const s = STYLES[key] || { cls: 'border-slate-200 bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
  return (
    <span className={`badge ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? 'animate-pulse-ring' : ''}`} />
      {LABELS[key] || status}
    </span>
  );
}
