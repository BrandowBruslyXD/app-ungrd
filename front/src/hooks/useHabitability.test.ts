import { beforeEach, describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHabitability, HABITABILITY_STEP_COUNT, danoEsCoherente } from './useHabitability';
import { limpiarRegistros, listarRegistros } from '@/lib/almacenamiento';

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

    // Antes bastaba con llamar a `submit()` sobre un formulario vacío y la
    // evaluación se daba por enviada. Ahora hay guarda, así que la prueba tiene
    // que recorrer el flujo como lo haría una persona.
    act(() => {
      result.current.update({
        incidentLogId: 'INC-2026-0091',
        address: 'Vereda El Carmen, casa 3',
        housingType: 'casa',
        habitability: 'habitable',
        damageAggregate: 'averiada',
      });
      result.current.setStep(3);
    });
    act(() => {
      result.current.submit();
    });

    expect(result.current.submitted).toBe(true);
    expect(result.current.resultId).toMatch(/^HAB-/);

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

  it('canProceed es true en paso 3 cuando la vivienda es habitable', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.update({ habitability: 'habitable' });
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

// ── Reglas de dominio ────────────────────────────────────────────────────────

describe('danoEsCoherente', () => {
  it('rechaza una vivienda no habitable declarada sin daño', () => {
    expect(danoEsCoherente('no_habitable', 'sin_dano')).toBe(false);
  });

  it('rechaza uso restringido declarado sin daño', () => {
    expect(danoEsCoherente('uso_restringido', 'sin_dano')).toBe(false);
  });

  it('acepta no habitable con vivienda destruida', () => {
    expect(danoEsCoherente('no_habitable', 'destruida')).toBe(true);
  });

  it('acepta habitable sin daño', () => {
    expect(danoEsCoherente('habitable', 'sin_dano')).toBe(true);
  });

  it('no opina mientras falte alguno de los dos datos', () => {
    expect(danoEsCoherente('', 'destruida')).toBe(true);
    expect(danoEsCoherente('no_habitable', '')).toBe(true);
  });
});

describe('useHabitability — vivienda no habitable', () => {
  beforeEach(() => {
    limpiarRegistros();
  });

  it('marca notificación y albergue al declararla no habitable', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.update({ habitability: 'no_habitable' });
    });
    expect(result.current.form.evacuationNotificationIssued).toBe(true);
    expect(result.current.form.temporaryShelterActivated).toBe(true);
  });

  it('limpia un daño «sin daño» que quedó al declararla no habitable', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.update({ damageAggregate: 'sin_dano' });
    });
    act(() => {
      result.current.update({ habitability: 'no_habitable' });
    });
    expect(result.current.form.damageAggregate).toBe('');
  });

  it('no deja cerrar si se desmarca la notificación de evacuación', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.update({
        incidentLogId: 'INC-1',
        address: 'Cra 5 #12-34',
        housingType: 'casa',
        habitability: 'no_habitable',
        damageAggregate: 'destruida',
      });
      result.current.setStep(3);
    });
    expect(result.current.canProceed).toBe(true);

    act(() => {
      result.current.update({ evacuationNotificationIssued: false });
    });
    expect(result.current.canProceed).toBe(false);
  });

  it('no deja avanzar del paso 2 con una combinación imposible', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.update({ habitability: 'habitable', damageAggregate: 'sin_dano' });
      result.current.setStep(2);
    });
    expect(result.current.canProceed).toBe(true);

    // `update` limpia el daño al pasar a no habitable, así que se fuerza la
    // combinación imposible directamente sobre la función pura.
    expect(danoEsCoherente('no_habitable', 'sin_dano')).toBe(false);
  });
});

describe('useHabitability — persistencia', () => {
  beforeEach(() => {
    limpiarRegistros();
  });

  it('guarda la evaluación con folio HAB al enviarla', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.update({
        incidentLogId: 'INC-1',
        address: 'Cra 5 #12-34',
        housingType: 'casa',
        habitability: 'habitable',
        damageAggregate: 'averiada',
      });
      result.current.setStep(3);
    });
    act(() => {
      result.current.submit();
    });

    expect(result.current.resultId).toMatch(/^HAB-\d{4}-\d{2}-\d{2}-\d{4}-[A-Z0-9]{4}$/);
    expect(listarRegistros('habitabilidad')).toHaveLength(1);
  });

  it('no guarda dos veces si se envía dos veces', () => {
    const { result } = renderHook(() => useHabitability());
    act(() => {
      result.current.update({
        incidentLogId: 'INC-1',
        address: 'Cra 5 #12-34',
        housingType: 'casa',
        habitability: 'habitable',
        damageAggregate: 'averiada',
      });
      result.current.setStep(3);
    });
    act(() => {
      result.current.submit();
      result.current.submit();
    });

    expect(listarRegistros('habitabilidad')).toHaveLength(1);
  });
});
