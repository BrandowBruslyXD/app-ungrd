import { beforeEach, describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  syncFamilies,
  createBlankFamily,
  detectarProblemasDeDocumento,
  useFieldCensus,
  CENSUS_STEP_COUNT,
} from './useFieldCensus';
import type { WizardFamily, WizardPerson } from '@/types/edan';
import { limpiarRegistros, listarRegistros } from '@/lib/almacenamiento';

// ── syncFamilies (función pura) ──────────────────────────────────────────────

describe('syncFamilies', () => {
  it('agrega familias vacías cuando el conteo nuevo supera el actual', () => {
    const familias = [createBlankFamily()];
    const resultado = syncFamilies(3, familias);
    expect(resultado.length).toBe(3);
  });

  it('conserva las familias originales al principio del arreglo al crecer', () => {
    const original = [createBlankFamily()];
    const id0 = original[0].id;
    const resultado = syncFamilies(2, original);
    expect(resultado[0].id).toBe(id0);
  });

  it('recorta familias cuando el conteo nuevo es menor que el actual', () => {
    const familias = [createBlankFamily(), createBlankFamily(), createBlankFamily()];
    const resultado = syncFamilies(1, familias);
    expect(resultado.length).toBe(1);
  });

  it('mantiene la familia de índice 0 al encoger', () => {
    const primera = createBlankFamily();
    const familias = [primera, createBlankFamily(), createBlankFamily()];
    const resultado = syncFamilies(1, familias);
    expect(resultado[0].id).toBe(primera.id);
  });

  it('devuelve el mismo arreglo de longitud cuando el conteo coincide', () => {
    const familias = [createBlankFamily(), createBlankFamily()];
    const resultado = syncFamilies(2, familias);
    expect(resultado.length).toBe(2);
  });
});

// ── useFieldCensus (hook) ───────────────────────────────────────────────────

describe('useFieldCensus — canProceed', () => {
  it('canProceed es false en paso 1 con estado inicial vacío', () => {
    const { result } = renderHook(() => useFieldCensus());
    expect(result.current.canProceed).toBe(false);
  });

  it('canProceed es true en paso 1 cuando todos los campos requeridos están llenos', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.update({
        eventType: 'inundacion',
        eventDate: '2026-08-14',
        departamento: 'Putumayo',
        municipio: 'Mocoa',
        zoneName: 'Vereda El Carmen',
      });
    });
    expect(result.current.canProceed).toBe(true);
  });

  it('canProceed es false en paso 2 cuando address está vacío', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.setStep(2);
      result.current.update({ address: '' });
    });
    expect(result.current.canProceed).toBe(false);
  });

  it('canProceed es true en paso 2 cuando address está lleno y hay al menos una familia', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.setStep(2);
      result.current.update({ address: 'Calle 5 #12-34', numberOfFamilies: 1 });
    });
    expect(result.current.canProceed).toBe(true);
  });

  it('canProceed es false en paso 6 sin consentimiento', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.setStep(6);
      result.current.update({ consentGranted: false });
    });
    expect(result.current.canProceed).toBe(false);
  });

  it('canProceed es true en paso 6 con consentimiento otorgado', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.setStep(6);
      result.current.update({ consentGranted: true });
    });
    expect(result.current.canProceed).toBe(true);
  });
});

describe('useFieldCensus — update sincroniza familias al cambiar numberOfFamilies', () => {
  it('crea familias adicionales cuando numberOfFamilies aumenta', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.update({ numberOfFamilies: 3 });
    });
    expect(result.current.data.families.length).toBe(3);
  });

  it('elimina familias sobrantes cuando numberOfFamilies disminuye', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.update({ numberOfFamilies: 4 });
    });
    act(() => {
      result.current.update({ numberOfFamilies: 2 });
    });
    expect(result.current.data.families.length).toBe(2);
  });
});

describe('useFieldCensus — reset', () => {
  it('vuelve al paso 1 y borra los cambios tras reset', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.update({ eventType: 'inundacion', departamento: 'Putumayo' });
      result.current.setStep(3);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.step).toBe(1);
    expect(result.current.data.eventType).toBe('');
  });
});

describe('useFieldCensus — navegación', () => {
  it('goNext avanza al paso siguiente', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.goNext();
    });
    expect(result.current.step).toBe(2);
  });

  it('goNext no supera CENSUS_STEP_COUNT', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.setStep(CENSUS_STEP_COUNT);
      result.current.goNext();
    });
    expect(result.current.step).toBe(CENSUS_STEP_COUNT);
  });

  it('goPrev no baja de 1', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.goPrev();
    });
    expect(result.current.step).toBe(1);
  });
});

// ── Validaciones duras heredadas del RUD ─────────────────────────────────────
//
// Las tres reglas que el RUD ya impone al digitar y que aquí se adelantan al
// momento de la captura, para que el error no aparezca semanas después cuando
// la alcaldía intente subir la planilla.

function personaCon(parcial: Partial<WizardPerson>): WizardPerson {
  return {
    id: crypto.randomUUID(),
    documentType: 'CC',
    documentNumber: '',
    firstName: 'Ana',
    lastName: 'Pérez',
    birthDate: '',
    sexo: 'F',
    parentesco: 'jefe_hogar',
    grupoEtnico: 'ninguno',
    discapacidad: 'ninguna',
    condicionSalud: 'ileso',
    healthNotes: '',
    isPregnant: false,
    isLactating: false,
    isMinorUnaccompanied: false,
    ...parcial,
  };
}

function familiaCon(personas: WizardPerson[]): WizardFamily {
  return { id: crypto.randomUUID(), persons: personas, needs: ['ahe_alimentaria'], needNotes: '' };
}

describe('detectarProblemasDeDocumento', () => {
  it('marca documento_requerido cuando el número está vacío', () => {
    const persona = personaCon({ documentNumber: '' });
    const problemas = detectarProblemasDeDocumento([familiaCon([persona])]);
    expect(problemas[persona.id]).toBe('documento_requerido');
  });

  it('no exige número cuando el tipo de documento es sin_documento', () => {
    const persona = personaCon({ documentType: 'sin_documento', documentNumber: '' });
    const problemas = detectarProblemasDeDocumento([familiaCon([persona])]);
    expect(problemas[persona.id]).toBeUndefined();
  });

  it('marca las dos personas cuando el documento se repite en la misma familia', () => {
    const primera = personaCon({ documentNumber: '1020304' });
    const segunda = personaCon({ documentNumber: '1020304', parentesco: 'hijo' });
    const problemas = detectarProblemasDeDocumento([familiaCon([primera, segunda])]);
    expect(problemas[primera.id]).toBe('documento_duplicado');
    expect(problemas[segunda.id]).toBe('documento_duplicado');
  });

  it('detecta el duplicado aunque esté en otra familia de la misma operación', () => {
    const primera = personaCon({ documentNumber: '1020304' });
    const segunda = personaCon({ documentNumber: '1020304' });
    const problemas = detectarProblemasDeDocumento([
      familiaCon([primera]),
      familiaCon([segunda]),
    ]);
    expect(problemas[segunda.id]).toBe('documento_duplicado');
  });

  it('detecta el duplicado cuando el mismo número se escribió con puntos y espacios', () => {
    const primera = personaCon({ documentNumber: '1.020.304' });
    const segunda = personaCon({ documentNumber: '1 020 304' });
    const problemas = detectarProblemasDeDocumento([familiaCon([primera, segunda])]);
    expect(problemas[primera.id]).toBe('documento_duplicado');
    expect(problemas[segunda.id]).toBe('documento_duplicado');
  });

  it('no marca nada cuando los documentos son distintos y están completos', () => {
    const problemas = detectarProblemasDeDocumento([
      familiaCon([personaCon({ documentNumber: '1020304' })]),
      familiaCon([personaCon({ documentNumber: '5060708' })]),
    ]);
    expect(Object.keys(problemas)).toHaveLength(0);
  });
});

describe('useFieldCensus — paso 3 bloquea con documentos inválidos', () => {
  it('no deja avanzar cuando falta el número de documento', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.update({ families: [familiaCon([personaCon({ documentNumber: '' })])] });
      result.current.setStep(3);
    });
    expect(result.current.canProceed).toBe(false);
  });

  it('no deja avanzar cuando hay una cédula repetida', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.update({
        families: [
          familiaCon([personaCon({ documentNumber: '1020304' })]),
          familiaCon([personaCon({ documentNumber: '1020304' })]),
        ],
      });
      result.current.setStep(3);
    });
    expect(result.current.canProceed).toBe(false);
  });

  it('deja avanzar cuando cada persona tiene documento propio y hay un jefe por familia', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.update({
        families: [
          familiaCon([
            personaCon({ documentNumber: '1020304' }),
            personaCon({ documentNumber: '5060708', parentesco: 'hijo' }),
          ]),
        ],
      });
      result.current.setStep(3);
    });
    expect(result.current.canProceed).toBe(true);
  });

  it('no deja avanzar cuando una familia tiene dos jefes de hogar', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.update({
        families: [
          familiaCon([
            personaCon({ documentNumber: '1020304' }),
            personaCon({ documentNumber: '5060708' }),
          ]),
        ],
      });
      result.current.setStep(3);
    });
    expect(result.current.canProceed).toBe(false);
  });
});

describe('useFieldCensus — persistencia del censo', () => {
  beforeEach(() => {
    limpiarRegistros();
  });

  it('guarda el censo y entrega un código con prefijo EDAN al enviar', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.update({ consentGranted: true });
      result.current.setStep(6);
    });
    act(() => {
      result.current.handleSubmit();
    });

    expect(result.current.submitted).toBe(true);
    expect(result.current.codigo).toMatch(/^EDAN-\d{4}-\d{2}-\d{2}-\d{4}-[A-Z0-9]{4}$/);
    expect(listarRegistros('censo')).toHaveLength(1);
  });

  it('no guarda nada sin consentimiento de tratamiento de datos', () => {
    const { result } = renderHook(() => useFieldCensus());
    act(() => {
      result.current.setStep(6);
    });
    act(() => {
      result.current.handleSubmit();
    });

    expect(result.current.submitted).toBe(false);
    expect(listarRegistros('censo')).toHaveLength(0);
  });
});
