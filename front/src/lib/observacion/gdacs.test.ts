import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  RUTA_ALERTAS_GDACS,
  obtenerAlertasColombia,
  type AlertaMultiamenaza,
} from '@/lib/observacion/gdacs';
import { TIEMPO_LIMITE_MS } from '@/lib/observacion/red';

/*
 * Los mismos cuatro caminos que en USGS —correcto, caído, lento y respuesta que
 * no es JSON— más los dos que son propios de GDACS: la fecha llega sin zona
 * horaria y el listado es mundial, así que hay que quedarse solo con Colombia.
 */

/** Un rasgo del GeoJSON de GDACS, con los campos que importan. */
function rasgo(
  parcial: {
    eventtype?: string;
    eventid?: number;
    alertlevel?: string;
    country?: string;
    iso3?: string;
    afectados?: string[];
    fromdate?: string;
    lon?: number;
    lat?: number;
    /** Evento que GDACS todavía no ha atribuido a ningún país. */
    sinPais?: boolean;
  } = {}
): unknown {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [parcial.lon ?? -76.24, parcial.lat ?? 4.84] },
    properties: {
      eventtype: parcial.eventtype ?? 'EQ',
      eventid: parcial.eventid ?? 1558059,
      episodeid: 1725109,
      name: 'Earthquake in Colombia',
      description: 'Earthquake in Colombia',
      alertlevel: parcial.alertlevel ?? 'Red',
      country: parcial.sinPais === true ? '' : (parcial.country ?? 'Colombia'),
      iso3: parcial.sinPais === true ? '' : (parcial.iso3 ?? 'COL'),
      affectedcountries:
        parcial.sinPais === true
          ? []
          : (parcial.afectados ?? ['COL']).map((iso3) => ({ iso3, countryname: '' })),
      fromdate: parcial.fromdate ?? '2026-08-10T12:34:28',
      url: { report: 'https://www.gdacs.org/report.aspx?eventid=1558059' },
      severitydata: { severitytext: 'Magnitude 7.4M, Depth:110.285km' },
    },
  };
}

function respuestaJson(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  });
}

function simularFetch(implementacion: typeof fetch): void {
  vi.stubGlobal('fetch', vi.fn(implementacion));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('obtenerAlertasColombia', () => {
  it('obtenerAlertasColombia_RespuestaCorrecta_DevuelveTipoNivelPaisYHoraEnUtc', async () => {
    simularFetch(async () =>
      respuestaJson({ type: 'FeatureCollection', features: [rasgo()] })
    );

    const alertas: AlertaMultiamenaza[] = await obtenerAlertasColombia();

    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatchObject({
      id: 'EQ-1558059-1725109',
      tipo: 'sismo',
      nivel: 'rojo',
      pais: 'Colombia',
      titulo: 'Earthquake in Colombia',
      severidad: 'Magnitude 7.4M, Depth:110.285km',
      latitud: 4.84,
      longitud: -76.24,
      // GDACS publica la fecha sin zona; es UTC y así tiene que quedar.
      observadoEn: '2026-08-10T12:34:28.000Z',
      fuente: 'GDACS',
    });
  });

  it('obtenerAlertasColombia_Consulta_UsaLaRutaRelativaDelProxy', async () => {
    const espia = vi.fn<typeof fetch>(async () =>
      respuestaJson({ type: 'FeatureCollection', features: [] })
    );
    vi.stubGlobal('fetch', espia);

    await obtenerAlertasColombia();

    expect(espia).toHaveBeenCalledWith(RUTA_ALERTAS_GDACS, expect.anything());
  });

  it('obtenerAlertasColombia_ListadoMundial_SoloDejaLoQueTocaAColombia', async () => {
    simularFetch(async () =>
      respuestaJson({
        type: 'FeatureCollection',
        features: [
          rasgo({ eventid: 1, iso3: 'IDN', country: 'Indonesia', afectados: ['IDN'], lon: 121.35, lat: -8.31 }),
          // Ciclón atribuido a Panamá, pero Colombia está entre los afectados.
          rasgo({
            eventid: 2,
            eventtype: 'TC',
            iso3: 'PAN',
            country: 'Panama',
            afectados: ['PAN', 'COL'],
            lon: -79.5,
            lat: 9.1,
          }),
          rasgo({ eventid: 3 }),
        ],
      })
    );

    const alertas = await obtenerAlertasColombia();

    expect(alertas.map((alerta) => alerta.id)).toEqual(['TC-2-1725109', 'EQ-3-1725109']);
  });

  it('obtenerAlertasColombia_EventoDeVenezuelaDentroDelRecuadro_NoLoDaPorColombiano', async () => {
    /*
     * Caso real del listado de hoy: cuatro sismos que GDACS atribuye solo a
     * Venezuela caen dentro del rectángulo que envuelve a Colombia. Si se
     * cuelan, el panel anuncia una alerta roja en Colombia que no existe.
     */
    simularFetch(async () =>
      respuestaJson({
        type: 'FeatureCollection',
        features: [
          rasgo({
            eventid: 1548377,
            country: 'Venezuela',
            iso3: 'VEN',
            afectados: ['VEN'],
            lon: -68.5139,
            lat: 10.453,
          }),
        ],
      })
    );

    await expect(obtenerAlertasColombia()).resolves.toEqual([]);
  });

  it('obtenerAlertasColombia_EventoSinPaisAtribuidoConEpicentroEnColombia_LoIncluye', async () => {
    simularFetch(async () =>
      respuestaJson({
        type: 'FeatureCollection',
        features: [rasgo({ eventid: 77, sinPais: true, lon: -74.1, lat: 4.6 })],
      })
    );

    const alertas = await obtenerAlertasColombia();

    expect(alertas.map((alerta) => alerta.id)).toEqual(['EQ-77-1725109']);
  });

  it('obtenerAlertasColombia_TipoONivelDesconocido_DescartaEsaAlerta', async () => {
    simularFetch(async () =>
      respuestaJson({
        type: 'FeatureCollection',
        features: [
          rasgo({ eventid: 10, eventtype: 'XX' }),
          rasgo({ eventid: 11, alertlevel: 'Purple' }),
          rasgo({ eventid: 12, eventtype: 'FL', alertlevel: 'Orange' }),
        ],
      })
    );

    const alertas = await obtenerAlertasColombia();

    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatchObject({ id: 'FL-12-1725109', tipo: 'inundacion', nivel: 'naranja' });
  });

  it('obtenerAlertasColombia_FechaIlegible_DescartaEsaAlerta', async () => {
    simularFetch(async () =>
      respuestaJson({
        type: 'FeatureCollection',
        features: [rasgo({ fromdate: 'ayer por la tarde' })],
      })
    );

    await expect(obtenerAlertasColombia()).resolves.toEqual([]);
  });

  it('obtenerAlertasColombia_ServicioCaido_DevuelveVacio', async () => {
    simularFetch(async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(obtenerAlertasColombia()).resolves.toEqual([]);
  });

  it('obtenerAlertasColombia_ProxyResponde502_DevuelveVacio', async () => {
    simularFetch(async () =>
      respuestaJson({ type: 'FeatureCollection', features: [] }, 502)
    );

    await expect(obtenerAlertasColombia()).resolves.toEqual([]);
  });

  it('obtenerAlertasColombia_TiempoAgotado_DevuelveVacioYCortaLaPeticion', async () => {
    vi.useFakeTimers();
    simularFetch(
      (_entrada, opciones) =>
        new Promise<Response>((_resolver, rechazar) => {
          opciones?.signal?.addEventListener('abort', () =>
            rechazar(new DOMException('Abortado', 'AbortError'))
          );
        })
    );

    const pendiente = obtenerAlertasColombia();
    await vi.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS);

    await expect(pendiente).resolves.toEqual([]);
  });

  it('obtenerAlertasColombia_RespuestaQueNoEsJson_DevuelveVacio', async () => {
    simularFetch(
      async () =>
        new Response('<html><body>Service unavailable</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
    );

    await expect(obtenerAlertasColombia()).resolves.toEqual([]);
  });

  it('obtenerAlertasColombia_JsonDeErrorDelServicio_DevuelveVacio', async () => {
    // Respuesta real de GDACS cuando le falta el parámetro de tipo de evento.
    simularFetch(async () => respuestaJson({ message: 'Eventtype is required.' }));

    await expect(obtenerAlertasColombia()).resolves.toEqual([]);
  });

  it('obtenerAlertasColombia_ConsultaYaCancelada_NiSiquieraLlamaAlServicio', async () => {
    const espia = vi.fn<typeof fetch>(async () =>
      respuestaJson({ type: 'FeatureCollection', features: [rasgo()] })
    );
    vi.stubGlobal('fetch', espia);
    const control = new AbortController();
    control.abort();

    await expect(obtenerAlertasColombia(control.signal)).resolves.toEqual([]);
    expect(espia).not.toHaveBeenCalled();
  });
});
