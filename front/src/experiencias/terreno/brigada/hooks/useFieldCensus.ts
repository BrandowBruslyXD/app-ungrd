import { useMemo, useState } from 'react';
import type { CensusWizardState, WizardFamily, WizardPerson, Parentesco } from '@/shared/types/edan';

export const CENSUS_STEP_COUNT = 6;

/**
 * Crea una persona vacía para el censo de campo.
 */
export function createBlankPerson(): WizardPerson {
  return {
    id: crypto.randomUUID(),
    documentType: 'CC',
    documentNumber: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    sexo: 'M',
    parentesco: 'jefe_hogar' as Parentesco,
    grupoEtnico: 'ninguno',
    discapacidad: 'ninguna',
    condicionSalud: 'ileso',
    healthNotes: '',
    isPregnant: false,
    isLactating: false,
    isMinorUnaccompanied: false,
  };
}

/**
 * Crea una familia vacía con un jefe de hogar.
 */
export function createBlankFamily(): WizardFamily {
  return {
    id: crypto.randomUUID(),
    persons: [createBlankPerson()],
    needs: [],
    needNotes: '',
  };
}

/**
 * Ajusta el arreglo de familias al conteo declarado en la vivienda.
 */
export function syncFamilies(count: number, current: WizardFamily[]): WizardFamily[] {
  if (count > current.length) {
    return [...current, ...Array.from({ length: count - current.length }, createBlankFamily)];
  }
  return current.slice(0, count);
}

function createInitialState(): CensusWizardState {
  return {
    eventType: '',
    eventDate: new Date().toISOString().split('T')[0],
    departamento: '',
    municipio: '',
    zone: 'urbano',
    zoneName: '',
    address: '',
    coordinates: null,
    numberOfFamilies: 1,
    housingType: 'casa',
    ownershipType: 'propia',
    waterAffected: false,
    sewerAffected: false,
    electricityAffected: false,
    families: [createBlankFamily()],
    damageAggregate: 'sin_dano',
    damageStructural: '',
    damageNotes: '',
    affectedGoods: [],
    consentGranted: false,
  };
}

/**
 * Estado y reglas del asistente de censo EDAN de campo.
 */
export function useFieldCensus() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<CensusWizardState>(createInitialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (partial: Partial<CensusWizardState>): void => {
    setData((prev) => {
      const next: CensusWizardState = { ...prev, ...partial };
      if (partial.numberOfFamilies !== undefined && partial.numberOfFamilies !== prev.numberOfFamilies) {
        next.families = syncFamilies(partial.numberOfFamilies, prev.families);
      }
      return next;
    });
  };

  const validations = useMemo(() => {
    const v: Record<number, boolean> = {};
    v[1] = !!data.eventType && !!data.eventDate && !!data.departamento && !!data.municipio && !!data.zoneName;
    v[2] = !!data.address && data.numberOfFamilies >= 1;
    v[3] = data.families.every(
      (f) =>
        f.persons.length >= 1 &&
        f.persons.every((p) => !!p.firstName && !!p.lastName) &&
        f.persons.filter((p) => p.parentesco === 'jefe_hogar').length === 1
    );
    v[4] = !!data.damageAggregate;
    v[5] = data.families.every((f) => f.needs.length >= 1);
    v[6] = data.consentGranted;
    return v;
  }, [data]);

  const canProceed = validations[step] ?? false;
  const totalPersons = data.families.reduce((sum, family) => sum + family.persons.length, 0);

  const handleSubmit = (): void => {
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  const reset = (): void => {
    setData(createInitialState());
    setStep(1);
    setSubmitted(false);
    setSubmitting(false);
  };

  const goNext = (): void => {
    setStep((current) => Math.min(CENSUS_STEP_COUNT, current + 1));
  };

  const goPrev = (): void => {
    setStep((current) => Math.max(1, current - 1));
  };

  return {
    step,
    setStep,
    data,
    update,
    submitting,
    submitted,
    validations,
    canProceed,
    totalPersons,
    handleSubmit,
    reset,
    goNext,
    goPrev,
    createBlankPerson,
  };
}
