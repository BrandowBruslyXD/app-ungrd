/**
 * Cliente HTTP único contra el backend.
 *
 * Todo fallo —red caída, tiempo agotado, 500 con HTML de un proxy— sale de aquí convertido en un
 * `ErrorApi`. La pantalla decide qué texto mostrarle a la persona a partir de `estado`; `mensaje`
 * es técnico y solo sirve para el log.
 */

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

/** Tiempo máximo de espera de una petición antes de abortarla. */
export const TIEMPO_LIMITE_MS = 10_000;

/** No hubo respuesta del servidor: red caída, DNS, CORS o servidor apagado. */
export const ESTADO_SIN_CONEXION = 0;

/** La petición se abortó por superar el tiempo límite. */
export const ESTADO_TIEMPO_AGOTADO = 408;

/** La respuesta llegó, pero no era el JSON que el contrato promete. */
export const ESTADO_RESPUESTA_ILEGIBLE = 502;

/** Forma del error que define el contrato de API. */
export interface RespuestaError {
  error: string;
  detalles: Record<string, string> | null;
}

/**
 * @deprecated Usar `ErrorApi`. Se conserva el nombre para no romper importaciones existentes.
 */
export type ApiError = RespuestaError;

/**
 * Único error que sale de esta capa.
 *
 * `estado` es el código HTTP, o uno de los sintéticos de arriba cuando el fallo ocurrió antes de
 * tener respuesta.
 */
export class ErrorApi extends Error {
  readonly estado: number;
  readonly mensaje: string;
  readonly detalles: Record<string, string> | null;

  constructor(estado: number, mensaje: string, detalles: Record<string, string> | null = null) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.mensaje = mensaje;
    this.detalles = detalles;
  }
}

/** Discrimina un `ErrorApi` de cualquier otra cosa capturada en un `catch`. */
export function esErrorApi(valor: unknown): valor is ErrorApi {
  return valor instanceof ErrorApi;
}

const CLAVE_TOKEN = 'conectariesgo.token';

/**
 * El token se guarda también en memoria porque `localStorage` lanza en Safari privado y en algunos
 * WebView; ahí la sesión dura lo que dure la pestaña, pero la app no se cae.
 */
let tokenEnMemoria: string | null = null;

/** Guarda el token de sesión para las siguientes peticiones. */
export function guardarToken(token: string): void {
  tokenEnMemoria = token;
  try {
    window.localStorage.setItem(CLAVE_TOKEN, token);
  } catch {
    // Almacenamiento no disponible: seguimos con el token en memoria.
  }
}

/** Devuelve el token de sesión, o `null` si no hay sesión iniciada. */
export function obtenerToken(): string | null {
  if (tokenEnMemoria !== null) {
    return tokenEnMemoria;
  }
  try {
    return window.localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

/** Borra el token de sesión. */
export function limpiarToken(): void {
  tokenEnMemoria = null;
  try {
    window.localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // Nada que borrar si el almacenamiento no está disponible.
  }
}

/** Opciones extra de `apiFetch`, además de las de `fetch`. */
export interface OpcionesPeticion extends RequestInit {
  /** Sobrescribe el tiempo límite por defecto. */
  tiempoLimiteMs?: number;
}

function construirCabeceras(init: RequestInit): Headers {
  const cabeceras = new Headers(init.headers);
  if (!cabeceras.has('Content-Type')) {
    cabeceras.set('Content-Type', 'application/json');
  }
  const token = obtenerToken();
  if (token !== null && token !== '') {
    cabeceras.set('Authorization', `Bearer ${token}`);
  }
  return cabeceras;
}

async function leerTexto(respuesta: Response): Promise<string> {
  try {
    return await respuesta.text();
  } catch {
    return '';
  }
}

function interpretarError(texto: string, estado: number): ErrorApi {
  let cuerpo: unknown = null;
  try {
    cuerpo = JSON.parse(texto) as unknown;
  } catch {
    // El servidor no respondió JSON: casi siempre HTML de un proxy o de un 502.
  }

  if (typeof cuerpo === 'object' && cuerpo !== null) {
    const posible = cuerpo as Partial<RespuestaError>;
    if (typeof posible.error === 'string') {
      const detalles =
        typeof posible.detalles === 'object' && posible.detalles !== null ? posible.detalles : null;
      return new ErrorApi(estado, posible.error, detalles);
    }
  }

  return new ErrorApi(estado, `El servidor respondió ${estado} sin un cuerpo de error legible`);
}

/**
 * Hace una petición al backend y devuelve el JSON ya tipado.
 *
 * @throws {ErrorApi} siempre que la petición no termine en 2xx con JSON válido.
 */
export async function apiFetch<T>(path: string, init: OpcionesPeticion = {}): Promise<T> {
  const { tiempoLimiteMs = TIEMPO_LIMITE_MS, ...resto } = init;
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), tiempoLimiteMs);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_BASE_URL}${path}`, {
      ...resto,
      signal: controlador.signal,
      headers: construirCabeceras(resto),
    });
  } catch (causa) {
    if (controlador.signal.aborted) {
      throw new ErrorApi(
        ESTADO_TIEMPO_AGOTADO,
        `La petición a ${path} superó los ${tiempoLimiteMs} ms`,
      );
    }
    const detalle = causa instanceof Error ? causa.message : 'fallo de red desconocido';
    throw new ErrorApi(ESTADO_SIN_CONEXION, `No hubo respuesta del servidor en ${path}: ${detalle}`);
  } finally {
    clearTimeout(temporizador);
  }

  const texto = await leerTexto(respuesta);

  if (!respuesta.ok) {
    throw interpretarError(texto, respuesta.status);
  }

  if (texto.trim() === '') {
    return undefined as T;
  }

  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new ErrorApi(
      ESTADO_RESPUESTA_ILEGIBLE,
      `La respuesta de ${path} no es JSON válido`,
    );
  }
}
