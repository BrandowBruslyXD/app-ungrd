/**
 * Cómo se le habla a un servicio que no es nuestro.
 *
 * Todo lo de este archivo existe por una sola regla del proyecto: **nada se
 * rompe por un servicio ajeno**. NASA, USGS o GDACS pueden estar caídos, lentos
 * o devolver una página de error de su proxy en vez de JSON, y el panel del
 * gestor tiene que seguir en pie. Por eso aquí no se lanza ninguna excepción
 * hacia arriba: el fallo se convierte en «no hay dato», y quien llama esconde
 * su bloque.
 *
 * El silencio es deliberado. Quien consume esto solo necesita saber si hay dato
 * o no; distinguir entre «se cayó la red» y «el JSON venía mal» no cambia lo que
 * ve el gestor, y un mensaje técnico en pantalla durante una emergencia es ruido.
 */

/**
 * Un servicio ajeno que tarde más de esto se da por perdido.
 *
 * Cinco segundos es corto a propósito: el panel se abre en una sala de crisis y
 * un bloque secundario no puede retener la pantalla. Si el satélite tarda, el
 * bloque desaparece y el resto del panel ya está trabajando.
 */
export const TIEMPO_LIMITE_MS = 5000;

/**
 * Pide JSON a un servicio externo y devuelve `null` ante cualquier problema.
 *
 * Devuelve `unknown` y no un genérico: lo que llega de afuera no está tipado por
 * el hecho de escribir un tipo, así que cada cliente lo valida campo a campo con
 * los guardas de abajo. Un `as T` aquí sería mentirle al compilador.
 *
 * @param url Dirección del servicio.
 * @param senalExterna Cancelación de quien llama, por ejemplo al desmontar el
 *   componente. Se suma al tiempo límite propio, no lo reemplaza.
 */
export async function pedirJson(url: string, senalExterna?: AbortSignal): Promise<unknown> {
  if (senalExterna?.aborted) return null;

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);
  const propagarCancelacion = (): void => control.abort();
  senalExterna?.addEventListener('abort', propagarCancelacion);

  try {
    const respuesta = await fetch(url, {
      signal: control.signal,
      headers: { Accept: 'application/json' },
    });
    if (!respuesta.ok) return null;
    // Un 200 no garantiza JSON: un proxy intermedio puede devolver HTML.
    return await respuesta.json();
  } catch {
    return null;
  } finally {
    clearTimeout(temporizador);
    senalExterna?.removeEventListener('abort', propagarCancelacion);
  }
}

/** Cierto cuando el valor es un objeto plano al que se le pueden leer campos. */
export function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** El valor como número finito, o `null` si no lo es. `NaN` e infinito no pasan. */
export function numeroDe(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

/** El valor como texto no vacío, ya recortado, o `null`. */
export function textoDe(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const recortado = valor.trim();
  return recortado.length > 0 ? recortado : null;
}
