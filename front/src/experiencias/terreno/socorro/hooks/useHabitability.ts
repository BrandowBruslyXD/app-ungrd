import { useMemo, useState } from 'react';
import type { Habitability, HousingDamageAggregate } from '@/shared/types/edan';
import { mockIncidentLogs } from '@/shared/mocks/mockSocorro';

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

function buildAssessmentId(): string {
  return `HA-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`;
}

/**
 * Estado y reglas de la evaluación de habitabilidad.
 * `reset` limpia `incidentLogId` para poder evaluar otra vivienda.
 */
export function useHabitability() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [form, setForm] = useState<HabitabilityForm>(createInitialForm);

  const activeIncidents = mockIncidentLogs.filter((incident) => incident.status !== 'cerrado');

  const update = (partial: Partial<HabitabilityForm>): void => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  const canProceed = useMemo(() => {
    if (step === 1) return Boolean(form.address && form.housingType && form.incidentLogId);
    if (step === 2) return Boolean(form.habitability && form.damageAggregate);
    if (step === 3) return true;
    return false;
  }, [step, form]);

  const adjustOccupants = (delta: number): void => {
    setForm((prev) => ({ ...prev, occupantsPresent: Math.max(0, prev.occupantsPresent + delta) }));
  };

  /** Una vivienda se evalúa una sola vez: dos toques seguidos no pueden crear dos evaluaciones. */
  const submit = (): void => {
    if (submitted) {
      return;
    }
    setResultId(buildAssessmentId());
    setSubmitted(true);
  };

  /**
   * Reinicia el formulario, incluida la vinculación al incidente.
   */
  const reset = (): void => {
    const blank = createInitialForm();
    blank.incidentLogId = '';
    setForm(blank);
    setStep(1);
    setSubmitted(false);
    setResultId(null);
  };

  const goNext = (): void => {
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
    submit,
    reset,
    adjustOccupants,
    goNext,
    goPrev,
  };
}
