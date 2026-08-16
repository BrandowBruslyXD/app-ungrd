/**
 * Capas base del mapa: satélite del día, relieve y calles.
 *
 * Vive fuera del componente porque el panel del gestor necesita decidir con qué
 * capa arranca el mapa y mostrar la fecha de la imagen en su propio texto, sin
 * tener que importar Leaflet para averiguarla.
 *
 * Las tres fuentes se comprobaron contra el servicio real antes de escribirlas
 * aquí: ninguna pide clave y ninguna se llama desde el navegador con `fetch`
 * —son teselas, las pide la etiqueta `img`—, así que no hay CORS de por medio.
 */

/** Las tres capas conmutables del mapa. */
export type ClaveCapaBase = 'satelite' | 'relieve' | 'calles';

/** Definición de una capa base, lista para pasársela a `L.tileLayer`. */
export interface CapaBase {
  readonly clave: ClaveCapaBase;
  /** Clave de i18n con el nombre que se pinta en el conmutador. */
  readonly claveEtiqueta: string;
  /** Plantilla de teselas con los marcadores que sustituye Leaflet. */
  readonly plantillaUrl: string;
  /** Atribución obligatoria; se acumula en el control de Leaflet. */
  readonly atribucion: string;
  /** Hasta dónde deja acercarse el mapa con esta capa activa. */
  readonly maxZoom: number;
  /**
   * Último nivel con teselas propias en el servidor. Más allá Leaflet reescala
   * la última tesela buena en vez de pedir uno que no existe y dejar gris.
   */
  readonly maxNativeZoom: number;
  /** Subdominios de la plantilla, si los usa. */
  readonly subdominios?: string;
}

/** Coordenadas de una tesela, tal como las pide Leaflet. */
export interface Tesela {
  readonly z: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Capa de color real de VIIRS a bordo del NOAA-20.
 *
 * Es «lo que el satélite vio»: nubes incluidas. Se prefiere a MODIS porque los
 * dos satélites Terra y Aqua ya pasaron su vida útil de diseño y VIIRS es la
 * continuidad operativa del producto.
 */
export const CAPA_GIBS_COLOR_REAL = 'VIIRS_NOAA20_CorrectedReflectance_TrueColor';

/**
 * Conjunto de teselas de GIBS para esa capa. El nombre lleva el nivel máximo:
 * `Level9` sirve del zoom 0 al 9, y del 10 en adelante el servidor responde 400.
 */
const CONJUNTO_GIBS = 'GoogleMapsCompatible_Level9';

/** Último zoom con tesela propia en GIBS. Comprobado: el 10 devuelve 400. */
export const ZOOM_NATIVO_GIBS = 9;

/**
 * Tesela vacía de 1×1 transparente.
 *
 * Cuando una tesela no existe, el navegador pinta el icono de imagen rota. Con
 * esto el hueco queda en blanco y el mapa sigue siendo un mapa: nunca se ve un
 * error técnico en pantalla.
 */
export const TESELA_TRANSPARENTE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Segundos que se le dan a la capa satelital para traer su primera tesela antes
 * de darla por caída. Igual que cualquier otra llamada externa del proyecto.
 */
export const ESPERA_MAXIMA_SATELITE_MS = 5000;

/**
 * Arma la plantilla de teselas de GIBS para una fecha concreta.
 *
 * Ojo con el orden: GIBS sirve `{z}/{y}/{x}` y Leaflet arma `{z}/{x}/{y}`. Se
 * escribe explícitamente porque Leaflet sustituye los marcadores por nombre, no
 * por posición, y así la plantilla queda correcta sin tocar `getTileUrl`.
 *
 * @param fecha Día de la observación en formato `AAAA-MM-DD`.
 * @param capa Identificador de la capa de GIBS.
 */
export function plantillaTeselasGibs(
  fecha: string,
  capa: string = CAPA_GIBS_COLOR_REAL,
): string {
  return (
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${capa}` +
    `/default/${fecha}/${CONJUNTO_GIBS}/{z}/{y}/{x}.jpg`
  );
}

/**
 * Elige qué día de imagen satelital pedirle a GIBS.
 *
 * **Por qué el día anterior y no hoy.** El satélite es de órbita polar: pasa
 * sobre Colombia dos veces al día, por la tarde en hora UTC, y GIBS publica el
 * mosaico entre una y tres horas después. Durante la mayor parte del día la
 * fecha de hoy todavía no existe —se comprobó: devuelve 404— y el mapa saldría
 * en blanco. El mosaico de ayer, en cambio, siempre está completo.
 *
 * Perder un día es el precio de que la capa nunca aparezca vacía, y como la
 * fecha se escribe en la interfaz el usuario sabe exactamente qué está mirando.
 *
 * @param ahora Momento de referencia. Se inyecta para poder probarlo.
 * @param diasAtras Cuántos días retroceder. Con 2 o más se ve el «antes».
 * @returns Fecha en formato `AAAA-MM-DD`, siempre en UTC.
 */
export function fechaImagenGibs(ahora: Date = new Date(), diasAtras: number = 1): string {
  const referencia = Number.isNaN(ahora.getTime()) ? new Date() : ahora;
  const dia = Date.UTC(
    referencia.getUTCFullYear(),
    referencia.getUTCMonth(),
    referencia.getUTCDate() - Math.max(0, Math.trunc(diasAtras)),
  );

  return new Date(dia).toISOString().slice(0, 10);
}

/**
 * Pasa una fecha `AAAA-MM-DD` a «15 de agosto» para escribirla en la interfaz.
 *
 * Se fuerza la zona UTC: la fecha que devuelve GIBS es un día de calendario del
 * satélite, no un instante, y sin esto un usuario al oeste de Greenwich vería
 * el día anterior.
 */
export function textoFechaImagen(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  if (!anio || !mes || !dia) {
    return fecha;
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(anio, mes - 1, dia)));
}

/**
 * Sustituye los marcadores de una plantilla de teselas.
 *
 * Reproduce lo que hace Leaflet internamente. Existe para poder comprobar en
 * una prueba que la URL sale con `{y}` y `{x}` en el orden que espera GIBS, sin
 * montar un mapa entero.
 */
export function construirUrlTesela(plantilla: string, tesela: Tesela): string {
  return plantilla
    .replace('{z}', String(tesela.z))
    .replace('{x}', String(tesela.x))
    .replace('{y}', String(tesela.y));
}

const ATRIBUCION_OSM =
  '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Construye las tres capas base para una fecha de imagen dada.
 *
 * El orden es el del conmutador: primero lo que más dice de la emergencia,
 * último lo que sirve para trabajar.
 */
export function construirCapasBase(fechaSatelite: string): readonly CapaBase[] {
  return [
    {
      clave: 'satelite',
      claveEtiqueta: 'mapa.capas.satelite',
      plantillaUrl: plantillaTeselasGibs(fechaSatelite),
      atribucion:
        'Imagen <a href="https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api">NASA EOSDIS GIBS</a>',
      // Se deja subir hasta 19 para que el gestor no pierda el acercamiento al
      // cambiar de capa; de 9 en adelante Leaflet reescala la última tesela.
      maxZoom: 19,
      maxNativeZoom: ZOOM_NATIVO_GIBS,
    },
    {
      clave: 'relieve',
      claveEtiqueta: 'mapa.capas.relieve',
      plantillaUrl: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      atribucion: `${ATRIBUCION_OSM}, SRTM · estilo <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)`,
      maxZoom: 19,
      // OpenTopoMap solo genera hasta el 17.
      maxNativeZoom: 17,
      subdominios: 'abc',
    },
    {
      clave: 'calles',
      claveEtiqueta: 'mapa.capas.calles',
      plantillaUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      atribucion: ATRIBUCION_OSM,
      maxZoom: 19,
      maxNativeZoom: 19,
    },
  ];
}

/**
 * Capa con la que arranca un mapa de solo lectura, como el del panel del gestor.
 *
 * El relieve y no el satélite, aunque la imagen satelital sea más vistosa: la
 * pasada de VIIRS trae las nubes reales del día, y en Colombia en temporada de
 * lluvias eso es precisamente medio país tapado — incluidos los marcadores que
 * hay que mirar. El relieve muestra la montaña y el cauce, que es la geografía
 * que explica por qué se inundó esa vereda y no la de al lado.
 *
 * El satélite queda a un toque en el conmutador, que es donde tiene sentido:
 * cuando alguien quiere ver la nubosidad o comparar el antes y el después.
 */
export const CAPA_INICIAL_LECTURA: ClaveCapaBase = 'relieve';

/**
 * Capa con la que arranca un mapa donde hay que marcar un punto.
 *
 * Aquí manda la utilidad: a un ciudadano señalando dónde se inundó su calle una
 * imagen con nubes le tapa exactamente lo que necesita ver, y GIBS ni siquiera
 * tiene detalle a ese nivel de acercamiento.
 */
export const CAPA_INICIAL_EDICION: ClaveCapaBase = 'calles';

/** Capa a la que se cae si la satelital no responde. Nunca falla y siempre sirve. */
export const CAPA_DE_RESPALDO: ClaveCapaBase = 'calles';
