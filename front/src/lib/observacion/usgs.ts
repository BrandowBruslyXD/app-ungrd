import { RECUADRO_ENTORNO_COLOMBIA, dentroDe } from '@/lib/observacion/colombia';
import { esObjeto, numeroDe, pedirJson, textoDe } from '@/lib/observacion/red';

/**
 * Sismos de la última semana, del servicio geológico de Estados Unidos.
 *
 * Se llama **directo desde el navegador**: el feed responde con
 * `access-control-allow-origin: *`, comprobado contra el servicio real, así que
 * no necesita proxy ni clave. Es la única fuente del panel que no es satelital
 * —es una red sísmica en tierra— y por eso su latencia es de un minuto y no de
 * horas.
 *
 * Si el feed falla o tarda, esto devuelve una lista vacía y el bloque desaparece.
 */

/** Feed público de sismos de magnitud 2,5 o mayor de los últimos siete días. */
export const URL_SISMOS_USGS =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson';

/** Nombre de la fuente, tal como se le muestra al gestor. Es un nombre propio. */
export const FUENTE_USGS = 'USGS' as const;

/**
 * Tope de sismos devueltos.
 *
 * Una semana movida deja veinte eventos en la región y un panel con veinte filas
 * no se lee. Se muestran los más recientes.
 */
const MAXIMO_SISMOS = 12;

/**
 * Qué tan hondo fue, en las tres categorías que usa la sismología.
 *
 * No es un adorno: es el dato que decide si un sismo se siente o no. Uno de
 * magnitud 5 a 150 km apenas se nota; uno de magnitud 4 a 10 km tumba casas.
 * Casi ninguna interfaz lo muestra, y sin él la magnitud sola engaña.
 */
export type CategoriaProfundidad = 'superficial' | 'intermedia' | 'profunda';

/** Un sismo ya filtrado, tipado y listo para pintarse. */
export interface SismoObservado {
  /** Identificador del evento en USGS, estable entre consultas. */
  id: string;
  magnitud: number;
  /** Profundidad del hipocentro en kilómetros. */
  profundidadKm: number;
  categoriaProfundidad: CategoriaProfundidad;
  /** Descripción del sitio tal como la publica USGS. */
  lugar: string;
  latitud: number;
  longitud: number;
  /**
   * Hora de **origen** del sismo en ISO-8601 UTC.
   *
   * No es la hora en que lo consultamos ni en que se publicó: es cuándo ocurrió.
   * Es la cifra que sostiene el discurso de que el dato es verificable.
   */
  observadoEn: string;
  /** Ficha del evento en USGS, para que el gestor contraste en la fuente. */
  url: string;
  fuente: typeof FUENTE_USGS;
}

/** Traduce kilómetros de profundidad a la categoría sismológica correspondiente. */
export function categoriaDeProfundidad(profundidadKm: number): CategoriaProfundidad {
  if (profundidadKm < 70) return 'superficial';
  if (profundidadKm < 300) return 'intermedia';
  return 'profunda';
}

/**
 * Convierte un rasgo del GeoJSON en un sismo, o `null` si le falta algo esencial.
 *
 * Se descarta en silencio lo incompleto en vez de inventar valores por defecto:
 * una profundidad supuesta cambiaría el mensaje que el panel le da al gestor.
 */
function aSismo(rasgo: unknown): SismoObservado | null {
  if (!esObjeto(rasgo)) return null;

  const propiedades = esObjeto(rasgo.properties) ? rasgo.properties : null;
  const geometria = esObjeto(rasgo.geometry) ? rasgo.geometry : null;
  if (propiedades === null || geometria === null) return null;
  if (!Array.isArray(geometria.coordinates)) return null;

  const id = textoDe(rasgo.id);
  const magnitud = numeroDe(propiedades.mag);
  const marcaDeTiempo = numeroDe(propiedades.time);
  const longitud = numeroDe(geometria.coordinates[0]);
  const latitud = numeroDe(geometria.coordinates[1]);
  const profundidadKm = numeroDe(geometria.coordinates[2]);

  if (
    id === null ||
    magnitud === null ||
    marcaDeTiempo === null ||
    longitud === null ||
    latitud === null ||
    profundidadKm === null
  ) {
    return null;
  }

  return {
    id,
    magnitud,
    profundidadKm,
    categoriaProfundidad: categoriaDeProfundidad(profundidadKm),
    lugar: textoDe(propiedades.place) ?? textoDe(propiedades.title) ?? '',
    latitud,
    longitud,
    observadoEn: new Date(marcaDeTiempo).toISOString(),
    url: textoDe(propiedades.url) ?? '',
    fuente: FUENTE_USGS,
  };
}

/**
 * Trae los sismos de la última semana que caen sobre Colombia y su entorno cercano.
 *
 * Devuelve lista vacía —nunca lanza— si el servicio falla, tarda más de cinco
 * segundos o responde algo que no es el GeoJSON esperado.
 *
 * @param senal Cancelación de quien llama, por ejemplo al desmontar el panel.
 */
export async function obtenerSismosCercanos(senal?: AbortSignal): Promise<SismoObservado[]> {
  const cuerpo = await pedirJson(URL_SISMOS_USGS, senal);
  if (!esObjeto(cuerpo) || !Array.isArray(cuerpo.features)) return [];

  return cuerpo.features
    .map(aSismo)
    .filter((sismo): sismo is SismoObservado => sismo !== null)
    .filter((sismo) => dentroDe(RECUADRO_ENTORNO_COLOMBIA, sismo.latitud, sismo.longitud))
    // Todas las horas quedaron normalizadas a ISO-8601 UTC, así que ordenar el
    // texto ordena el tiempo.
    .sort((uno, otro) => otro.observadoEn.localeCompare(uno.observadoEn))
    .slice(0, MAXIMO_SISMOS);
}
