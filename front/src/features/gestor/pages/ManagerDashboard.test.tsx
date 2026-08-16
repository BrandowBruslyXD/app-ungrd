import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { renderWithI18n } from '@/test/render';
import ManagerDashboard from '@/features/gestor/pages/ManagerDashboard';

/*
 * Lo que se prueba aquí es la promesa del panel, no su maquetación: que las tres
 * fuentes aparezcan con su hora de observación, que una señal sin reportes cerca
 * se anuncie, que ninguna fuente caída deje un error o un hueco en pantalla, y
 * que el tablero de triage siga funcionando igual que antes de todo esto.
 *
 * Las teselas no se pueden comprobar sin navegador: jsdom no descarga imágenes.
 */

/** Vereda El Carmen, Mocoa: el primer reporte de la demostración. */
const CERCA_DE_MOCOA = { lat: 1.2, lon: -76.7 };

/** Bogotá: lejos de cualquier reporte de la demostración, y dentro de Colombia. */
const LEJOS_DE_TODO = { lat: 4.711, lon: -74.0721 };

function sismo(punto: { lat: number; lon: number }, id: string): unknown {
  return {
    type: 'Feature',
    id,
    properties: {
      mag: 4.8,
      place: 'Colombia',
      time: Date.now() - 2 * 3_600_000,
      url: `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`,
    },
    geometry: { type: 'Point', coordinates: [punto.lon, punto.lat, 15.2] },
  };
}

function alertaGdacs(): unknown {
  return {
    type: 'Feature',
    properties: {
      eventtype: 'FL',
      alertlevel: 'Orange',
      iso3: 'COL',
      country: 'Colombia',
      eventid: 1234,
      episodeid: 2,
      name: 'Inundación en Putumayo',
      fromdate: '2026-08-16T04:00:00',
      url: { report: 'https://www.gdacs.org/report.aspx?eventid=1234' },
      severitydata: { severitytext: 'Nivel del río en aumento' },
    },
    geometry: { type: 'Point', coordinates: [-76.65, 1.15] },
  };
}

function respuesta(cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Enruta cada llamada a su fuente. `null` significa que esa fuente está caída. */
function simularFuentes(opciones: { usgs: unknown | null; gdacs: unknown | null }): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: RequestInfo | URL) => {
      const url = String(entrada);
      const cuerpo = url.includes('earthquake.usgs.gov') ? opciones.usgs : opciones.gdacs;

      if (cuerpo === null) {
        throw new TypeError('Failed to fetch');
      }

      return respuesta(cuerpo);
    }),
  );
}

function montar() {
  return renderWithI18n(
    <MemoryRouter initialEntries={['/gestor']}>
      <ManagerDashboard />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ManagerDashboard — observación satelital', () => {
  it('ManagerDashboard_fuentesRespondiendo_muestraLasTresConSuHoraDeObservacion', async () => {
    simularFuentes({
      usgs: { features: [sismo(CERCA_DE_MOCOA, 'us-cerca')] },
      gdacs: { features: [alertaGdacs()] },
    });

    montar();

    expect(await screen.findByText('USGS')).toBeInTheDocument();
    expect(screen.getByText('GDACS')).toBeInTheDocument();
    expect(screen.getByText('NASA GIBS')).toBeInTheDocument();
    expect(screen.getByText('El más reciente, hace 2 horas')).toBeInTheDocument();
  });

  it('ManagerDashboard_enNingunTexto_apareceLaExpresionTiempoReal', async () => {
    simularFuentes({
      usgs: { features: [sismo(CERCA_DE_MOCOA, 'us-cerca')] },
      gdacs: { features: [alertaGdacs()] },
    });

    const { container } = montar();
    await screen.findByText('USGS');

    /*
     * Ninguna de las tres fuentes lo es y decirlo sería mentir a quien toma
     * decisiones. La única aparición admitida es la advertencia de que **no** lo
     * es, que la pantalla escribe al pie del mapa.
     */
    const apariciones = (container.textContent ?? '').match(/tiempo real/gi) ?? [];
    expect(apariciones).toHaveLength(1);
    expect(container.textContent).toContain('No es tiempo real');
  });

  it('ManagerDashboard_senalLejosDeTodoReporte_laAnunciaComoAlertaTemprana', async () => {
    simularFuentes({
      usgs: {
        features: [sismo(CERCA_DE_MOCOA, 'us-cerca'), sismo(LEJOS_DE_TODO, 'us-lejos')],
      },
      gdacs: null,
    });

    montar();

    // El de Mocoa cae junto a un reporte y lo corrobora; el de Bogotá no tiene
    // ninguno cerca, y eso significa que pasó algo donde nadie ha avisado.
    expect(
      await screen.findByText(/1 señal sin ningún reporte ciudadano cerca/),
    ).toBeInTheDocument();
  });

  it('ManagerDashboard_senalJuntoAUnReporte_noSeAnunciaComoSinReporte', async () => {
    simularFuentes({ usgs: { features: [sismo(CERCA_DE_MOCOA, 'us-cerca')] }, gdacs: null });

    montar();
    await screen.findByText('USGS');

    expect(screen.queryByText(/sin ningún reporte ciudadano cerca/)).not.toBeInTheDocument();
  });

  it('ManagerDashboard_todasLasFuentesCaidas_noDejaErrorNiHuecoEnPantalla', async () => {
    simularFuentes({ usgs: null, gdacs: null });

    const { container } = montar();

    await waitFor(() => {
      expect(screen.queryByText('USGS')).not.toBeInTheDocument();
    });

    // La ficha desaparece, pero ni una palabra de que algo falló.
    expect(screen.queryByText('GDACS')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/error|fall(ó|o)|no dispon/i);
  });

  it('ManagerDashboard_fuentesCaidas_elTableroDeTriageSigueIntacto', async () => {
    simularFuentes({ usgs: null, gdacs: null });

    montar();

    await waitFor(() => {
      expect(screen.queryByText('USGS')).not.toBeInTheDocument();
    });

    const tablero = screen.getByRole('heading', { level: 2, name: 'Tablero de triage' });
    expect(tablero).toBeInTheDocument();

    for (const columna of ['Reportados', 'Verificados', 'Asignados', 'En atención']) {
      expect(screen.getByRole('button', { name: new RegExp(columna) })).toBeInTheDocument();
    }
  });

  it('ManagerDashboard_mapa_arrancaEnSateliteYOfreceLasTresCapas', async () => {
    simularFuentes({ usgs: null, gdacs: null });

    montar();

    const grupo = await screen.findByRole('group', { name: 'Capa del mapa' });
    const botones = within(grupo).getAllByRole('button');

    expect(botones.map((boton) => boton.textContent)).toEqual([
      'Satélite',
      'Relieve',
      'Calles',
    ]);
    expect(screen.getByRole('button', { name: 'Satélite' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('ManagerDashboard_leyenda_explicaLasTresFormasQueSePintanEnElMapa', async () => {
    simularFuentes({ usgs: null, gdacs: null });

    montar();

    expect(await screen.findByText('Reportes ciudadanos')).toBeInTheDocument();
    expect(screen.getByText('Señales externas')).toBeInTheDocument();
    expect(screen.getByText('Sismo, según su magnitud')).toBeInTheDocument();
    expect(screen.getByText('Alerta multiamenaza')).toBeInTheDocument();
    expect(screen.getByText('Corroborado por una fuente externa')).toBeInTheDocument();
  });

  it('ManagerDashboard_notaDeAusencia_aclaraQueSinSenalNoEsSospecha', async () => {
    simularFuentes({ usgs: { features: [sismo(CERCA_DE_MOCOA, 'us-cerca')] }, gdacs: null });

    montar();

    // El error grave que esta pantalla no puede cometer: dar por dudoso un
    // reporte porque ningún satélite lo vio.
    expect(await screen.findByText(/no lo pone en duda/)).toBeInTheDocument();
  });
});
