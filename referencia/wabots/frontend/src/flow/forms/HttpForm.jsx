// Formulario del nodo Petición HTTP.
import VarField from '../VarField';
import { Field } from './fields.jsx';

export default function HttpForm({ data, patch, vars }) {
  // headers se edita como JSON crudo para flexibilidad.
  const headersStr =
    typeof data.headers === 'string'
      ? data.headers
      : JSON.stringify(data.headers || {}, null, 2);

  return (
    <>
      <Field label="Método">
        <select
          className="input"
          value={data.method || 'GET'}
          onChange={(e) => patch({ method: e.target.value })}
        >
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>
      <Field label="URL">
        <VarField
          vars={vars}
          value={data.url || ''}
          placeholder="https://..."
          onChange={(next) => patch({ url: next })}
        />
      </Field>
      <Field label="Headers (JSON)">
        <textarea
          className="input min-h-[80px] font-mono text-xs"
          value={headersStr}
          onChange={(e) => {
            // Intenta parsear; si falla guarda el texto crudo.
            try {
              patch({ headers: JSON.parse(e.target.value || '{}') });
            } catch {
              patch({ headers: e.target.value });
            }
          }}
        />
      </Field>
      <Field label="Body">
        <VarField
          multiline
          vars={vars}
          value={data.body || ''}
          onChange={(next) => patch({ body: next })}
        />
      </Field>
      <Field label="Guardar respuesta en">
        <input
          className="input"
          value={data.saveTo || ''}
          onChange={(e) => patch({ saveTo: e.target.value })}
        />
      </Field>
    </>
  );
}
