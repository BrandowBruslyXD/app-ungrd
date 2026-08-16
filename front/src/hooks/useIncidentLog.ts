import { useMemo, useState } from 'react';
import type { EdanEventType, IncidentStatus } from '@/types/edan';
import { MUNICIPALITIES_BY_DEPT } from '@/mocks/mockEdan';

export interface IncidentForm {
  eventType: EdanEventType | '';
  eventDate: string;
  departamento: string;
  municipio: string;
  location: string;
  useGps: boolean;
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

export type IncidentCountKey =
  | 'personsInjured'
  | 'personsDead'
  | 'personsMissing'
  | 'personsEvacuated'
  | 'familiesAffected';

function createInitialForm(): IncidentForm {
  return {
    eventType: '',
    eventDate: new Date().toISOString().split('T')[0],
    departamento: '',
    municipio: '',
    location: '',
    useGps: false,
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

function buildIncidentId(): string {
  return `INC-2026-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`;
}

/**
 * Estado y reglas del registro de incidente atendido.
 */
export function useIncidentLog() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [form, setForm] = useState<IncidentForm>(createInitialForm);

  const municipalities = form.departamento ? (MUNICIPALITIES_BY_DEPT[form.departamento] ?? []) : [];

  const update = (partial: Partial<IncidentForm>): void => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  const canProceed = useMemo(() => {
    if (step === 1) return Boolean(form.eventType && form.eventDate);
    if (step === 2) return Boolean(form.departamento && form.municipio && (form.location || form.useGps));
    if (step === 3) return form.description.length >= 10;
    if (step === 4) return true;
    return false;
  }, [step, form]);

  const adjustCount = (key: IncidentCountKey, delta: number): void => {
    setForm((prev) => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }));
  };

  const submit = (): void => {
    setResultId(buildIncidentId());
    setSubmitted(true);
  };

  const goNext = (): void => {
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
    submit,
    adjustCount,
    goNext,
    goPrev,
  };
}
