// Formulario del nodo Disparador.
import { Field } from './fields.jsx';

export default function TriggerForm({ data, patch }) {
  const keywords = Array.isArray(data.keywords) ? data.keywords : [];
  return (
    <>
      <Field label="Coincidencia">
        <select
          className="input"
          value={data.match || 'any'}
          onChange={(e) => patch({ match: e.target.value })}
        >
          <option value="any">Cualquier mensaje</option>
          <option value="keyword">Palabras clave</option>
        </select>
      </Field>
      {data.match === 'keyword' && (
        <Field label="Palabras clave (separadas por coma)">
          <input
            className="input"
            value={keywords.join(', ')}
            placeholder="hola, info, ayuda"
            onChange={(e) =>
              patch({
                keywords: e.target.value
                  .split(',')
                  .map((k) => k.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
      )}
    </>
  );
}
