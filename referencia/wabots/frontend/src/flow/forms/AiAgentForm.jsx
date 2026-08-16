// Formulario del nodo Agente IA.
import VarField from '../VarField';
import { Field } from './fields.jsx';
import LlmFields from './LlmFields.jsx';

export default function AiAgentForm({ data, patch, vars }) {
  const mode = data.mode || 'chat';
  const isAgent = mode === 'agent';
  return (
    <>
      <LlmFields data={data} patch={patch} />
      <Field label="Modo">
        <select className="input" value={mode} onChange={(e) => patch({ mode: e.target.value })}>
          <option value="chat">Conversacional (chat con memoria)</option>
          <option value="agent">Agente con herramientas (agenda sola)</option>
          <option value="single">Una sola respuesta</option>
        </select>
      </Field>
      <Field label="Instrucciones / Persona (reglas de negocio)">
        <VarField
          multiline
          vars={vars}
          value={data.systemPrompt || ''}
          placeholder="Eres el asistente de la empresa, amable y conciso..."
          onChange={(next) => patch({ systemPrompt: next })}
        />
      </Field>
      <Field label="Guardar respuesta en">
        <input className="input" value={data.saveTo || ''} placeholder="aiReply" onChange={(e) => patch({ saveTo: e.target.value })} />
      </Field>

      {isAgent ? (
        <>
          <p className="text-[11px] text-slate-500">
            El agente conversa y usa por sí mismo las herramientas de agenda (consultar disponibilidad,
            agendar, reagendar, cancelar) con la fecha/hora real de la zona indicada. No usa palabras clave
            ni salta a otro sub-flujo.
          </p>
          <Field label="Calendario · Origen">
            <select
              className="input"
              value={data.calendarSource || 'platform'}
              onChange={(e) => patch({ calendarSource: e.target.value })}
            >
              <option value="platform">Plataforma · cuenta de servicio</option>
              <option value="platformOauth">Plataforma · OAuth</option>
              <option value="tenant">Integración de la empresa</option>
            </select>
          </Field>
          <Field label="Calendario · ID (correo del calendario compartido)">
            <input
              className="input"
              value={data.calendarId || ''}
              placeholder="agenda@empresa.com  ·  primary (solo OAuth)"
              onChange={(e) => patch({ calendarId: e.target.value })}
            />
          </Field>
          <Field label="Duración de la cita (min)">
            <input
              className="input"
              type="number"
              value={data.citaDurationMin || ''}
              placeholder="60"
              onChange={(e) => patch({ citaDurationMin: Number(e.target.value) || undefined })}
            />
          </Field>
          <Field label="Zona horaria del negocio">
            <input
              className="input"
              value={data.timezone || ''}
              placeholder="America/Bogota"
              onChange={(e) => patch({ timezone: e.target.value })}
            />
          </Field>
        </>
      ) : (
        <>
          <Field label="Palabras que avanzan el flujo (coma)">
            <input
              className="input"
              value={Array.isArray(data.exitKeywords) ? data.exitKeywords.join(', ') : data.exitKeywords || ''}
              placeholder="agendar, cita, reservar"
              onChange={(e) => patch({ exitKeywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
          <Field label="Marcador de salida de la IA">
            <input
              className="input"
              value={data.exitMarker || ''}
              placeholder="[[AGENDAR]]"
              onChange={(e) => patch({ exitMarker: e.target.value })}
            />
          </Field>
          <p className="text-[11px] text-slate-500">
            En modo conversacional, el flujo sale por <b>Salida</b> si el usuario escribe una de esas
            palabras o si la IA incluye el marcador en su respuesta (se retira del texto visible).
            La API key se guarda con el flujo.
          </p>
        </>
      )}
    </>
  );
}
