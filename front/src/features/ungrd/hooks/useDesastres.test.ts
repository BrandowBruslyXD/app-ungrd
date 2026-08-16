import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { danosDelEvento, mockEventos } from '@/mocks/mockSectorial';
import type { EstadoEvento, Evento } from '@/types/sectorial';
import { ordenarDesastres, useDesastres, type ResumenDesastre } from './useDesastres';

/*
 * Lo que se prueba aquí es el orden, que es la única decisión que toma la
 * lista. Si un desastre cerrado subiera a la primera fila, el funcionario
 * empezaría el día por el evento que ya nadie atiende; y si el orden fuera
 * cronológico, el que más informes tiene sin remitir quedaría enterrado.
 */

function evento(codigo: string, estado: EstadoEvento, fechaEvento: string): Evento {
  return {
    id: codigo,
    codigo,
    nombre: `Evento ${codigo}`,
    tipoEvento: 'inundacion',
    declaratoria: 'Desastre',
    nivelDeclaratoria: 'Departamental',
    fechaEvento,
    departamentos: ['Córdoba'],
    estado,
    personasAfectadas: 100,
  };
}

function fila(
  codigo: string,
  estado: EstadoEvento,
  informesPendientes: number,
  fechaEvento = '2026-08-01T00:00:00Z',
): ResumenDesastre {
  return {
    evento: evento(codigo, estado, fechaEvento),
    municipiosAfectados: 10,
    municipiosConInformacion: 4,
    totalDanos: 20,
    informesPendientes,
    informesConDanos: 13,
    puedeRemitir: true,
  };
}

describe('ordenarDesastres', () => {
  it('baja los cerrados al final aunque tengan más informes sin enviar', () => {
    const orden = ordenarDesastres([
      fila('CERRADO', 'Cerrado', 13),
      fila('ACTIVO', 'Activo', 1),
    ]);

    expect(orden.map(({ evento: e }) => e.codigo)).toEqual(['ACTIVO', 'CERRADO']);
  });

  it('entre los que siguen abiertos, primero el que más informes tiene por enviar', () => {
    const orden = ordenarDesastres([
      fila('POCOS', 'Activo', 2),
      fila('MUCHOS', 'Activo', 9),
      fila('MEDIO', 'Activo', 5),
    ]);

    expect(orden.map(({ evento: e }) => e.codigo)).toEqual(['MUCHOS', 'MEDIO', 'POCOS']);
  });

  it('a igual pendiente, primero el desastre más reciente', () => {
    const orden = ordenarDesastres([
      fila('VIEJO', 'Activo', 3, '2026-01-04T00:00:00Z'),
      fila('NUEVO', 'Activo', 3, '2026-08-12T00:00:00Z'),
    ]);

    expect(orden.map(({ evento: e }) => e.codigo)).toEqual(['NUEVO', 'VIEJO']);
  });
});

describe('useDesastres', () => {
  it('trae todos los desastres sembrados y encabeza con el que más falta por remitir', () => {
    const { result } = renderHook(() => useDesastres());

    expect(result.current.desastres).toHaveLength(mockEventos.length);

    const pendientes = result.current.desastres.map((desastre) => desastre.informesPendientes);
    expect([...pendientes].sort((a, b) => b - a)).toEqual(pendientes);
  });

  /*
   * Ninguna cifra de la lista está escrita: si alguien sembrara un total, la
   * lista podría decir «60 daños» de un evento que tiene 13, y nadie lo notaría
   * hasta abrirlo.
   */
  it('cuenta los daños de cada desastre en vez de leer un total sembrado', () => {
    const { result } = renderHook(() => useDesastres());

    for (const { evento: e, totalDanos } of result.current.desastres) {
      expect(totalDanos).toBe(danosDelEvento(e.id).length);
    }
  });

  it('resume en una línea los que siguen abiertos y lo que falta por enviar en ellos', () => {
    const { result } = renderHook(() => useDesastres());

    const abiertos = result.current.desastres.filter(({ evento: e }) => e.estado !== 'Cerrado');
    const suma = abiertos.reduce((total, abierto) => total + abierto.informesPendientes, 0);

    expect(result.current.eventosEnCurso).toBe(abiertos.length);
    expect(result.current.informesPendientes).toBe(suma);
  });
});
