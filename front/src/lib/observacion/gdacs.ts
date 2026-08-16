import { RECUADRO_COLOMBIA, dentroDe } from '@/lib/observacion/colombia';
import { esObjeto, numeroDe, pedirJson, textoDe } from '@/lib/observacion/red';

/**
 * Alertas multiamenaza de GDACS, el sistema de Naciones Unidas y la Comisión Europea.
 *
 * Es la corroboración institucional del panel: si GDACS ya marcó el evento, el
 * reporte ciudadano deja de ser una anécdota.
 *
 * **Va por proxy y no directo.** Comprobado contra el servicio real: responde 200
 * con JSON pero no manda `access-control-allow-origin`, así que el navegador
 * bloquea la llamada. La ruta de abajo la resuelve la función de `api/gdacs.ts`
 * en producción y el proxy de `vite.config.ts` en desarrollo, de modo que el
 * cliente no necesita saber dónde está.
 */

/** Ruta relativa del proxy. Misma en desarrollo y en producción, a propósito. */
export const RUTA_ALERTAS_GDACS = '/api/gdacs';

/** Nombre de la fuente, tal como se le muestra al gestor. Es un nombre propio. */
export const FUENTE_GDACS = 'GDACS' as const;

/** Tope de alertas devueltas: el subpanel muestra un resumen, no un catálogo. */
const MAXIMO_ALERTAS = 12;

/** Amenazas que clasifica GDACS. Códigos, no textos: la pantalla los traduce. */
export type TipoAmenaza = 'sismo' | 'ciclon' | 'inundacion' | 'volcan' | 'sequia' | 'incendio';

/** Severidad de la alerta en la escala de tres niveles de GDACS. */
export type NivelAlerta = 'verde' | 'naranja' | 'rojo';

/** Códigos de amenaza de GDACS. Lo que no esté aquí se descarta. */
const TIPOS_POR_CODIGO: Readonly<Record<string, TipoAmenaza>> = {
  EQ: 'sismo',
  TC: 'ciclon',
  FL: 'inundacion',
  VO: 'volcan',
  DR: 'sequia',
  WF: 'incendio',
};

/** Niveles de alerta de GDACS, en inglés en el origen. */
const NIVELES_POR_CODIGO: Readonly<Record<string, NivelAlerta>> = {
  green: 'verde',
  orange: 'naranja',
  red: 'rojo',
};

/** Una alerta de GDACS ya filtrada y tipada. */
export interface AlertaMultiamenaza {
  /** `tipo-evento-episodio`: identifica el episodio concreto, no solo el evento. */
  id: string;
  tipo: TipoAmenaza;
  nivel: NivelAlerta;
  /** País afectado, según lo publica GDACS. */
  pais: string;
  /** Título del evento tal como lo publica la fuente. */
  titulo: string;
  /** Magnitud, caudal o velocidad de viento según la amenaza. Puede no venir. */
  severidad: string | null;
  latitud: number;
  longitud: number;
  /** Hora de inicio del evento en ISO-8601 UTC, no la hora de la consulta. */
  observadoEn: string;
  /** Informe del evento en GDACS, para contrastar en la fuente. */
  url: string;
  fuente: typeof FUENTE_GDACS;
}

/** Detecta una zona horaria explícita al final de una marca de tiempo. */
const CON_ZONA_HORARIA = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Normaliza una fecha de GDACS a ISO-8601 UTC.
 *
 * El servicio publica `2026-08-14T21:58:21`, sin zona. Es UTC, pero sin la `Z`
 * el navegador la interpretaría como hora local y la hora de observación
 * aparecería corrida cinco horas en Colombia.
 */
function aIsoUtc(texto: string): string | null {
  const normalizado = CON_ZONA_HORARIA.test(texto) ? texto : `${texto}Z`;
  const fecha = new Date(normalizado);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

/** Cierto si el evento toca Colombia, por país declarado o por su ubicación. */
function tocaColombia(
  propiedades: Record<string, unknown>,
  latitud: number,
  longitud: number
): boolean {
  const iso3 = textoDe(propiedades.iso3)?.toUpperCase() ?? null;
  const pais = textoDe(propiedades.country);
  const afectados = Array.isArray(propiedades.affectedcountries)
    ? propiedades.affectedcountries.filter(esObjeto)
    : [];

  if (iso3 === 'COL') return true;
  if (pais?.toLowerCase().includes('colombia') === true) return true;

  // Un ciclón o una inundación puede listar varios países afectados y traer
  // otro en `country`. Colombia puede estar en la lista sin ser el principal.
  if (afectados.some((afectado) => textoDe(afectado.iso3)?.toUpperCase() === 'COL')) return true;

  /*
   * Si GDACS ya atribuyó el evento a otros países, se le cree y se descarta.
   *
   * Esto no es cautela teórica: el recuadro de Colombia es un rectángulo y
   * muerde Venezuela, Panamá, Ecuador, Perú y Brasil. Contra el listado real
   * de hoy, sin esta condición se colaban cuatro sismos que GDACS atribuye
   * solo a Venezuela, y el panel le habría dicho al gestor que hay una alerta
   * roja en Colombia. En una herramienta de emergencias eso es peor que no
   * mostrar nada.
   */
  if (iso3 !== null || pais !== null || afectados.length > 0) return false;

  // Solo cuando GDACS no ha atribuido país todavía se decide por la ubicación.
  return dentroDe(RECUADRO_COLOMBIA, latitud, longitud);
}

/** Convierte un rasgo del GeoJSON en alerta, o `null` si le falta algo esencial. */
function aAlerta(rasgo: unknown): AlertaMultiamenaza | null {
  if (!esObjeto(rasgo)) return null;

  const propiedades = esObjeto(rasgo.properties) ? rasgo.properties : null;
  const geometria = esObjeto(rasgo.geometry) ? rasgo.geometry : null;
  if (propiedades === null || geometria === null) return null;
  if (!Array.isArray(geometria.coordinates)) return null;

  const longitud = numeroDe(geometria.coordinates[0]);
  const latitud = numeroDe(geometria.coordinates[1]);
  if (longitud === null || latitud === null) return null;
  if (!tocaColombia(propiedades, latitud, longitud)) return null;

  const codigoTipo = textoDe(propiedades.eventtype)?.toUpperCase() ?? '';
  const codigoNivel = textoDe(propiedades.alertlevel)?.toLowerCase() ?? '';
  const tipo = TIPOS_POR_CODIGO[codigoTipo];
  const nivel = NIVELES_POR_CODIGO[codigoNivel];
  if (tipo === undefined || nivel === undefined) return null;

  const identificadorEvento = numeroDe(propiedades.eventid);
  const fechaCruda = textoDe(propiedades.fromdate) ?? textoDe(propiedades.datemodified);
  if (identificadorEvento === null || fechaCruda === null) return null;

  const observadoEn = aIsoUtc(fechaCruda);
  if (observadoEn === null) return null;

  const episodio = numeroDe(propiedades.episodeid) ?? 0;
  const enlaces = esObjeto(propiedades.url) ? propiedades.url : null;
  const severidad = esObjeto(propiedades.severitydata) ? propiedades.severitydata : null;

  return {
    id: `${codigoTipo}-${identificadorEvento}-${episodio}`,
    tipo,
    nivel,
    pais: textoDe(propiedades.country) ?? 'Colombia',
    titulo: textoDe(propiedades.name) ?? textoDe(propiedades.description) ?? '',
    severidad: severidad === null ? null : textoDe(severidad.severitytext),
    latitud,
    longitud,
    observadoEn,
    url: enlaces === null ? '' : (textoDe(enlaces.report) ?? ''),
    fuente: FUENTE_GDACS,
  };
}

/**
 * Trae las alertas activas de GDACS que afectan a Colombia.
 *
 * Devuelve lista vacía —nunca lanza— si el proxy o el servicio fallan, tardan más
 * de cinco segundos o responden algo que no es el GeoJSON esperado. Es el mismo
 * resultado que «hoy no hay alertas», y es el correcto: el bloque desaparece.
 *
 * @param senal Cancelación de quien llama, por ejemplo al desmontar el panel.
 */
export async function obtenerAlertasColombia(senal?: AbortSignal): Promise<AlertaMultiamenaza[]> {
  const cuerpo = await pedirJson(RUTA_ALERTAS_GDACS, senal);
  if (!esObjeto(cuerpo) || !Array.isArray(cuerpo.features)) return [];

  return cuerpo.features
    .map(aAlerta)
    .filter((alerta): alerta is AlertaMultiamenaza => alerta !== null)
    .sort((una, otra) => otra.observadoEn.localeCompare(una.observadoEn))
    .slice(0, MAXIMO_ALERTAS);
}
