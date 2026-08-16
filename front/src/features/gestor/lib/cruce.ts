import { RECUADRO_COLOMBIA, dentroDe } from '@/lib/observacion';
import type { AlertaMultiamenaza, SismoObservado } from '@/lib/observacion';

/**
 * El cruce entre lo que reporta la gente y lo que observan las fuentes externas.
 *
 * Es lo único de este panel que no se puede copiar mirando otra herramienta:
 * poner un sismo del USGS y un reporte ciudadano en el mismo punto y dejar que
 * se confirmen el uno al otro.
 *
 * Se lee en las dos direcciones y las dos importan:
 *
 * - **Señal cerca de un reporte** → el reporte queda corroborado por una fuente
 *   independiente. El gestor deja de depender de la palabra de una persona.
 * - **Señal sin ningún reporte cerca** → pasó algo donde nadie ha reportado.
 *   Eso es alerta temprana y va a la vista, no escondido.
 *
 * **La tercera lectura no existe y no debe existir.** Que un reporte no tenga
 * señal cerca **no lo pone en duda**: el satélite de órbita polar pasa dos veces
 * al día, puede haber nubes, puede ser de noche, y ni USGS ni GDACS observan
 * inundaciones de quebrada ni deslizamientos de vereda. Marcar un reporte como
 * dudoso por ausencia de señal sería un error grave en una herramienta de
 * emergencias, así que aquí no se calcula esa categoría siquiera.
 */

/** Radio de la Tierra en kilómetros, el valor medio que usa la fórmula. */
const RADIO_TIERRA_KM = 6371;

/** De qué tipo es la señal externa. Códigos, no textos: la pantalla los traduce. */
export type ClaseSenal = 'sismo' | 'alerta';

/**
 * Una señal externa reducida a lo que el cruce necesita.
 *
 * Sismos y alertas llegan con formas distintas y aquí se igualan: al cruce solo
 * le importa dónde ocurrió, cuándo y quién lo vio.
 */
export interface SenalGeolocalizada {
  readonly id: string;
  readonly clase: ClaseSenal;
  /** Nombre propio de quien observó: `USGS`, `GDACS`. Nunca texto de interfaz. */
  readonly fuente: string;
  readonly latitud: number;
  readonly longitud: number;
  /** Hora de observación en ISO-8601 UTC. */
  readonly observadoEn: string;
}

/** Un reporte ciudadano reducido a su ubicación, que es lo que se cruza. */
export interface PuntoReporte {
  readonly id: string;
  readonly latitud: number;
  readonly longitud: number;
}

/** Resultado del cruce, en sus dos direcciones. */
export interface Cruce {
  /** Identificador de reporte → señales independientes que lo corroboran. */
  readonly corroboracionPorReporte: ReadonlyMap<string, readonly SenalGeolocalizada[]>;
  /**
   * Señales dentro de Colombia sin ningún reporte ciudadano cerca.
   *
   * Se recortan al territorio a propósito: un sismo de magnitud 3 en el Pacífico
   * abierto tampoco tiene reportes cerca, y anunciarlo como emergencia sin
   * reportar sería ruido que tapa las señales que sí importan.
   */
  readonly senalesSinReporte: readonly SenalGeolocalizada[];
}

/**
 * Hasta dónde se considera que una señal y un reporte hablan de lo mismo.
 *
 * Los dos números son distintos porque las dos fuentes miden cosas distintas:
 *
 * - Un sismo se publica con su epicentro. Uno superficial de magnitud 2,5 o más
 *   se siente en un radio del orden de cien kilómetros; más allá, la coincidencia
 *   geográfica deja de significar nada.
 * - GDACS publica el **centroide** del evento, no su huella. Una inundación o un
 *   ciclón cubren una región mucho mayor que ese punto, así que el radio es más
 *   ancho o se perderían corroboraciones legítimas.
 */
const RADIO_POR_CLASE: Readonly<Record<ClaseSenal, number>> = {
  sismo: 100,
  alerta: 150,
};

/** Kilómetros a los que una señal de esa clase todavía puede corroborar un reporte. */
export function radioDeCruceKm(clase: ClaseSenal): number {
  return RADIO_POR_CLASE[clase];
}

/**
 * Distancia en kilómetros entre dos puntos, por la fórmula del semiverseno.
 *
 * Se calcula sobre la esfera y no sobre el plano porque Colombia mide mil
 * kilómetros de ancho: tratar los grados como si fueran cuadrícula da errores
 * de decenas de kilómetros, justo del orden del radio que se está comparando.
 */
export function distanciaKm(
  latitudUno: number,
  longitudUno: number,
  latitudOtro: number,
  longitudOtro: number,
): number {
  const aRadianes = (grados: number): number => (grados * Math.PI) / 180;

  const deltaLatitud = aRadianes(latitudOtro - latitudUno);
  const deltaLongitud = aRadianes(longitudOtro - longitudUno);
  const senoLatitud = Math.sin(deltaLatitud / 2);
  const senoLongitud = Math.sin(deltaLongitud / 2);

  const a =
    senoLatitud * senoLatitud +
    Math.cos(aRadianes(latitudUno)) *
      Math.cos(aRadianes(latitudOtro)) *
      senoLongitud *
      senoLongitud;

  return 2 * RADIO_TIERRA_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Reduce un sismo del USGS a la forma común del cruce. */
export function senalDeSismo(sismo: SismoObservado): SenalGeolocalizada {
  return {
    id: sismo.id,
    clase: 'sismo',
    fuente: sismo.fuente,
    latitud: sismo.latitud,
    longitud: sismo.longitud,
    observadoEn: sismo.observadoEn,
  };
}

/** Reduce una alerta de GDACS a la forma común del cruce. */
export function senalDeAlerta(alerta: AlertaMultiamenaza): SenalGeolocalizada {
  return {
    id: alerta.id,
    clase: 'alerta',
    fuente: alerta.fuente,
    latitud: alerta.latitud,
    longitud: alerta.longitud,
    observadoEn: alerta.observadoEn,
  };
}

/**
 * Cruza los reportes ciudadanos con las señales externas.
 *
 * @param reportes Reportes con ubicación marcada.
 * @param senales Sismos y alertas ya reducidos con `senalDeSismo` y `senalDeAlerta`.
 */
export function cruzar(
  reportes: readonly PuntoReporte[],
  senales: readonly SenalGeolocalizada[],
): Cruce {
  const corroboracionPorReporte = new Map<string, SenalGeolocalizada[]>();
  const senalesSinReporte: SenalGeolocalizada[] = [];

  for (const senal of senales) {
    const radio = radioDeCruceKm(senal.clase);
    let corroboroAlguno = false;

    for (const reporte of reportes) {
      const distancia = distanciaKm(
        senal.latitud,
        senal.longitud,
        reporte.latitud,
        reporte.longitud,
      );
      if (distancia > radio) {
        continue;
      }

      corroboroAlguno = true;
      const acumuladas = corroboracionPorReporte.get(reporte.id);
      if (acumuladas === undefined) {
        corroboracionPorReporte.set(reporte.id, [senal]);
      } else {
        acumuladas.push(senal);
      }
    }

    if (!corroboroAlguno && dentroDe(RECUADRO_COLOMBIA, senal.latitud, senal.longitud)) {
      senalesSinReporte.push(senal);
    }
  }

  return { corroboracionPorReporte, senalesSinReporte };
}

/** Cuántas señales sin reporte cerca aportó cada fuente. Cero no se muestra. */
export function contarPorFuente(
  senales: readonly SenalGeolocalizada[],
  fuente: string,
): number {
  return senales.filter((senal) => senal.fuente === fuente).length;
}
