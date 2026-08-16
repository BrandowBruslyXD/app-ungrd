import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@/test/render';
import { resumenCobertura } from '@/lib/sectorial';
import type { ResumenCobertura } from '@/lib/sectorial';
import { mockCobertura } from '@/mocks/mockSectorial';
import BarraCobertura from './BarraCobertura';

/*
 * Esta gráfica existe para decir de dónde **no** llega información. Lo que se
 * prueba es que esa cifra se lee sin ver un solo color y que el rótulo hablado
 * la dice primero.
 */

function crearResumen(
  conEdan: number,
  soloAutorreportes: number,
  enSilencio: number,
): ResumenCobertura {
  return {
    totalMunicipios: conEdan + soloAutorreportes + enSilencio,
    conEdan,
    soloAutorreportes,
    enSilencio,
    conInformacion: conEdan + soloAutorreportes,
  };
}

describe('BarraCobertura — de dónde no llega información', () => {
  it('escribe las tres cifras con su palabra, sin depender del color', () => {
    renderWithI18n(<BarraCobertura resumen={crearResumen(4, 7, 13)} />);

    expect(screen.getByText('13 municipios')).toBeInTheDocument();
    expect(screen.getByText('En silencio')).toBeInTheDocument();
    expect(screen.getByText('7 municipios')).toBeInTheDocument();
    expect(screen.getByText('Solo autorreportes')).toBeInTheDocument();
    expect(screen.getByText('4 municipios')).toBeInTheDocument();
    expect(screen.getByText('Con EDAN')).toBeInTheDocument();
  });

  it('el rótulo accesible arranca por los municipios en silencio y su peso en el territorio', () => {
    renderWithI18n(<BarraCobertura resumen={crearResumen(4, 8, 12)} />);

    expect(screen.getByRole('img')).toHaveAccessibleName(
      'De 24 municipios afectados, 12 están en silencio, que es el 50 % del territorio; 8 solo tienen autorreportes y 4 mandaron su EDAN.',
    );
  });

  it('un estado en cero sigue en la leyenda: que nadie esté en silencio también es información', () => {
    renderWithI18n(<BarraCobertura resumen={crearResumen(5, 3, 0)} />);

    expect(screen.getByText('0 municipios')).toBeInTheDocument();
    expect(screen.getByText('En silencio')).toBeInTheDocument();
  });

  it('usa el singular cuando solo hay un municipio en ese estado', () => {
    renderWithI18n(<BarraCobertura resumen={crearResumen(1, 2, 3)} />);

    expect(screen.getByText('1 municipio')).toBeInTheDocument();
  });

  it('sin municipios afectados no dibuja una barra vacía: lo dice con palabras', () => {
    renderWithI18n(<BarraCobertura resumen={crearResumen(0, 0, 0)} />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(
      screen.getByText('Todavía no hay municipios afectados registrados en este evento.'),
    ).toBeInTheDocument();
  });

  it('con la cobertura sembrada cuadra con lo que cuenta el resumen del evento', () => {
    const resumen = resumenCobertura(mockCobertura);
    renderWithI18n(<BarraCobertura resumen={resumen} />);

    expect(screen.getByRole('img').getAttribute('aria-label')).toContain(
      `De ${resumen.totalMunicipios} municipios afectados, ${resumen.enSilencio} están en silencio`,
    );
  });
});
