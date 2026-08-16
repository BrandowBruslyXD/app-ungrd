/**
 * Dónde empieza y dónde termina «aquí».
 *
 * Las fuentes de observación son mundiales: USGS publica cuatrocientos sismos por
 * semana y GDACS cien alertas activas en todo el planeta. Al gestor colombiano
 * solo le sirve lo que cae sobre su territorio o lo bastante cerca como para
 * sentirse.
 */

/** Un recuadro geográfico en grados decimales. */
export interface Recuadro {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

/**
 * Colombia continental e insular.
 *
 * El extremo occidental no es la costa del Pacífico sino San Andrés y Providencia,
 * a unos 81,7° oeste. Recortar en la costa dejaría fuera al archipiélago, que es
 * justo el territorio más expuesto a huracanes del país.
 */
export const RECUADRO_COLOMBIA: Recuadro = {
  latMin: -4.3,
  latMax: 13.5,
  lonMin: -82.1,
  lonMax: -66.8,
};

/**
 * Colombia y su entorno sísmico inmediato.
 *
 * Un sismo con epicentro en Ecuador, Panamá o Venezuela se siente en Nariño, en
 * el Chocó o en Norte de Santander. Filtrar por la frontera política escondería
 * exactamente los eventos que el gestor necesita ver primero.
 */
export const RECUADRO_ENTORNO_COLOMBIA: Recuadro = {
  latMin: -7,
  latMax: 16,
  lonMin: -84,
  lonMax: -64,
};

/** Cierto cuando el punto cae dentro del recuadro, bordes incluidos. */
export function dentroDe(recuadro: Recuadro, latitud: number, longitud: number): boolean {
  return (
    latitud >= recuadro.latMin &&
    latitud <= recuadro.latMax &&
    longitud >= recuadro.lonMin &&
    longitud <= recuadro.lonMax
  );
}
