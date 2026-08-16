const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

/** Cuerpo de error del backend, tal como lo define el contrato de API. */
export interface ApiError {
  error: string;
  detalles: Record<string, string> | null;
}

/** Una llamada lenta se corta aquí. Ver la nota de `apiFetch` sobre por qué. */
const TIEMPO_LIMITE_MS = 15000;

/**
 * Error de una llamada al backend.
 *
 * `message` va en lenguaje comprensible porque termina en pantalla; el estado y
 * los detalles por campo viajan aparte para que quien llama pueda reaccionar sin
 * tener que interpretar el texto.
 */
export class ErrorApi extends Error {
  /** Código HTTP, o 0 si la petición nunca llegó a completarse. */
  readonly estado: number;

  /** Errores por campo cuando el backend rechaza la validación. */
  readonly detalles: Record<string, string> | null;

  /** Cierto cuando falló la red o se agotó el tiempo, no el servidor. */
  readonly esFalloDeRed: boolean;

  /** Construye el error a partir de lo que se pudo averiguar de la respuesta. */
  constructor(
    mensaje: string,
    estado: number,
    detalles: Record<string, string> | null = null,
    esFalloDeRed = false
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.detalles = detalles;
    this.esFalloDeRed = esFalloDeRed;
  }
}

/** Traduce un código HTTP a algo que una persona en emergencia pueda entender. */
function mensajePorEstado(estado: number): string {
  if (estado === 401 || estado === 403) return 'Tu sesión no es válida. Vuelve a iniciar sesión.';
  if (estado === 404) return 'No encontramos lo que buscabas.';
  if (estado === 409) return 'Ese dato ya estaba registrado.';
  if (estado === 413) return 'El archivo pesa demasiado. Intenta con una foto más liviana.';
  if (estado >= 500) return 'El servicio no está respondiendo. Inténtalo de nuevo en un momento.';
  return 'No pudimos completar la operación. Revisa los datos e inténtalo otra vez.';
}

/**
 * Llama al backend y devuelve el cuerpo ya tipado.
 *
 * Lleva tiempo límite a propósito: quien usa esta app suele estar con mala señal,
 * y un `fetch` sin cortar se queda colgado para siempre mostrando un cargador que
 * nunca termina. Es preferible fallar con un mensaje claro y dejar reintentar.
 *
 * Cualquier fallo sale como `ErrorApi`, incluido el de red, para que quien llama
 * tenga un solo tipo que atrapar.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: init?.signal ?? control.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch (causa) {
    // Sin respuesta: o se agotó el tiempo, o no hay conexión.
    const abortado = causa instanceof DOMException && causa.name === 'AbortError';
    throw new ErrorApi(
      abortado
        ? 'La conexión está tardando demasiado. Revisa tu señal e inténtalo otra vez.'
        : 'No hay conexión con el servidor. Revisa tu internet e inténtalo otra vez.',
      0,
      null,
      true
    );
  } finally {
    clearTimeout(temporizador);
  }

  if (!response.ok) {
    // El cuerpo puede no ser JSON —un 502 del proxy devuelve HTML—, así que
    // nunca se da por hecho que se puede leer.
    const cuerpo = (await response.json().catch(() => null)) as ApiError | null;
    throw new ErrorApi(
      cuerpo?.error || mensajePorEstado(response.status),
      response.status,
      cuerpo?.detalles ?? null
    );
  }

  // 204 y 205 no traen cuerpo: pedirles JSON revienta.
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
