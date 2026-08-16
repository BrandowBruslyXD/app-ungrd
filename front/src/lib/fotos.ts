import type { FuenteFoto } from '@/components/ui/Foto';

/**
 * Catálogo de fotografías de la aplicación.
 *
 * Viven en `public/imagenes/` y no en un CDN a propósito: la app tiene que
 * servir en municipios con mala conexión, y una foto que depende de un tercero
 * es una foto que no aparece justo el día de la emergencia.
 *
 * Los créditos y la licencia de cada una están en
 * `public/imagenes/CREDITOS.json`. Todas son Unsplash License: uso comercial
 * libre, sin atribución obligatoria.
 *
 * **No se agregan fotos a mano.** Se añaden a `scripts/descargar-fotos.mjs` y se
 * corre el script, que aborta si la imagen resulta ser Unsplash+ de pago. En la
 * primera pasada se colaron dos de pago acreditadas a Getty; el guardia existe
 * por eso.
 *
 * **Criterio editorial**, en tres reglas:
 *
 * 1. **Colombia.** Seis de las siete están tomadas en el país —Guatavita,
 *    Tauramena, Muellamues, Medellín, Barichara y Jericó— y la ubicación queda
 *    registrada en el manifiesto. La única excepción es un primer plano de un
 *    casco, donde no hay paisaje que delate otro lugar.
 * 2. **Sin texto.** Ni vallas ni carrocerías con rótulos: cualquier letrero en
 *    otro idioma delata que la foto no es de aquí.
 * 3. **Sin rostros identificables.** Ni de damnificados, por dignidad, ni de
 *    nadie en primer plano, porque la licencia cubre la fotografía pero no los
 *    derechos de imagen de la persona retratada.
 */
export const FOTOS = {
  /** Guatavita: casas en ladera entre árboles. El territorio en riesgo. */
  laderaViviendas: { base: 'ladera-viviendas', anchos: [1600, 800] },
  /** Tauramena, Casanare: viviendas y parcelas desde el aire, al atardecer. */
  veredasAtardecer: { base: 'veredas-atardecer', anchos: [800, 400] },
  /** Equipo de socorro en bote por una zona inundada. Único no colombiano. */
  rescateInundacion: { base: 'rescate-inundacion', anchos: [800, 400] },
  /** Muellamues, Nariño: grupo recorriendo terreno verde. */
  recorridoEnCampo: { base: 'recorrido-en-campo', anchos: [800, 400] },
  /** Medellín: río atravesando el valle, vista aérea. */
  valleRioAereo: { base: 'valle-rio-aereo', anchos: [800, 400] },
  /** Barichara, Santander: el casco urbano de un municipio entre montañas. */
  municipioAereo: { base: 'municipio-aereo', anchos: [1200, 600] },
  /** Jericó, Antioquia: la iglesia sobre los tejados del pueblo. */
  puebloJerico: { base: 'pueblo-jerico', anchos: [1200, 600] },

  /* Bandas de encabezado de las pantallas internas. */

  /** Camino destapado entre laderas verdes. La vía que se corta. */
  viaRuralVerde: { base: 'via-rural-verde', anchos: [1200, 600] },
  /** Circasia, Quindío: ladera cubierta de nubes bajas. */
  laderaNubes: { base: 'ladera-nubes', anchos: [1200, 600] },
  /** Tuluá, Valle: cordillera bajo cielo encapotado. El clima que amenaza. */
  montanasNubladas: { base: 'montanas-nubladas', anchos: [1200, 600] },
  /** Don Matías, Antioquia: ganado en pastizal. El sector agropecuario del EDAN. */
  ganadoPastizal: { base: 'ganado-pastizal', anchos: [1200, 600] },
  /** Valle de Cocora: bosque de palma de cera. */
  bosqueCocora: { base: 'bosque-cocora', anchos: [1200, 600] },

  /* Banco de la banda rotatoria de la portada. */

  /** El Retiro, Antioquia: una casa sola en mitad de la ladera. */
  casaEnLadera: { base: 'casa-en-ladera', anchos: [1200, 600] },
  /** Villa de Leyva, Boyacá: casa blanca con la cordillera detrás. */
  casaBlancaMontanas: { base: 'casa-blanca-montanas', anchos: [1200, 600] },
  /** Valle de Cocora: rebaño de ovejas en la ladera. */
  ovejasLadera: { base: 'ovejas-ladera', anchos: [1200, 600] },
  /** Valle de Cocora: la montaña metida entre nubes. */
  montanaEntreNubes: { base: 'montana-entre-nubes', anchos: [1200, 600] },
  /** Camino destapado entre árboles. */
  caminoEntreArboles: { base: 'camino-entre-arboles', anchos: [1200, 600] },
  /** Guatapé: cerca de madera y escalones subiendo la loma. */
  cercaYEscalones: { base: 'cerca-y-escalones', anchos: [1200, 600] },
} as const satisfies Record<string, FuenteFoto>;

/**
 * Fondos de la portada.
 *
 * Se van pasando detrás del texto. Son municipios colombianos reales y ese es
 * el punto: el fondo de la página es el territorio que la herramienta protege,
 * no un degradado.
 */
export const FONDOS_PORTADA = [
  FOTOS.laderaViviendas,
  FOTOS.montanaEntreNubes,
  FOTOS.casaEnLadera,
  FOTOS.caminoEntreArboles,
] as const;

/** Fondos de las secciones oscuras interiores de la portada. */
export const FONDOS_SECCION = [FOTOS.bosqueCocora, FOTOS.ovejasLadera] as const;

/**
 * Fondo de página por ruta: lo que se ve a los lados de la columna de contenido
 * en una pantalla ancha.
 *
 * Cada vista tiene el suyo, y no por capricho: cuando todas comparten el mismo
 * fondo, moverse entre pantallas se siente como si la página no hubiera
 * cambiado. Un fondo distinto por sección le da a cada una su sitio.
 *
 * Los pares se escogen por **textura**, no por detalle. El velo las atenúa
 * mucho, así que sirven los paisajes abiertos y estorban los que tienen un
 * punto de interés que pide atención. Y todos usan fotos con variante de
 * 1200px: una de 800 estirada a pantalla completa se ve sucia incluso detrás
 * del velo.
 *
 * La clave es el prefijo de la ruta, así que `/reporte/RPT-2026-...` cae en
 * `/reporte`.
 */
export const FONDOS_POR_RUTA: Record<string, readonly FuenteFoto[]> = {
  '/': [FOTOS.puebloJerico, FOTOS.municipioAereo],
  '/entrar': [FOTOS.casaBlancaMontanas, FOTOS.cercaYEscalones],
  '/inicio': [FOTOS.viaRuralVerde, FOTOS.caminoEntreArboles],
  '/reportar': [FOTOS.laderaNubes, FOTOS.montanaEntreNubes],
  '/mis-reportes': [FOTOS.caminoEntreArboles, FOTOS.casaEnLadera],
  '/reporte': [FOTOS.laderaViviendas, FOTOS.casaEnLadera],
  '/ayudas': [FOTOS.ganadoPastizal, FOTOS.ovejasLadera],
  '/alertas': [FOTOS.montanasNubladas, FOTOS.bosqueCocora],
  '/gestor': [FOTOS.municipioAereo, FOTOS.puebloJerico],
  '/rescatista': [FOTOS.cercaYEscalones, FOTOS.casaEnLadera],
  '/rescatista/censo': [FOTOS.casaBlancaMontanas, FOTOS.viaRuralVerde],
  '/socorro': [FOTOS.montanasNubladas, FOTOS.laderaNubes],
  '/socorro/incidente': [FOTOS.viaRuralVerde, FOTOS.montanaEntreNubes],
  '/socorro/evaluacion': [FOTOS.casaEnLadera, FOTOS.laderaViviendas],
};

/** Si una ruta nueva todavía no tiene su par asignado, no se queda en blanco. */
export const FONDO_POR_DEFECTO: readonly FuenteFoto[] = [
  FOTOS.bosqueCocora,
  FOTOS.montanasNubladas,
];

/**
 * Resuelve el fondo de una ruta, tomando la coincidencia más específica.
 *
 * `/rescatista/censo` tiene el suyo y no hereda el de `/rescatista`, que sería
 * lo que pasaría con una comparación de prefijo ingenua.
 */
export function fondoDeRuta(pathname: string): readonly FuenteFoto[] {
  if (FONDOS_POR_RUTA[pathname]) {
    return FONDOS_POR_RUTA[pathname];
  }

  const coincidencia = Object.keys(FONDOS_POR_RUTA)
    .filter((ruta) => ruta !== '/' && pathname.startsWith(`${ruta}/`))
    .sort((a, b) => b.length - a.length)[0];

  return coincidencia ? FONDOS_POR_RUTA[coincidencia] : FONDO_POR_DEFECTO;
}
