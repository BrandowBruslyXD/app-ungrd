import { describe, expect, it } from 'vitest';
import {
  contarPorFuente,
  cruzar,
  distanciaKm,
  radioDeCruceKm,
  senalDeAlerta,
  senalDeSismo,
  type PuntoReporte,
  type SenalGeolocalizada,
} from '@/features/gestor/lib/cruce';
import type { AlertaMultiamenaza, SismoObservado } from '@/lib/observacion';

/*
 * Lo que se prueba aquí es lo que el gestor va a creerse mirando la pantalla:
 * que un reporte se dé por corroborado solo cuando de verdad hay una señal
 * cerca, que una señal sin reportes se anuncie, y —lo más importante— que la
 * ausencia de señal no produzca ninguna marca sobre el reporte.
 */

/** Vereda El Carmen, Mocoa: el primer reporte de la demostración. */
const MOCOA: PuntoReporte = { id: 'RPT-1', latitud: 1.1494, longitud: -76.6494 };

function sismoEn(latitud: number, longitud: number, id = 'us1'): SismoObservado {
  return {
    id,
    magnitud: 5.1,
    profundidadKm: 12,
    categoriaProfundidad: 'superficial',
    lugar: 'Colombia',
    latitud,
    longitud,
    observadoEn: '2026-08-15T12:00:00.000Z',
    url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us1',
    fuente: 'USGS',
  };
}

function alertaEn(latitud: number, longitud: number, id = 'FL-1-0'): AlertaMultiamenaza {
  return {
    id,
    tipo: 'inundacion',
    nivel: 'naranja',
    pais: 'Colombia',
    titulo: 'Inundación',
    severidad: null,
    latitud,
    longitud,
    observadoEn: '2026-08-15T09:00:00.000Z',
    url: 'https://www.gdacs.org/report.aspx',
    fuente: 'GDACS',
  };
}

describe('distanciaKm', () => {
  it('distanciaKm_bogotaMedellin_devuelveLaDistanciaRealEnKilometros', () => {
    const distancia = distanciaKm(4.711, -74.0721, 6.2442, -75.5812);

    // El valor real ronda los 240 km. Se comprueba el orden de magnitud, que es
    // lo que decide si una señal corrobora o no.
    expect(distancia).toBeGreaterThan(230);
    expect(distancia).toBeLessThan(250);
  });

  it('distanciaKm_mismoPunto_devuelveCero', () => {
    expect(distanciaKm(4.711, -74.0721, 4.711, -74.0721)).toBe(0);
  });

  it('distanciaKm_ungradoDeLatitud_ronda111Kilometros', () => {
    // Sirve de calibración para los radios de cruce, que están en kilómetros.
    expect(distanciaKm(4, -74, 5, -74)).toBeCloseTo(111.2, 0);
  });
});

describe('cruzar — la señal corrobora el reporte', () => {
  it('cruzar_sismoJuntoAlReporte_marcaElReporteComoCorroborado', () => {
    const cruce = cruzar([MOCOA], [senalDeSismo(sismoEn(1.2, -76.7))]);

    expect(cruce.corroboracionPorReporte.get('RPT-1')?.[0].fuente).toBe('USGS');
    expect(cruce.senalesSinReporte).toHaveLength(0);
  });

  it('cruzar_variasSenalesJuntoAlMismoReporte_lasAcumulaTodas', () => {
    const cruce = cruzar(
      [MOCOA],
      [senalDeSismo(sismoEn(1.2, -76.7)), senalDeAlerta(alertaEn(1.1, -76.6))],
    );

    expect(cruce.corroboracionPorReporte.get('RPT-1')).toHaveLength(2);
  });

  it('cruzar_sinSenalCerca_noDejaNingunaMarcaSobreElReporte', () => {
    // La regla que no se puede romper: la ausencia de señal no es sospecha. Un
    // reporte sin corroboración sale del cruce igual que entró, sin categoría
    // de «dudoso» que alguien pueda leer en pantalla.
    const cruce = cruzar([MOCOA], []);

    expect(cruce.corroboracionPorReporte.size).toBe(0);
    expect(cruce.corroboracionPorReporte.has('RPT-1')).toBe(false);
  });
});

describe('cruzar — el radio depende de lo que mide cada fuente', () => {
  /** Punto a unos 120 km al norte del reporte de referencia. */
  const REPORTE: PuntoReporte = { id: 'RPT-2', latitud: 4, longitud: -74 };
  const A_120_KM = { latitud: 5.08, longitud: -74 };

  it('radioDeCruceKm_alerta_esMasAnchoQueElDelSismo', () => {
    // GDACS publica el centroide del evento, no su huella: una inundación cubre
    // mucho más que ese punto.
    expect(radioDeCruceKm('alerta')).toBeGreaterThan(radioDeCruceKm('sismo'));
  });

  it('cruzar_sismoA120Km_noCorroboraPorqueQuedaFueraDelRadio', () => {
    const cruce = cruzar(
      [REPORTE],
      [senalDeSismo(sismoEn(A_120_KM.latitud, A_120_KM.longitud))],
    );

    expect(cruce.corroboracionPorReporte.size).toBe(0);
    expect(cruce.senalesSinReporte).toHaveLength(1);
  });

  it('cruzar_alertaA120Km_siCorroboraPorqueSuRadioEsMasAncho', () => {
    const cruce = cruzar(
      [REPORTE],
      [senalDeAlerta(alertaEn(A_120_KM.latitud, A_120_KM.longitud))],
    );

    expect(cruce.corroboracionPorReporte.get('RPT-2')).toHaveLength(1);
    expect(cruce.senalesSinReporte).toHaveLength(0);
  });
});

describe('cruzar — la señal sin reporte es alerta temprana', () => {
  it('cruzar_senalLejosDeTodoReporteDentroDeColombia_laAnunciaComoSinReporte', () => {
    const bogota = senalDeSismo(sismoEn(4.711, -74.0721, 'us-bogota'));

    const cruce = cruzar([MOCOA], [bogota]);

    expect(cruce.senalesSinReporte.map((senal) => senal.id)).toEqual(['us-bogota']);
  });

  it('cruzar_senalFueraDeColombia_noSeAnunciaAunqueNoTengaReportesCerca', () => {
    /*
     * Un sismo en el Pacífico abierto tampoco tiene reportes cerca, y anunciarlo
     * como emergencia sin reportar sería ruido que tapa las que sí importan.
     */
    const enAltaMar = senalDeSismo(sismoEn(-6.5, -80.5, 'us-mar'));

    const cruce = cruzar([MOCOA], [enAltaMar]);

    expect(cruce.senalesSinReporte).toHaveLength(0);
  });

  it('cruzar_sinNingunReporte_todaSenalColombianaQuedaSinReporte', () => {
    const cruce = cruzar([], [senalDeSismo(sismoEn(4.711, -74.0721))]);

    expect(cruce.senalesSinReporte).toHaveLength(1);
  });
});

describe('contarPorFuente', () => {
  it('contarPorFuente_mezclaDeFuentes_cuentaSoloLaPedida', () => {
    const senales: SenalGeolocalizada[] = [
      senalDeSismo(sismoEn(4.7, -74.07, 'us-1')),
      senalDeSismo(sismoEn(4.8, -74.08, 'us-2')),
      senalDeAlerta(alertaEn(4.9, -74.09)),
    ];

    expect(contarPorFuente(senales, 'USGS')).toBe(2);
    expect(contarPorFuente(senales, 'GDACS')).toBe(1);
  });
});
