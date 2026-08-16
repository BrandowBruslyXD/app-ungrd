import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithI18n } from '@/test/render';
import { agruparPorSector } from '@/lib/sectorial';
import type { ResumenSector } from '@/lib/sectorial';
import { mockDanos } from '@/mocks/mockSectorial';
import { SECTORES, type Sector } from '@/types/sectorial';
import DanoPorSector from './DanoPorSector';

/*
 * Lo que se prueba es lo que el funcionario entiende al mirar la gráfica —quién
 * concentra el daño y quién no tiene nada—, no cuántos `rect` hay dentro del
 * SVG. Si mañana la barra se dibuja de otra forma, estas pruebas deben seguir
 * pasando; si el sector más caro deja de ir primero, deben caer.
 */

function crearResumen(sector: Sector, costo: number, danos = 0): ResumenSector {
  return {
    sector,
    totalDanos: danos,
    totalMunicipios: 0,
    costoEstimado: costo,
    personasAfectadas: 0,
    confianza: { Autorreportado: danos, Censado: 0, Verificado: 0 },
  };
}

/** Las filas de la tabla equivalente, sin el encabezado: [sector, costo, daños]. */
function filasDeLaTabla(): string[][] {
  const tabla = screen.getByRole('table');
  return within(tabla)
    .getAllByRole('row')
    .slice(1)
    .map((fila) => [
      within(fila).getByRole('rowheader').textContent ?? '',
      ...within(fila)
        .getAllByRole('cell')
        .map((celda) => celda.textContent ?? ''),
    ]);
}

describe('DanoPorSector — dónde se concentra el daño', () => {
  it('pone primero al sector con más costo aunque lleguen en cualquier orden', () => {
    renderWithI18n(
      <DanoPorSector
        resumenes={[
          crearResumen('Salud', 1_000_000_000, 4),
          crearResumen('Vivienda', 6_000_000_000, 20),
          crearResumen('Transporte', 3_000_000_000, 9),
        ]}
      />,
    );

    expect(filasDeLaTabla().map(([sector]) => sector)).toEqual([
      'Vivienda',
      'Transporte',
      'Salud',
    ]);
  });

  it('deja el sector en cero en la lista, con su valor 0', () => {
    renderWithI18n(
      <DanoPorSector
        resumenes={[crearResumen('Vivienda', 6_000_000_000, 20), crearResumen('Cultura', 0)]}
      />,
    );

    const cultura = filasDeLaTabla().find(([sector]) => sector === 'Cultura');

    expect(cultura).toBeDefined();
    expect(cultura?.[1]).toBe('0');
  });

  it('el rótulo accesible dice qué sector concentra el gasto y cuánto, no la forma', () => {
    renderWithI18n(
      <DanoPorSector
        resumenes={[
          crearResumen('Vivienda', 6_000_000_000, 20),
          crearResumen('Transporte', 3_000_000_000, 9),
          crearResumen('Salud', 1_000_000_000, 4),
          crearResumen('Cultura', 0),
        ]}
      />,
    );

    const grafica = screen.getByRole('img');

    expect(grafica).toHaveAccessibleName(
      'Vivienda concentra el 60 % del costo estimado del evento. 1 de 4 sectores no tienen ningún daño reportado.',
    );
  });

  it('avisa cuando todavía no hay costo estimado en ningún sector', () => {
    renderWithI18n(
      <DanoPorSector resumenes={[crearResumen('Vivienda', 0), crearResumen('Salud', 0)]} />,
    );

    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Ningún sector tiene costo estimado todavía: los trece van en cero.',
    );
  });

  it('con el consolidado sembrado dibuja los trece sectores del formato oficial', () => {
    renderWithI18n(<DanoPorSector resumenes={agruparPorSector(mockDanos)} />);

    expect(filasDeLaTabla()).toHaveLength(SECTORES.length);
  });
});
