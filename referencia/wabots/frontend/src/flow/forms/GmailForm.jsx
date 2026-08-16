// Formulario del nodo Gmail (enviar / listar / leer / marcar como leído).
import VarField from '../VarField';
import { Field } from './fields.jsx';

export default function GmailForm({ data, patch, vars }) {
  const action = data.action || 'send';
  return (
    <>
      <Field label="Acción">
        <select className="input" value={action} onChange={(e) => patch({ action: e.target.value })}>
          <option value="send">Enviar correo</option>
          <option value="list">Listar correos</option>
          <option value="get">Leer un correo</option>
          <option value="modify">Marcar como leído</option>
        </select>
      </Field>
      <Field label="Origen de la cuenta">
        <select
          className="input"
          value={data.gmailSource || 'tenant'}
          onChange={(e) => patch({ gmailSource: e.target.value })}
        >
          <option value="tenant">Cuenta de la empresa</option>
          <option value="platform">Cuenta de plataforma</option>
        </select>
      </Field>

      {action === 'send' && (
        <>
          <Field label="Para (correo)">
            <VarField
              vars={vars}
              value={data.to || ''}
              placeholder="cliente@correo.com"
              onChange={(next) => patch({ to: next })}
            />
          </Field>
          <Field label="Asunto">
            <VarField
              vars={vars}
              value={data.subject || ''}
              onChange={(next) => patch({ subject: next })}
            />
          </Field>
          <Field label="Mensaje">
            <VarField
              multiline
              vars={vars}
              value={data.body || ''}
              onChange={(next) => patch({ body: next })}
            />
          </Field>
        </>
      )}

      {action === 'list' && (
        <>
          <Field label="Búsqueda (query de Gmail)">
            <input
              className="input"
              value={data.query || ''}
              placeholder="is:unread"
              onChange={(e) => patch({ query: e.target.value })}
            />
          </Field>
          <Field label="Máximo de correos">
            <input
              type="number"
              min="1"
              className="input"
              value={data.maxResults ?? 5}
              onChange={(e) => patch({ maxResults: Number(e.target.value) })}
            />
          </Field>
          <Field label="Guardar resultado en">
            <input className="input" value={data.saveTo || ''} placeholder="correos" onChange={(e) => patch({ saveTo: e.target.value })} />
          </Field>
        </>
      )}

      {action === 'get' && (
        <>
          <Field label="ID del correo (variable)">
            <input
              className="input"
              value={data.id || ''}
              placeholder="{{correoId}}"
              onChange={(e) => patch({ id: e.target.value })}
            />
          </Field>
          <Field label="Guardar contenido en">
            <input className="input" value={data.saveTo || ''} placeholder="correo" onChange={(e) => patch({ saveTo: e.target.value })} />
          </Field>
        </>
      )}

      {action === 'modify' && (
        <Field label="ID del correo (variable)">
          <input
            className="input"
            value={data.id || ''}
            placeholder="{{correoId}}"
            onChange={(e) => patch({ id: e.target.value })}
          />
        </Field>
      )}

      <p className="text-[11px] text-slate-500">
        Requiere la cuenta de Gmail conectada (OAuth). Puedes usar variables{' '}
        <code>{'{{...}}'}</code> en los campos.
      </p>
    </>
  );
}
