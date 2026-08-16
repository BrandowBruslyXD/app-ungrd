import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithI18n } from '@/test/render';
import type { DesgloseConfianza, ResumenSector } from '@/lib/sectorial';
import type { Sector } from '@/types/sectorial';
import ConfianzaPorSector from './ConfianzaPorSector';
import { porcentajesEnteros } from './porcentajes';

/*
 * La pregunta de esta gráfica es «¿puedo enviarle esto a un ministerio?». Lo que
 * se prueba, entonces, es que las proporciones cierran en 100 y que el sector
 * que va casi todo sin verificar queda señalado: si eso se rompiera, alguien
 * aprobaría un envío mirando una barra que parece completa.
 */

function crearResumen(sector: Sector, confianza: DesgloseConfianza): ResumenSector {
  const total = confianza.Autorreportado + confianza.Censado + confianza.Verificado;
  return {
    sector,
    totalDanos: total,
    totalMunicipios: 0,
    costoEstimado: 0,
    personasAfectadas: 0,
    confianza,
  };
}

/** Las filas de la tabla equivalente, sin el encabezado. */
function filasDeLaTabla(): { sector: string; celdas: string[] }[] {
  const tabla = screen.getByRole('table');
  return within(tabla)
    .getAllByRole('row')
    .slice(1)
    .map((fila) => ({
      sector: within(fila).getByRole('rowheader').textContent ?? '',
      celdas: within(fila)
        .getAllByRole('cell')
        .map((celda) => celda.textContent ?? ''),
    }));
}

/** La última celda de la fila: la que dice si el sector hay que revisarlo. */
function ultima(celdas: string[] | undefined): string | undefined {
  return celdas === undefined ? undefined : celdas[celdas.length - 1];
}

describe('porcentajesEnteros', () => {
  it('reparte cien puntos exactos aunque el reparto no sea redondo', () => {
    expect(porcentajesEnteros([1, 1, 1], 3).reduce((a, b) => a + b, 0)).toBe(100);
    expect(porcentajesEnteros([1, 2, 4], 7).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('nunca le da porcentaje a un nivel que no tiene ni un daño', () => {
    expect(porcentajesEnteros([0, 1, 2], 3)).toEqual([0, 33, 67]);
  });

  it('sin daños no inventa proporciones', () => {
    expect(porcentajesEnteros([0, 0, 0], 0)).toEqual([0, 0, 0]);
  });
});

describe('ConfianzaPorSector — cuánto está verificado', () => {
  it('las tres proporciones de cada sector suman cien', () => {
    renderWithI18n(
      <ConfianzaPorSector
        resumenes={[
          crearResumen('Vivienda', { Verificado: 1, Censado: 1, Autorreportado: 1 }),
          crearResumen('Salud', { Verificado: 8, Censado: 1, Autorreportado: 1 }),
          crearResumen('Transporte', { Verificado: 0, Censado: 1, Autorreportado: 2 }),
        ]}
      />,
    );

    for (const { celdas } of filasDeLaTabla()) {
      const proporciones = celdas.slice(0, 3).map((celda) => Number.parseInt(celda, 10));
      expect(proporciones.reduce((a, b) => a + b, 0)).toBe(100);
    }
  });

  it('señala el sector donde lo verificado no llega a la mitad y explica por qué', () => {
    renderWithI18n(
      <ConfianzaPorSector
        resumenes={[
          crearResumen('Vivienda', { Verificado: 1, Censado: 1, Autorreportado: 8 }),
          crearResumen('Salud', { Verificado: 8, Censado: 1, Autorreportado: 1 }),
        ]}
      />,
    );

    const filas = filasDeLaTabla();
    const vivienda = filas.find(({ sector }) => sector === 'Vivienda');
    const salud = filas.find(({ sector }) => sector === 'Salud');

    expect(ultima(vivienda?.celdas)).toBe('Menos de la mitad verificado');
    expect(ultima(salud?.celdas)).toBe('Al menos la mitad verificado');
    expect(screen.getByText(/menos de la mitad de sus daños verificados/i)).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName(
      '2 sectores con daños. En 1 lo verificado no llega a la mitad: Vivienda.',
    );
  });

  it('no molesta cuando todos los sectores pasan la mitad verificada', () => {
    renderWithI18n(
      <ConfianzaPorSector
        resumenes={[
          crearResumen('Vivienda', { Verificado: 6, Censado: 2, Autorreportado: 2 }),
          crearResumen('Salud', { Verificado: 5, Censado: 5, Autorreportado: 0 }),
        ]}
      />,
    );

    expect(screen.queryByText(/menos de la mitad de sus daños verificados/i)).toBeNull();
    expect(screen.getByRole('img')).toHaveAccessibleName(
      '2 sectores con daños. En todos, lo verificado llega al menos a la mitad.',
    );
  });

  it('deja fuera los sectores sin daños: una barra al cien por ciento de nada no dice nada', () => {
    renderWithI18n(
      <ConfianzaPorSector
        resumenes={[
          crearResumen('Vivienda', { Verificado: 4, Censado: 3, Autorreportado: 3 }),
          crearResumen('Cultura', { Verificado: 0, Censado: 0, Autorreportado: 0 }),
        ]}
      />,
    );

    expect(filasDeLaTabla().map(({ sector }) => sector)).toEqual(['Vivienda']);
  });

  it('sin ningún daño clasificado lo dice con palabras en vez de dibujar una barra vacía', () => {
    renderWithI18n(
      <ConfianzaPorSector
        resumenes={[crearResumen('Cultura', { Verificado: 0, Censado: 0, Autorreportado: 0 })]}
      />,
    );

    expect(screen.queryByRole('img')).toBeNull();
    expect(
      screen.getByText('Todavía no hay daños clasificados en ningún sector.'),
    ).toBeInTheDocument();
  });
});
