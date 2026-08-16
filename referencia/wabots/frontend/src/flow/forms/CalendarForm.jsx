// Formulario del nodo Calendario (Google Calendar).
// Soporta los dos modelos de conexión: A = calendario de la empresa,
// B = cuenta de la plataforma invitando por correo.
import VarField from '../VarField';
import { Field } from './fields.jsx';

export default function CalendarForm({ data, patch, vars }) {
  return (
    <>
      <Field label="Acción">
        <select
          className="input"
          value={data.action || 'createEvent'}
          onChange={(e) => patch({ action: e.target.value })}
        >
          <option value="createEvent">Crear evento</option>
          <option value="listEvents">Listar eventos</option>
        </select>
      </Field>

      {/* Origen del calendario: 3 modelos de conexión */}
      <Field label="Origen del calendario">
        <select
          className="input"
          value={data.calendarSource || 'tenant'}
          onChange={(e) => patch({ calendarSource: e.target.value })}
        >
          <option value="platform">Plataforma (Service Account · directo, sin invitar)</option>
          <option value="platformOauth">Plataforma (OAuth del admin · puede invitar)</option>
          <option value="tenant">Empresa (OAuth propio · puede invitar)</option>
        </select>
      </Field>

      <Field label="Invitar a (correos, separados por coma)">
        <VarField
          vars={vars}
          value={data.attendees || ''}
          placeholder="cliente@correo.com, ..."
          onChange={(next) => patch({ attendees: next })}
        />
        <p className="mt-1 text-[11px] text-slate-500">
          Las invitaciones solo se envían con Plataforma OAuth o Empresa OAuth (la
          Service Account no invita).
        </p>
      </Field>

      <Field label="Calendar ID (vacío = principal)">
        <VarField
          vars={vars}
          value={data.calendarId || ''}
          placeholder="primary o id@group.calendar.google.com"
          onChange={(next) => patch({ calendarId: next })}
        />
      </Field>

      <Field label="Título (summary)">
        <VarField
          vars={vars}
          value={data.summary || ''}
          onChange={(next) => patch({ summary: next })}
        />
      </Field>

      <Field label="Descripción">
        <VarField
          multiline
          vars={vars}
          value={data.description || ''}
          onChange={(next) => patch({ description: next })}
        />
      </Field>

      <Field label="Inicio (start)">
        <VarField
          vars={vars}
          value={data.start || ''}
          placeholder="2026-06-22T10:00"
          onChange={(next) => patch({ start: next })}
        />
      </Field>

      <Field label="Duración (minutos)">
        <input
          type="number"
          min="0"
          className="input"
          value={data.durationMin ?? 60}
          onChange={(e) => patch({ durationMin: Number(e.target.value) })}
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

      <Field label="Guardar resultado en">
        <input
          className="input"
          value={data.saveTo || ''}
          placeholder="cita"
          onChange={(e) => patch({ saveTo: e.target.value })}
        />
      </Field>
    </>
  );
}
