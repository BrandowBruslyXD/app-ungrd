import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithI18n } from '@/test/render';
import type { DanoSectorizado } from '@/types/sectorial';
import EntradaDeDatos from './EntradaDeDatos';
import { entradaSeca, serieDiaria } from './serieEntrada';

/*
 * La pregunta es «¿sigue entrando información?», y la respuesta útil es la
 * incómoda: que hace días no entra nada mientras hay municipios callados. Eso es
 * lo que se prueba —que el apunte aparece cuando toca y calla cuando no—, más
 * que la forma de la línea.
 */

const DECLARATORIA = '2026-08-12T15:00:00Z';

/** Reloj fijo: sin él la serie mediría hasta el día en que corran las pruebas. */
const AHORA = Date.parse('2026-08-20T15:00:00Z');

function crearDano(id: string, registradoEn: string): DanoSectorizado {
  return {
    id,
    eventoId: 'EVT-2026-08-15-003',
    sector: 'Salud',
    origen: 'ReporteCiudadano',
    origenId: `RPT-${id}`,
    nivelConfianza: 'Autorreportado',
    municipio: 'Montería',
    departamento: 'Córdoba',
    descripcion: 'Puesto de salud inundado',
    cantidad: 1,
    unidad: 'sedes',
    clasificadoPor: 'Regla',
    registradoEn,
  };
}

/** Los daños de la demo: entran fuerte tres días y después nada. */
const DANOS_QUE_SE_SECAN: DanoSectorizado[] = [
  crearDano('1', '2026-08-13T14:00:00Z'),
  crearDano('2', '2026-08-14T14:00:00Z'),
  crearDano('3', '2026-08-14T18:00:00Z'),
  crearDano('4', '2026-08-16T14:00:00Z'),
];

describe('serieDiaria', () => {
  it('cuenta un punto por día desde la declaratoria, incluidos los días en blanco', () => {
    const serie = serieDiaria(DANOS_QUE_SE_SECAN, { desde: DECLARATORIA, ahora: AHORA });

    expect(serie.map((punto) => punto.dia)).toEqual([
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-15',
      '2026-08-16',
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
    ]);
    expect(serie.map((punto) => punto.total)).toEqual([0, 1, 2, 0, 1, 0, 0, 0, 0]);
  });

  it('llega hasta hoy y no hasta el último daño: es la única forma de ver que dejó de entrar', () => {
    const serie = serieDiaria(DANOS_QUE_SE_SECAN, { desde: DECLARATORIA, ahora: AHORA });

    expect(serie[serie.length - 1]).toEqual({ dia: '2026-08-20', total: 0 });
  });

  it('agrupa por el día colombiano, no por el del navegador', () => {
    // 03:00 UTC del 15 son las 22:00 del 14 en Colombia: cuenta como día 14.
    const serie = serieDiaria([crearDano('1', '2026-08-15T03:00:00Z')], {
      desde: '2026-08-14T12:00:00Z',
      ahora: Date.parse('2026-08-15T12:00:00Z'),
    });

    expect(serie).toEqual([
      { dia: '2026-08-14', total: 1 },
      { dia: '2026-08-15', total: 0 },
    ]);
  });

  it('sin declaratoria arranca en el primer daño que entró', () => {
    const serie = serieDiaria(DANOS_QUE_SE_SECAN, { ahora: Date.parse('2026-08-16T20:00:00Z') });

    expect(serie[0]).toEqual({ dia: '2026-08-13', total: 1 });
  });

  it('sin daños y sin declaratoria no hay nada que dibujar', () => {
    expect(serieDiaria([], { ahora: AHORA })).toEqual([]);
  });
});

describe('entradaSeca', () => {
  const serie = serieDiaria(DANOS_QUE_SE_SECAN, { desde: DECLARATORIA, ahora: AHORA });

  it('es cierta cuando los últimos tres días suman cero y quedan municipios en silencio', () => {
    expect(entradaSeca(serie, 13)).toBe(true);
  });

  it('calla si no queda ningún municipio en silencio: la emergencia se estabilizó', () => {
    expect(entradaSeca(serie, 0)).toBe(false);
  });

  it('calla mientras la información siga llegando', () => {
    const viva = serieDiaria([...DANOS_QUE_SE_SECAN, crearDano('5', '2026-08-20T13:00:00Z')], {
      desde: DECLARATORIA,
      ahora: AHORA,
    });

    expect(entradaSeca(viva, 13)).toBe(false);
  });
});

describe('EntradaDeDatos — si la información sigue entrando', () => {
  it('avisa que hay que llamar cuando la entrada se secó y hay municipios callados', () => {
    renderWithI18n(
      <EntradaDeDatos
        danos={DANOS_QUE_SE_SECAN}
        desde={DECLARATORIA}
        municipiosEnSilencio={13}
        ahora={AHORA}
      />,
    );

    expect(
      screen.getByText('Hace tres días que no entra nada, y hay municipios en silencio'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Quedan 13 municipios de los que no ha llegado un solo dato/),
    ).toBeInTheDocument();
  });

  it('no aparece el apunte mientras la información sigue entrando', () => {
    renderWithI18n(
      <EntradaDeDatos
        danos={[...DANOS_QUE_SE_SECAN, crearDano('5', '2026-08-20T13:00:00Z')]}
        desde={DECLARATORIA}
        municipiosEnSilencio={13}
        ahora={AHORA}
      />,
    );

    expect(screen.queryByText(/Hace tres días que no entra nada/)).toBeNull();
  });

  it('tampoco aparece si no hay un solo municipio en silencio', () => {
    renderWithI18n(
      <EntradaDeDatos
        danos={DANOS_QUE_SE_SECAN}
        desde={DECLARATORIA}
        municipiosEnSilencio={0}
        ahora={AHORA}
      />,
    );

    expect(screen.queryByText(/Hace tres días que no entra nada/)).toBeNull();
  });

  it('el rótulo accesible dice el máximo y lo que entró el último día', () => {
    renderWithI18n(
      <EntradaDeDatos
        danos={DANOS_QUE_SE_SECAN}
        desde={DECLARATORIA}
        municipiosEnSilencio={13}
        ahora={AHORA}
      />,
    );

    const rotulo = screen.getByRole('img').getAttribute('aria-label') ?? '';

    expect(rotulo).toContain('entraron 4 daños');
    expect(rotulo).toContain('El máximo fueron 2');
    expect(rotulo).toContain('el último día se registraron 0');
  });

  it('la tabla equivalente trae un renglón por día, también los que van en cero', () => {
    renderWithI18n(
      <EntradaDeDatos
        danos={DANOS_QUE_SE_SECAN}
        desde={DECLARATORIA}
        municipiosEnSilencio={13}
        ahora={AHORA}
      />,
    );

    const filas = within(screen.getByRole('table')).getAllByRole('row').slice(1);

    expect(filas).toHaveLength(9);
    expect(filas.map((fila) => within(fila).getByRole('cell').textContent)).toEqual([
      '0',
      '1',
      '2',
      '0',
      '1',
      '0',
      '0',
      '0',
      '0',
    ]);
  });

  it('sin daños todavía lo dice con palabras en vez de dibujar una línea plana', () => {
    renderWithI18n(<EntradaDeDatos danos={[]} municipiosEnSilencio={13} ahora={AHORA} />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(
      screen.getByText('Todavía no ha entrado ningún daño de este evento.'),
    ).toBeInTheDocument();
  });
});
