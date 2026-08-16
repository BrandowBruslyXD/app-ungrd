// Tarjeta de sección del detalle de empresa: título, descripción y acciones.
export default function Section({ title, description, children, actions }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
