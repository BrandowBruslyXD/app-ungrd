import { isAxiosError } from 'axios';

/**
 * Reintentos con BACKOFF EXPONENCIAL + JITTER para llamadas a servicios
 * externos (Evolution, LLMs). Solo reintenta errores TRANSITORIOS; un 4xx
 * (salvo 429) es definitivo y se propaga de inmediato.
 *
 * Nota sobre envíos de mensajes: si la respuesta se pierde tras un envío que
 * sí entró (timeout), el reintento puede duplicar el mensaje. Se asume: para
 * un bot, un duplicado ocasional es mejor que un mensaje perdido.
 */

/** ¿Error que vale la pena reintentar? Red caída/timeout, 429 o 5xx. */
export function isTransientHttpError(err: unknown): boolean {
  if (isAxiosError(err)) {
    if (err.response) {
      const s = err.response.status;
      return s === 429 || s === 500 || s === 502 || s === 503 || s === 504;
    }
    // Sin respuesta = error de red (ECONNRESET, ETIMEDOUT, ECONNREFUSED...).
    return true;
  }
  return false;
}

export interface RetryOptions {
  /** Reintentos ADICIONALES al primer intento (default 2). */
  retries?: number;
  /** Espera base del backoff en ms (default 300; 300 → 600 → 1200). */
  baseDelayMs?: number;
  /** Tope de espera entre intentos (default 3000 ms). */
  maxDelayMs?: number;
  /** Decide si un error amerita reintento (default: isTransientHttpError). */
  shouldRetry?: (err: unknown) => boolean;
  /** Hook de observabilidad por reintento (para loguear con contexto). */
  onRetry?: (attempt: number, err: unknown) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const base = opts.baseDelayMs ?? 300;
  const max = opts.maxDelayMs ?? 3000;
  const shouldRetry = opts.shouldRetry ?? isTransientHttpError;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !shouldRetry(err)) throw err;
      opts.onRetry?.(attempt + 1, err);
      // Jitter (±50%) para no sincronizar reintentos de varias conversaciones.
      const delay = Math.min(max, base * 2 ** attempt) * (0.5 + Math.random());
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
