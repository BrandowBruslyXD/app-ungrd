/**
 * CÓDIGOS DE ERROR estables de la API (campo `code` del JSON de error).
 *
 * Contrato para devs/integraciones: el `message` puede cambiar de redacción,
 * el `code` NO. El front y los consumidores deben decidir por `code` (o por
 * `statusCode`), nunca parseando el texto.
 *
 * Dos niveles:
 *  - Códigos GENÉRICOS por status (fallback automático en el filtro global):
 *    cualquier error sin código explícito recibe el de su status.
 *  - Códigos ESPECÍFICOS donde distinguir la causa importa (hoy: auth, cuyos
 *    ocho 401 significan cosas muy distintas para el front).
 *
 * Catálogo completo y documentación: ERRORS.md (raíz del repo).
 */
export enum ErrorCode {
  // ── Genéricos por status (fallback) ──
  VALIDATION_ERROR = 'VALIDATION_ERROR', // 400
  UNAUTHORIZED = 'UNAUTHORIZED', // 401
  FORBIDDEN = 'FORBIDDEN', // 403
  NOT_FOUND = 'NOT_FOUND', // 404
  CONFLICT = 'CONFLICT', // 409
  RATE_LIMITED = 'RATE_LIMITED', // 429
  INTERNAL = 'INTERNAL', // 500
  UNAVAILABLE = 'UNAVAILABLE', // 503

  // ── Auth (específicos) ──
  AUTH_BAD_CREDENTIALS = 'AUTH_BAD_CREDENTIALS', // usuario/contraseña inválidos
  AUTH_LOCKED = 'AUTH_LOCKED', // cuenta penalizada por intentos fallidos
  AUTH_SESSION_CONFLICT = 'AUTH_SESSION_CONFLICT', // ya hay sesión en otro dispositivo (409)
  AUTH_REFRESH_INVALID = 'AUTH_REFRESH_INVALID', // refresh token no verifica / tipo incorrecto
  AUTH_SESSION_REVOKED = 'AUTH_SESSION_REVOKED', // sesión reemplazada o inválida
  AUTH_SESSION_REUSE = 'AUTH_SESSION_REUSE', // nonce reutilizado → sesión matada por seguridad
  AUTH_SESSION_IDLE = 'AUTH_SESSION_IDLE', // cierre por inactividad
}

/** Código genérico según el status HTTP (fallback del filtro global). */
export function defaultCodeForStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.VALIDATION_ERROR;
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.FORBIDDEN;
    case 404:
      return ErrorCode.NOT_FOUND;
    case 409:
      return ErrorCode.CONFLICT;
    case 429:
      return ErrorCode.RATE_LIMITED;
    case 503:
      return ErrorCode.UNAVAILABLE;
    default:
      return status >= 500 ? ErrorCode.INTERNAL : ErrorCode.VALIDATION_ERROR;
  }
}
