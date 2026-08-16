// Formulario del nodo Recordatorio.
// Una IA (LLM definible en el nodo) evalúa antes de la cita y decide si envía
// el recordatorio al cliente. Los campos del LLM se comparten con Agente IA.
import VarField from '../VarField';
import { Field } from './fields.jsx';
import LlmFields from './LlmFields.jsx';

export default function ReminderForm({ data, patch, vars }) {
  return (
    <>
      <Field label="Fecha de la cita (variable)">
        <VarField
          vars={vars}
          value={data.appointment || ''}
          placeholder="{{fecha}}"
          onChange={(next) => patch({ appointment: next })}
        />
      </Field>
      <Field label="Teléfono del cliente">
        <VarField
          vars={vars}
          value={data.to || ''}
          placeholder="{{contacto}}"
          onChange={(next) => patch({ to: next })}
        />
      </Field>
      <Field label="Minutos antes">
        <input
          type="number"
          min="0"
          className="input"
          value={data.leadMinutes ?? 120}
          onChange={(e) => patch({ leadMinutes: Number(e.target.value) })}
        />
      </Field>
      <Field label="Zona horaria">
        <input
          className="input"
          value={data.timezone || 'America/Bogota'}
          placeholder="America/Bogota"
          onChange={(e) => patch({ timezone: e.target.value })}
        />
      </Field>
      <Field label="Instrucciones para el agente (qué revisar/decir)">
        <VarField
          multiline
          vars={vars}
          value={data.instructions || ''}
          onChange={(next) => patch({ instructions: next })}
        />
      </Field>
      <LlmFields data={data} patch={patch} />
    </>
  );
}
