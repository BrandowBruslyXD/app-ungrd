import { useMemo, useRef, useState } from 'react';
import type { EdanEventType, IncidentStatus } from '@/types/edan';
import type { Coordenadas } from '@/components/ui/MapaUbicacion';
import { MUNICIPALITIES_BY_DEPT } from '@/mocks/mockEdan';
import { guardarRegistro } from '@/lib/almacenamiento';

export interface IncidentForm {
  eventType: EdanEventType | '';
  eventDate: string;
  departamento: string;
  municipio: string;
  location: string;
  /** Punto marcado en el mapa. Vale por sí solo, sin dirección escrita. */
  coordinates: Coordenadas | null;
  description: string;
  personsInjured: number;
  personsDead: number;
  personsMissing: number;
  personsEvacuated: number;
  familiesAffected: number;
  linkedReportId: string;
  status: IncidentStatus;
}

export const INCIDENT_STEP_COUNT = 4;

export type IncidentPersonCountKey =
  | 'personsInjured'
  | 'personsDead'
  | 'personsMissing'
  | 'personsEvacuated';

export type IncidentCountKey = IncidentPersonCountKey | 'familiesAffected';

function createInitialForm(): IncidentForm {
  return {
    eventType: '',
    eventDate: new Date().toISOString().split('T')[0],
    departamento: '',
    municipio: '',
    location: '',
    coordinates: null,
    description: '',
    personsInjured: 0,
    personsDead: 0,
    personsMissing: 0,
    personsEvacuated: 0,
    familiesAffected: 0,
    linkedReportId: '',
    status: 'en_atencion',
  };
}

/**
 * Comprueba si un paso está completo.
 *
 * Se exporta para poder probar las reglas sin montar el componente.
 */
export function puedeAvanzar(paso: number, form: IncidentForm): boolean {
  if (paso === 1) {
    return Boolean(form.eventType && form.eventDate);
  }
  if (paso === 2) {
    return Boolean(
      form.departamento && form.municipio && (form.location.trim() || form.coordinates),
    );
  }
  if (paso === 3) {
    return form.description.trim().length >= 10;
  }
  if (paso === 4) {
    // El paso de cierre ya no pasa siempre. Un incidente que reporta personas
    // desaparecidas o fallecidas no puede quedar marcado como «cerrado»: esa
    // información sube al consolidado municipal y cerrarla sin atención deja el
    // dato sin trazabilidad.
    const hayVictimas = form.personsDead > 0 || form.personsMissing > 0;
    return !(hayVictimas && form.status === 'cerrado');
  }
  return false;
}

/**
 * Estado y reglas del registro de incidente atendido.
 */
export function useIncidentLog() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [noSePudoGuardar, setNoSePudoGuardar] = useState(false);
  const yaEnviado = useRef(false);
  const [form, setForm] = useState<IncidentForm>(createInitialForm);

  const municipalities = form.departamento ? (MUNICIPALITIES_BY_DEPT[form.departamento] ?? []) : [];

  const update = (partial: Partial<IncidentForm>): void => {
    setForm((prev) => {
      const next = { ...prev, ...partial };

      // Al cambiar de departamento, el municipio anterior deja de existir en la
      // lista y hay que soltarlo: si no, queda un municipio de otro
      // departamento pegado al dato y nadie lo nota hasta que falla el mapa.
      //
      // La condición de `municipio === undefined` importa: cuando la llamada
      // trae los dos campos a la vez —restaurar un borrador, o una prueba— el
      // municipio que viene es el bueno y borrarlo sería el error contrario.
      const cambiaDepartamento =
        partial.departamento !== undefined && partial.departamento !== prev.departamento;

      if (cambiaDepartamento && partial.municipio === undefined) {
        next.municipio = '';
      }

      return next;
    });
  };

  const canProceed = useMemo(() => puedeAvanzar(step, form), [step, form]);

  const adjustCount = (key: IncidentCountKey, delta: number): void => {
    setForm((prev) => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }));
  };

  /*
   * La guarda va en una referencia, no en el estado.
   *
   * `submitted` es estado de React y se actualiza por lotes: dos toques dentro
   * del mismo ciclo —lo que pasa con un doble toque real, o con un guante
   * mojado sobre la pantalla— veían ambos `submitted === false` y guardaban dos
   * folios distintos para el mismo incidente. Una referencia cambia en el acto.
   */
  const submit = (): void => {
    if (yaEnviado.current || !canProceed) {
      return;
    }
    yaEnviado.current = true;

    const { registro, persistido } = guardarRegistro('incidente', form);
    setResultId(registro.codigo);
    setNoSePudoGuardar(!persistido);
    setSubmitted(true);
  };

  const reset = (): void => {
    setForm(createInitialForm());
    setStep(1);
    setSubmitted(false);
    setResultId(null);
    setNoSePudoGuardar(false);
    yaEnviado.current = false;
  };

  const goNext = (): void => {
    if (!canProceed) {
      return;
    }
    setStep((current) => Math.min(INCIDENT_STEP_COUNT, current + 1));
  };

  const goPrev = (): void => {
    setStep((current) => Math.max(1, current - 1));
  };

  return {
    step,
    setStep,
    form,
    update,
    municipalities,
    canProceed,
    submitted,
    resultId,
    noSePudoGuardar,
    submit,
    reset,
    adjustCount,
    goNext,
    goPrev,
  };
}
