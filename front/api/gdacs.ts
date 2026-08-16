/**
 * Proxy de GDACS.
 *
 * Existe por una sola razón: GDACS responde 200 con JSON válido pero **no manda
 * `access-control-allow-origin`**, comprobado contra el servicio real, así que el
 * navegador bloquea la llamada directa. Esta función la hace desde el servidor y
 * reemite el mismo JSON con la cabecera puesta.
 *
 * En desarrollo esta ruta no la sirve esta función sino el proxy de
 * `vite.config.ts`, apuntando al mismo servicio. Por eso aquí **no se filtra ni
 * se transforma nada**: si este proxy recortara la respuesta, `npm run dev` y
 * producción devolverían cosas distintas y el filtro por Colombia dejaría de
 * probarse hasta el despliegue. El recorte lo hace el cliente, en
 * `src/lib/observacion/gdacs.ts`.
 *
 * Se ejecuta en el runtime de borde para no depender de los tipos de Node: el
 * proyecto no instala dependencias nuevas.
 */

export const config = { runtime: 'edge' };

/**
 * Listado de eventos activos de GDACS: sismo, ciclón, inundación, volcán, sequía
 * e incendio.
 *
 * La misma dirección está repetida en `vite.config.ts` para el proxy de
 * desarrollo. Se duplica a propósito: importarla desde `src` metería código de
 * la aplicación dentro de la función desplegada.
 */
const URL_GDACS =
  'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ;TC;FL;VO;DR;WF';

/** El mismo tope que el cliente. Un bloque secundario no retiene la pantalla. */
const TIEMPO_LIMITE_MS = 5000;

/**
 * Cabeceras comunes de la respuesta.
 *
 * El caché compartido de cinco minutos no es cosmético: GDACS publica alertas
 * cada varios minutos y la respuesta pesa unos 140 KB. Sin caché, cada gestor que
 * abre el panel paga esa descarga y el servicio ajeno recibe una petición
 * gratuita de más.
 */
const CABECERAS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
};

/** Colección vacía: lo que se devuelve cuando GDACS no está disponible. */
const SIN_EVENTOS = JSON.stringify({ type: 'FeatureCollection', features: [] });

/**
 * Reemite el listado de GDACS con CORS.
 *
 * Ante cualquier fallo del servicio responde `502` con una colección vacía en vez
 * de propagar el error: el cliente convierte todo fallo en lista vacía y esconde
 * el bloque. El código 502 se conserva para que el fallo siga siendo visible en
 * los registros del despliegue; lo que no puede es llegar a la pantalla.
 */
export default async function handler(peticion: Request): Promise<Response> {
  if (peticion.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CABECERAS });
  }

  if (peticion.method !== 'GET') {
    return new Response(SIN_EVENTOS, { status: 405, headers: CABECERAS });
  }

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);

  try {
    const respuesta = await fetch(URL_GDACS, {
      signal: control.signal,
      headers: { Accept: 'application/json' },
    });

    if (!respuesta.ok) {
      return new Response(SIN_EVENTOS, { status: 502, headers: CABECERAS });
    }

    // Se reemite el texto tal cual y no `respuesta.json()`: reserializar 140 KB
    // no aporta nada, y si GDACS devolviera algo ilegible el cliente ya lo
    // descarta al validarlo campo a campo.
    return new Response(await respuesta.text(), { status: 200, headers: CABECERAS });
  } catch {
    // Red caída o tiempo agotado. No se filtra el detalle: el mensaje interno de
    // un servicio ajeno no tiene por qué salir de aquí.
    return new Response(SIN_EVENTOS, { status: 502, headers: CABECERAS });
  } finally {
    clearTimeout(temporizador);
  }
}
