// Componentes de formulario compartidos por los sub-formularios del
// panel de propiedades.

// Etiqueta + control reutilizable.
export function Field({ label, children }) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
    </div>
  );
}
