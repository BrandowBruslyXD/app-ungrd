import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { INCIDENT_STEP_COUNT, puedeAvanzar, useIncidentLog } from './useIncidentLog';
import type { IncidentForm } from './useIncidentLog';
import { limpiarRegistros, listarRegistros } from '@/lib/almacenamiento';

function formularioCon(parcial: Partial<IncidentForm>): IncidentForm {
  return {
    eventType: 'inundacion',
    eventDate: '2026-08-16',
    departamento: 'Antioquia',
    municipio: 'Medellín',
    location: 'Barrio Manrique',
    coordinates: null,
    description: 'Se desbordó la quebrada y entró agua a cinco casas.',
    personsInjured: 0,
    personsDead: 0,
    personsMissing: 0,
    personsEvacuated: 0,
    familiesAffected: 0,
    linkedReportId: '',
    status: 'en_atencion',
    ...parcial,
  };
}

describe('puedeAvanzar — reglas por paso', () => {
  it('exige tipo de evento y fecha en el paso 1', () => {
    expect(puedeAvanzar(1, formularioCon({ eventType: '' }))).toBe(false);
    expect(puedeAvanzar(1, formularioCon({}))).toBe(true);
  });

  it('acepta un punto en el mapa cuando no hay dirección escrita', () => {
    expect(puedeAvanzar(2, formularioCon({ location: '', coordinates: null }))).toBe(false);
    expect(
      puedeAvanzar(2, formularioCon({ location: '', coordinates: { lat: 6.25, lng: -75.56 } })),
    ).toBe(true);
  });

  it('no acepta una dirección que son solo espacios', () => {
    expect(puedeAvanzar(2, formularioCon({ location: '   ', coordinates: null }))).toBe(false);
  });

  it('exige una descripción de al menos diez caracteres en el paso 3', () => {
    expect(puedeAvanzar(3, formularioCon({ description: 'corto' }))).toBe(false);
    expect(puedeAvanzar(3, formularioCon({}))).toBe(true);
  });

  /*
   * La regla que más importa de este flujo: un incidente con fallecidos o
   * desaparecidos no se puede marcar como cerrado. Ese dato sube al consolidado
   * municipal, y cerrarlo sin atención deja el caso sin trazabilidad.
   */
  it('no deja cerrar un incidente con personas fallecidas', () => {
    expect(puedeAvanzar(4, formularioCon({ personsDead: 1, status: 'cerrado' }))).toBe(false);
  });

  it('no deja cerrar un incidente con personas desaparecidas', () => {
    expect(puedeAvanzar(4, formularioCon({ personsMissing: 2, status: 'cerrado' }))).toBe(false);
  });

  it('sí deja dejarlo en atención aunque haya fallecidos', () => {
    expect(puedeAvanzar(4, formularioCon({ personsDead: 1, status: 'en_atencion' }))).toBe(true);
  });

  it('deja cerrar un incidente sin víctimas', () => {
    expect(puedeAvanzar(4, formularioCon({ status: 'cerrado' }))).toBe(true);
  });
});

describe('useIncidentLog — municipio y departamento', () => {
  it('borra el municipio al cambiar de departamento', () => {
    const { result } = renderHook(() => useIncidentLog());
    act(() => {
      result.current.update({ departamento: 'Antioquia', municipio: 'Medellín' });
    });
    expect(result.current.form.municipio).toBe('Medellín');

    act(() => {
      result.current.update({ departamento: 'Chocó' });
    });
    // Sin esto quedaba «Medellín» pegado a Chocó, un dato imposible que nadie
    // detecta hasta que alguien intenta ubicarlo en el mapa.
    expect(result.current.form.municipio).toBe('');
  });
});

describe('useIncidentLog — conteos', () => {
  it('nunca baja de cero', () => {
    const { result } = renderHook(() => useIncidentLog());
    act(() => {
      result.current.adjustCount('personsInjured', -3);
    });
    expect(result.current.form.personsInjured).toBe(0);
  });

  it('suma correctamente', () => {
    const { result } = renderHook(() => useIncidentLog());
    act(() => {
      result.current.adjustCount('familiesAffected', 4);
    });
    expect(result.current.form.familiesAffected).toBe(4);
  });
});

describe('useIncidentLog — navegación y envío', () => {
  beforeEach(() => {
    limpiarRegistros();
  });

  function llenarTodo(result: { current: ReturnType<typeof useIncidentLog> }) {
    act(() => {
      result.current.update({
        eventType: 'inundacion',
        departamento: 'Antioquia',
        municipio: 'Medellín',
        location: 'Barrio Manrique',
        description: 'Se desbordó la quebrada y entró agua a cinco casas.',
      });
      result.current.setStep(INCIDENT_STEP_COUNT);
    });
  }

  it('no avanza si el paso actual está incompleto', () => {
    const { result } = renderHook(() => useIncidentLog());
    act(() => {
      result.current.goNext();
    });
    expect(result.current.step).toBe(1);
  });

  it('guarda el incidente con folio INC al enviarlo', () => {
    const { result } = renderHook(() => useIncidentLog());
    llenarTodo(result);
    act(() => {
      result.current.submit();
    });

    expect(result.current.submitted).toBe(true);
    expect(result.current.resultId).toMatch(/^INC-\d{4}-\d{2}-\d{2}-\d{4}-[A-Z0-9]{4}$/);
    expect(listarRegistros('incidente')).toHaveLength(1);
  });

  it('no genera dos folios si se toca enviar dos veces seguidas', () => {
    const { result } = renderHook(() => useIncidentLog());
    llenarTodo(result);
    act(() => {
      result.current.submit();
      result.current.submit();
    });

    expect(listarRegistros('incidente')).toHaveLength(1);
  });

  it('no envía un incidente con fallecidos marcado como cerrado', () => {
    const { result } = renderHook(() => useIncidentLog());
    llenarTodo(result);
    act(() => {
      result.current.update({ personsDead: 2, status: 'cerrado' });
    });
    act(() => {
      result.current.submit();
    });

    expect(result.current.submitted).toBe(false);
    expect(listarRegistros('incidente')).toHaveLength(0);
  });
});
