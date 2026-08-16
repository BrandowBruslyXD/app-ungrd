import axios from 'axios';

/**
 * Extrae un mensaje legible de un error, con soporte para errores de axios:
 * incluye el status HTTP y el payload de la respuesta cuando existen.
 * Para errores comunes devuelve `Error.message` o el valor serializado.
 */
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return `${err.response?.status ?? ''} ${JSON.stringify(err.response?.data ?? err.message)}`;
  }
  return err instanceof Error ? err.message : String(err);
}
