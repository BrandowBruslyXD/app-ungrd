import { useMemo, useRef, useState } from 'react';
import type { CensusWizardState, WizardFamily, WizardPerson, Parentesco } from '@/types/edan';
import { guardarRegistro } from '@/lib/almacenamiento';

export const CENSUS_STEP_COUNT = 6;

/** Motivo por el que el documento de una persona no sirve todavía. */
export type ProblemaDocumento = 'documento_requerido' | 'documento_duplicado';

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

/**
 * Normaliza un documento para compararlo: sin espacios, puntos ni guiones.
 *
 * En campo la misma cédula se escribe «1.020.304», «1020304» y «1 020 304».
 * Sin normalizar, la validación de duplicados no atraparía ninguna de las tres.
 */
function normalizarDocumento(valor: string): string {
  return valor.replace(/[\s.-]/g, '').toUpperCase();
}

/**
 * Detecta los problemas de documento de todas las personas de la operación.
 *
 * Implementa dos de las tres validaciones duras que el RUD ya impone al digitar
 * (`docs/SISTEMA-REPORTES-COLOMBIA.md`, §9.2 punto 3). Copiarlas aquí evita que
 * el brigadista descubra el error semanas después, cuando alguien en la alcaldía
 * intente subir la planilla y el sistema la rechace.
 *
 * La excepción de `sin_documento` es deliberada: hay personas que perdieron
 * todo, incluidos los papeles, y exigirles un número las dejaría fuera del
 * censo. El formato oficial contempla ese caso.
 */
export function detectarProblemasDeDocumento(
  families: readonly WizardFamily[],
): Record<string, ProblemaDocumento> {
  const problemas: Record<string, ProblemaDocumento> = {};
  const vistos = new Map<string, string>();

  for (const familia of families) {
    for (const persona of familia.persons) {
      if (persona.documentType === 'sin_documento') {
        continue;
      }

      const documento = normalizarDocumento(persona.documentNumber);

      if (!documento) {
        problemas[persona.id] = 'documento_requerido';
        continue;
      }

      const anterior = vistos.get(documento);
      if (anterior) {
        // Se marcan las dos: quien revisa tiene que poder ver ambas filas.
        problemas[anterior] = 'documento_duplicado';
        problemas[persona.id] = 'documento_duplicado';
        continue;
      }

      vistos.set(documento, persona.id);
    }
  }

  return problemas;
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
  const [codigo, setCodigo] = useState('');
  const [fallosDePersistencia, setFallosDePersistencia] = useState(false);
  const yaEnviado = useRef(false);

  const update = (partial: Partial<CensusWizardState>): void => {
    setData((prev) => {
      const next: CensusWizardState = { ...prev, ...partial };
      if (partial.numberOfFamilies !== undefined && partial.numberOfFamilies !== prev.numberOfFamilies) {
        next.families = syncFamilies(partial.numberOfFamilies, prev.families);
      }
      return next;
    });
  };

  const problemasDeDocumento = useMemo(
    () => detectarProblemasDeDocumento(data.families),
    [data.families],
  );

  const validations = useMemo(() => {
    const v: Record<number, boolean> = {};

    v[1] =
      !!data.eventType && !!data.eventDate && !!data.departamento && !!data.municipio && !!data.zoneName;

    v[2] = !!data.address && data.numberOfFamilies >= 1;

    const jefes = data.families.filter(
      (f) => f.persons.filter((p) => p.parentesco === 'jefe_hogar').length === 1,
    ).length;

    v[3] =
      // Nombre y apellido de todos.
      data.families.every(
        (f) => f.persons.length >= 1 && f.persons.every((p) => !!p.firstName.trim() && !!p.lastName.trim()),
      ) &&
      // Exactamente un jefe de hogar por familia, y tantos jefes como familias.
      jefes === data.families.length &&
      // Documento presente y sin repetir dentro del mismo evento.
      Object.keys(problemasDeDocumento).length === 0;

    v[4] = !!data.damageAggregate;
    v[5] = data.families.every((f) => f.needs.length >= 1);
    v[6] = data.consentGranted;

    return v;
  }, [data, problemasDeDocumento]);

  const canProceed = validations[step] ?? false;
  const totalPersons = data.families.reduce((sum, family) => sum + family.persons.length, 0);

  const handleSubmit = (): void => {
  /*
   * La guarda va en una referencia, no en el estado.
   *
   * `submitted` es estado de React y se actualiza por lotes: dos toques dentro
   * del mismo ciclo —lo que pasa con un doble toque real, o con un guante
   * mojado sobre la pantalla— veian ambos `submitted === false` y guardaban dos
   * registros del mismo hecho. Una referencia cambia en el acto.
   */
    if (yaEnviado.current || !canProceed) {
      return;
    }
    yaEnviado.current = true;
    setSubmitting(true);

    // Sin consentimiento no se persiste nada. Ley 1581 de 2012: el censo captura
    // documento, edad, etnia y estado de salud, incluidos los de menores.
    if (!data.consentGranted) {
      yaEnviado.current = false;
      setSubmitting(false);
      return;
    }

    const { registro, persistido } = guardarRegistro('censo', data);
    setCodigo(registro.codigo);
    setFallosDePersistencia(!persistido);
    setSubmitting(false);
    setSubmitted(true);
  };

  const reset = (): void => {
    setData(createInitialState());
    setStep(1);
    setSubmitted(false);
    setSubmitting(false);
    setCodigo('');
    setFallosDePersistencia(false);
    yaEnviado.current = false;
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
    codigo,
    fallosDePersistencia,
    validations,
    canProceed,
    totalPersons,
    problemasDeDocumento,
    handleSubmit,
    reset,
    goNext,
    goPrev,
    createBlankPerson,
  };
}
