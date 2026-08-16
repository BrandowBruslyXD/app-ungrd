import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHabitability, HABITABILITY_STEP_COUNT } from './useHabitability';

describe('useHabitability — reset limpia incidentLogId', () => {
  it('reset deja incidentLogId vacío después de haberlo asignado', () => {
    const { result } = renderHook(() => useHabitability());

    act(() => {
      result.current.update({ incidentLogId: 'INC-2026-0091' });
    });
    expect(result.current.form.incidentLogId).toBe('INC-2026-0091');

    act(() => {
      result.current.reset();
    });
    expect(result.current.form.incidentLogId).toBe('');
  });

  it('reset devuelve el paso a 1', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.setStep(3);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.step).toBe(1);
  });

  it('reset borra el resultado de una evaluación enviada', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.submit();
    });
    expect(result.current.submitted).toBe(true);
    act(() => {
      result.current.reset();
    });
    expect(result.current.submitted).toBe(false);
    expect(result.current.resultId).toBeNull();
  });
});

describe('useHabitability — canProceed', () => {
  it('canProceed es false en paso 1 con formulario vacío', () => {
    const { result } = renderHook(() => useHabitability());
    expect(result.current.canProceed).toBe(false);
  });

  it('canProceed es true en paso 1 cuando address, housingType e incidentLogId están llenos', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.update({
        address: 'Calle 10 #5-20',
        housingType: 'casa',
        incidentLogId: 'INC-2026-0091',
      });
    });
    expect(result.current.canProceed).toBe(true);
  });

  it('canProceed es false en paso 1 cuando falta incidentLogId aunque address y housingType estén llenos', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.update({ address: 'Calle 10 #5-20', housingType: 'casa', incidentLogId: '' });
    });
    expect(result.current.canProceed).toBe(false);
  });

  it('canProceed es false en paso 2 cuando faltan habitability y damageAggregate', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.setStep(2);
    });
    expect(result.current.canProceed).toBe(false);
  });

  it('canProceed es true en paso 2 cuando habitability y damageAggregate están llenos', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.setStep(2);
      result.current.update({ habitability: 'habitable', damageAggregate: 'averiada' });
    });
    expect(result.current.canProceed).toBe(true);
  });

  it('canProceed es siempre true en paso 3', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.setStep(3);
    });
    expect(result.current.canProceed).toBe(true);
  });
});

describe('useHabitability — adjustOccupants', () => {
  it('no baja de 0 al restar cuando ya está en 0', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.adjustOccupants(-1);
    });
    expect(result.current.form.occupantsPresent).toBe(0);
  });

  it('incrementa el conteo de ocupantes correctamente', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.adjustOccupants(3);
    });
    expect(result.current.form.occupantsPresent).toBe(3);
  });
});

describe('useHabitability — navegación', () => {
  it('goNext no supera HABITABILITY_STEP_COUNT', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.setStep(HABITABILITY_STEP_COUNT);
      result.current.goNext();
    });
    expect(result.current.step).toBe(HABITABILITY_STEP_COUNT);
  });

  it('goPrev no baja de 1', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.goPrev();
    });
    expect(result.current.step).toBe(1);
  });
});
