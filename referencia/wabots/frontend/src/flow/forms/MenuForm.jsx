// Formulario del nodo Menú interactivo.
import VarField from '../VarField';
import { Field } from './fields.jsx';

export default function MenuForm({ data, patch, vars }) {
  const options = Array.isArray(data.options) ? data.options : [];

  const updateOption = (idx, optPatch) => {
    const next = options.map((o, i) => (i === idx ? { ...o, ...optPatch } : o));
    patch({ options: next });
  };
  const addOption = () => {
    // Id nuevo = máximo id numérico existente + 1, para no repetir ids tras
    // borrar una opción intermedia. Sin ids numéricos usa longitud+1 como
    // base y avanza hasta encontrar un id libre.
    const numericIds = options
      .map((o) => Number(o.id))
      .filter((n) => Number.isFinite(n));
    let next = numericIds.length ? Math.max(...numericIds) + 1 : options.length + 1;
    const used = new Set(options.map((o) => String(o.id)));
    while (used.has(String(next))) next += 1;
    patch({ options: [...options, { id: String(next), label: '' }] });
  };
  const removeOption = (idx) => {
    patch({ options: options.filter((_, i) => i !== idx) });
  };

  const menuType = data.menuType || 'text';

  return (
    <>
      <Field label="Tipo de menú">
        <select
          className="input"
          value={menuType}
          onChange={(e) => patch({ menuType: e.target.value })}
        >
          <option value="text">Texto numerado (todos los canales)</option>
          <option value="buttons">Botones clicables (máx. 3 · Twilio)</option>
          <option value="list">Lista desplegable (máx. 10 · Twilio)</option>
        </select>
      </Field>
      {menuType !== 'text' && (
        <p className="text-[11px] text-slate-500">
          Los botones/lista nativos funcionan en <b>Twilio</b>. En otros canales
          se envían como texto numerado automáticamente.
        </p>
      )}
      {menuType === 'list' && (
        <Field label="Texto del botón de la lista">
          <input
            className="input"
            value={data.listButtonText || ''}
            placeholder="Ver opciones"
            onChange={(e) => patch({ listButtonText: e.target.value })}
          />
        </Field>
      )}
      <Field label="Encabezado">
        <VarField
          vars={vars}
          value={data.header || ''}
          onChange={(next) => patch({ header: next })}
        />
      </Field>
      <Field label="Cuerpo">
        <VarField
          multiline
          vars={vars}
          value={data.body || ''}
          onChange={(next) => patch({ body: next })}
        />
      </Field>

      <div>
        <span className="label">Opciones</span>
        <div className="flex flex-col gap-2">
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <input
                className="input mt-0 w-14"
                value={opt.id}
                placeholder="id"
                onChange={(e) => updateOption(idx, { id: e.target.value })}
              />
              <div className="flex-1">
                <VarField
                  vars={vars}
                  value={opt.label || ''}
                  placeholder="Etiqueta"
                  onChange={(next) => updateOption(idx, { label: next })}
                />
              </div>
              <button
                type="button"
                className="rounded px-2 pt-1.5 text-slate-500 hover:text-danger"
                onClick={() => removeOption(idx)}
                title="Quitar opción"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost mt-2 w-full" onClick={addOption}>
          + Añadir opción
        </button>
      </div>

      <Field label="Guardar selección en variable (saveTo)">
        <input
          className="input"
          value={data.saveTo || ''}
          placeholder="opcionElegida"
          onChange={(e) => patch({ saveTo: e.target.value })}
        />
      </Field>
    </>
  );
}
