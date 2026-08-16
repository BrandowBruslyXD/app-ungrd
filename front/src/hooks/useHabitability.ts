import { useMemo, useRef, useState } from 'react';
import type { Habitability, HousingDamageAggregate } from '@/types/edan';
import { mockIncidentLogs } from '@/mocks/mockSocorro';
import { guardarRegistro } from '@/lib/almacenamiento';

export interface HabitabilityForm {
  incidentLogId: string;
  address: string;
  housingType: 'casa' | 'apartamento' | 'habitacion' | 'improvisada' | 'otro' | '';
  habitability: Habitability | '';
  damageAggregate: HousingDamageAggregate | '';
  needsStructuralInspection: boolean;
  occupantsPresent: number;
  notes: string;
  evacuationNotificationIssued: boolean;
  temporaryShelterActivated: boolean;
}

export const HABITABILITY_STEP_COUNT = 3;

function createInitialForm(): HabitabilityForm {
  return {
    incidentLogId: '',
    address: '',
    housingType: '',
    habitability: '',
    damageAggregate: '',
    needsStructuralInspection: false,
    occupantsPresent: 0,
    notes: '',
    evacuationNotificationIssued: false,
    temporaryShelterActivated: false,
  };
}

/**
 * Daños que son incompatibles con cada concepto de habitabilidad.
 *
 * Una vivienda declarada **no habitable** no puede quedar registrada como «sin
 * daño»: es una contradicción que el formulario permitía y que río abajo
 * produce un consolidado municipal donde las cifras no cuadran.
 */
export function danoEsCoherente(
  habitability: Habitability | '',
  dano: HousingDamageAggregate | '',
): boolean {
  if (!habitability || !dano) {
    return true;
  }
  if (habitability === 'no_habitable') {
    return dano === 'averiada' || dano === 'destruida';
  }
  if (habitability === 'uso_restringido') {
    return dano !== 'sin_dano';
  }
  return true;
}

/**
 * Comprueba si un paso está completo. Se exporta para poder probar las reglas
 * sin montar el componente.
 */
export function puedeAvanzar(paso: number, form: HabitabilityForm): boolean {
  if (paso === 1) {
    return Boolean(form.address.trim() && form.housingType && form.incidentLogId);
  }
  if (paso === 2) {
    return (
      Boolean(form.habitability && form.damageAggregate) &&
      danoEsCoherente(form.habitability, form.damageAggregate)
    );
  }
  if (paso === 3) {
    // Antes devolvía `true` siempre. La investigación (§8, rama SO6→SO7) es
    // explícita: si la vivienda no es habitable hay que emitir la Notificación
    // Personal de Afectación e Inminente Riesgo y activar alojamiento temporal.
    // Dejar salir el registro sin eso deja a una familia sin dónde dormir y sin
    // el documento que se lo acredita.
    if (form.habitability === 'no_habitable') {
      return form.evacuationNotificationIssued && form.temporaryShelterActivated;
    }
    return true;
  }
  return false;
}

/**
 * Estado y reglas de la evaluación de habitabilidad.
 */
export function useHabitability() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [noSePudoGuardar, setNoSePudoGuardar] = useState(false);
  const yaEnviado = useRef(false);
  const [form, setForm] = useState<HabitabilityForm>(createInitialForm);

  const activeIncidents = mockIncidentLogs.filter((incident) => incident.status !== 'cerrado');

  const update = (partial: Partial<HabitabilityForm>): void => {
    setForm((prev) => {
      const next = { ...prev, ...partial };

      // Al declarar «no habitable» se marcan las dos acciones obligatorias, y se
      // limpia un daño que hubiera quedado en «sin daño». Se pueden desmarcar
      // después, pero entonces el paso 3 no deja cerrar y dice por qué.
      if (partial.habitability === 'no_habitable') {
        next.evacuationNotificationIssued = true;
        next.temporaryShelterActivated = true;
        if (next.damageAggregate === 'sin_dano') {
          next.damageAggregate = '';
        }
      }

      if (partial.habitability === 'uso_restringido' && next.damageAggregate === 'sin_dano') {
        next.damageAggregate = '';
      }

      return next;
    });
  };

  const canProceed = useMemo(() => puedeAvanzar(step, form), [step, form]);

  const adjustOccupants = (delta: number): void => {
    setForm((prev) => ({ ...prev, occupantsPresent: Math.max(0, prev.occupantsPresent + delta) }));
  };

  /*
   * La guarda va en una referencia, no en el estado.
   *
   * `submitted` es estado de React y se actualiza por lotes: dos toques dentro
   * del mismo ciclo —lo que pasa con un doble toque real, o con un guante
   * mojado sobre la pantalla— veian ambos `submitted === false` y guardaban dos
   * registros del mismo hecho. Una referencia cambia en el acto.
   */
  const submit = (): void => {
    if (yaEnviado.current || !canProceed) {
      return;
    }
    yaEnviado.current = true;

    const { registro, persistido } = guardarRegistro('habitabilidad', form);
    setResultId(registro.codigo);
    setNoSePudoGuardar(!persistido);
    setSubmitted(true);
  };

  /**
   * Reinicia el formulario, incluida la vinculación al incidente.
   */
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
    setStep((current) => Math.min(HABITABILITY_STEP_COUNT, current + 1));
  };

  const goPrev = (): void => {
    setStep((current) => Math.max(1, current - 1));
  };

  return {
    step,
    setStep,
    form,
    update,
    activeIncidents,
    canProceed,
    submitted,
    resultId,
    noSePudoGuardar,
    submit,
    reset,
    adjustOccupants,
    goNext,
    goPrev,
  };
}
