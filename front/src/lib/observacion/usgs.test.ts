import { afterEach, describe, expect, it, vi } from 'vitest';
import { TIEMPO_LIMITE_MS } from '@/lib/observacion/red';
import {
  categoriaDeProfundidad,
  obtenerSismosCercanos,
  type SismoObservado,
} from '@/lib/observacion/usgs';

/*
 * Los cuatro caminos que rompen una demo: el servicio responde bien, el servicio
 * está caído, el servicio tarda y el servicio devuelve algo que no es JSON. Solo
 * el primero puede pintar algo en pantalla; los otros tres tienen que terminar en
 * lista vacía, sin excepción que suba.
 */

/** Un rasgo del GeoJSON de USGS, con los campos que importan. */
function rasgo(
  parcial: {
    id?: string;
    mag?: number | null;
    place?: string;
    time?: number;
    lon?: number;
    lat?: number;
    profundidad?: number | null;
  } = {}
): unknown {
  return {
    type: 'Feature',
    id: parcial.id ?? 'us7000abcd',
    properties: {
      mag: parcial.mag === undefined ? 5.1 : parcial.mag,
      place: parcial.place ?? '5 km S of San José del Palmar, Colombia',
      time: parcial.time ?? Date.UTC(2026, 7, 14, 12, 0, 0),
      url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us7000abcd',
      title: 'M 5.1 - Colombia',
    },
    geometry: {
      type: 'Point',
      coordinates: [
        parcial.lon ?? -76.2,
        parcial.lat ?? 4.8,
        parcial.profundidad === undefined ? 12.4 : parcial.profundidad,
      ],
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

describe('categoriaDeProfundidad', () => {
  it('categoriaDeProfundidad_ProfundidadesDeCadaTramo_DevuelveLaCategoriaSismologica', () => {
    expect(categoriaDeProfundidad(10)).toBe('superficial');
    expect(categoriaDeProfundidad(69.9)).toBe('superficial');
    expect(categoriaDeProfundidad(70)).toBe('intermedia');
    expect(categoriaDeProfundidad(150)).toBe('intermedia');
    expect(categoriaDeProfundidad(300)).toBe('profunda');
    expect(categoriaDeProfundidad(610)).toBe('profunda');
  });
});

describe('obtenerSismosCercanos', () => {
  it('obtenerSismosCercanos_RespuestaCorrecta_DevuelveMagnitudProfundidadYHoraDeOrigen', async () => {
    simularFetch(async () =>
      respuestaJson({
        type: 'FeatureCollection',
        features: [
          rasgo({
            id: 'us-col-1',
            mag: 5,
            profundidad: 12.4,
            time: Date.UTC(2026, 7, 14, 12, 0, 0),
          }),
        ],
      })
    );

    const sismos: SismoObservado[] = await obtenerSismosCercanos();

    expect(sismos).toHaveLength(1);
    expect(sismos[0]).toMatchObject({
      id: 'us-col-1',
      magnitud: 5,
      profundidadKm: 12.4,
      categoriaProfundidad: 'superficial',
      latitud: 4.8,
      longitud: -76.2,
      observadoEn: '2026-08-14T12:00:00.000Z',
      fuente: 'USGS',
    });
  });

  it('obtenerSismosCercanos_SismoLejano_LoDescarta', async () => {
    simularFetch(async () =>
      respuestaJson({
        type: 'FeatureCollection',
        features: [
          rasgo({ id: 'cerca', lon: -74.1, lat: 4.6 }),
          // Indonesia: fuera del entorno de Colombia por mucho.
          rasgo({ id: 'lejos', lon: 121.35, lat: -8.31 }),
        ],
      })
    );

    const sismos = await obtenerSismosCercanos();

    expect(sismos.map((sismo) => sismo.id)).toEqual(['cerca']);
  });

  it('obtenerSismosCercanos_RasgoSinProfundidadOSinMagnitud_LoDescartaSinRomperElResto', async () => {
    simularFetch(async () =>
      respuestaJson({
        type: 'FeatureCollection',
        features: [
          rasgo({ id: 'sin-profundidad', profundidad: null }),
          rasgo({ id: 'sin-magnitud', mag: null }),
          { type: 'Feature', id: 'vacio' },
          null,
          rasgo({ id: 'completo' }),
        ],
      })
    );

    const sismos = await obtenerSismosCercanos();

    expect(sismos.map((sismo) => sismo.id)).toEqual(['completo']);
  });

  it('obtenerSismosCercanos_VariosSismos_LosOrdenaDelMasRecienteAlMasAntiguo', async () => {
    simularFetch(async () =>
      respuestaJson({
        type: 'FeatureCollection',
        features: [
          rasgo({ id: 'antiguo', time: Date.UTC(2026, 7, 10, 6, 0, 0) }),
          rasgo({ id: 'reciente', time: Date.UTC(2026, 7, 15, 6, 0, 0) }),
          rasgo({ id: 'medio', time: Date.UTC(2026, 7, 12, 6, 0, 0) }),
        ],
      })
    );

    const sismos = await obtenerSismosCercanos();

    expect(sismos.map((sismo) => sismo.id)).toEqual(['reciente', 'medio', 'antiguo']);
  });

  it('obtenerSismosCercanos_ServicioCaido_DevuelveVacio', async () => {
    simularFetch(async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(obtenerSismosCercanos()).resolves.toEqual([]);
  });

  it('obtenerSismosCercanos_ServicioResponde503_DevuelveVacio', async () => {
    simularFetch(async () => respuestaJson({ error: 'no disponible' }, 503));

    await expect(obtenerSismosCercanos()).resolves.toEqual([]);
  });

  it('obtenerSismosCercanos_TiempoAgotado_DevuelveVacioYCortaLaPeticion', async () => {
    vi.useFakeTimers();
    simularFetch(
      (_entrada, opciones) =>
        new Promise<Response>((_resolver, rechazar) => {
          opciones?.signal?.addEventListener('abort', () =>
            rechazar(new DOMException('Abortado', 'AbortError'))
          );
        })
    );

    const pendiente = obtenerSismosCercanos();
    await vi.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS);

    await expect(pendiente).resolves.toEqual([]);
  });

  it('obtenerSismosCercanos_RespuestaQueNoEsJson_DevuelveVacio', async () => {
    simularFetch(
      async () =>
        new Response('<html><body>502 Bad Gateway</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
    );

    await expect(obtenerSismosCercanos()).resolves.toEqual([]);
  });

  it('obtenerSismosCercanos_JsonSinColeccionDeRasgos_DevuelveVacio', async () => {
    simularFetch(async () => respuestaJson({ message: 'Eventtype is required.' }));

    await expect(obtenerSismosCercanos()).resolves.toEqual([]);
  });
});
