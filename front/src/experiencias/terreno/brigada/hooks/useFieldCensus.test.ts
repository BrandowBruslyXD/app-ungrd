import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  syncFamilies,
  createBlankFamily,
  useFieldCensus,
  CENSUS_STEP_COUNT,
} from './useFieldCensus';

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
