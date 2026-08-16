# Catálogo de errores de la API

Referencia para devs: formato de error, semántica de cada código HTTP y los
errores concretos que emite cada módulo. La fuente de verdad del FORMATO es
`backend/src/common/filters/all-exceptions.filter.ts` (filtro global).

## Formato de respuesta de error

Toda la API responde errores con un JSON consistente:

```json
{ "statusCode": 400, "code": "VALIDATION_ERROR", "message": "Descripción clara del problema", "error": "Bad Request" }
```

- `statusCode` — código HTTP (también va en la cabecera de la respuesta).
- `code` — **código ESTABLE de máquina** (fuente: `backend/src/common/errors/error-codes.ts`).
  El `message` puede cambiar de redacción; el `code` no. Decidir SIEMPRE por
  `code` (o `statusCode`), nunca parseando el texto. Todo error lleva uno: el
  específico si el módulo lo define, o el genérico de su status
  (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
  `RATE_LIMITED`, `INTERNAL`, `UNAVAILABLE`).
- `message` — texto accionable en español. En errores de validación de DTOs
  (class-validator) es un **array de strings**, uno por campo inválido.
- `error` — nombre estándar del código (lo agrega Nest; puede no venir en
  errores con payload personalizado).
- Algunos errores agregan **campos extra** (documentados abajo, p. ej. el 409
  de sesión única trae `activeSession`).

**Regla de oro (seguridad):** los 500 NUNCA exponen detalles internos. El
stack completo queda en el log del servidor; el cliente recibe siempre:

```json
{ "statusCode": 500, "message": "Error interno del servidor" }
```

## Semántica de códigos

| Código | Cuándo | Qué hacer como dev |
|---|---|---|
| 400 | Body/params inválidos (DTO), reglas de negocio incumplidas | Leer `message` (array si es validación); corregir el request |
| 401 | Sin token, token expirado/inválido, sesión revocada/reemplazada, credenciales malas | Redirigir a login; si venía de refresh, la sesión murió de verdad |
| 403 | Rol insuficiente, o el recurso pertenece a OTRA empresa | No reintentar: es un límite de autorización |
| 404 | Recurso inexistente (o token de webhook inválido) | Verificar el id/ruta |
| 409 | Conflicto de estado — hoy solo: ya hay sesión activa en otro dispositivo | Ofrecer `force: true` en el login (expulsa a la otra) |
| 429 | Rate-limit por IP (global 300/min; login más estricto) o cuenta bloqueada por intentos fallidos | Respetar el tiempo indicado en `message`; backoff |
| 503 | `GET /api/health` cuando la BD no responde | El servicio está caído: alertar/esperar |
| 500 | Error no controlado | Mensaje genérico a propósito; buscar detalle en logs del servidor |

## Errores por módulo (mensajes literales o su patrón)

### Auth (`/api/auth/*`) — con códigos ESPECÍFICOS
| HTTP | `code` | Mensaje | Causa |
|---|---|---|---|
| 401 | `AUTH_BAD_CREDENTIALS` | `Credenciales inválidas` | Usuario inexistente/inactivo o contraseña incorrecta (mismo mensaje a propósito: no revela cuál) |
| 401 | `AUTH_REFRESH_INVALID` | `Refresh token inválido o expirado` / `Tipo de token inválido` | JWT de refresh no verifica, o se envió un access donde va el refresh |
| 401 | `AUTH_SESSION_REVOKED` | `Sesión inválida o revocada` | tokenVersion/sessionId/dispositivo no coinciden (p. ej. la sesión fue reemplazada desde otro navegador) |
| 401 | `AUTH_SESSION_REUSE` | `Sesión revocada por reutilización de token` | Nonce de refresh viejo fuera de la ventana de gracia (60s) → posible token robado; se mata la sesión entera |
| 401 | `AUTH_SESSION_IDLE` | `Sesión cerrada por inactividad` | Sin actividad por más de `SESSION_IDLE_MINUTES` (15) |
| 409 | `AUTH_SESSION_CONFLICT` | `Ya hay una sesión activa en otro dispositivo` + `activeSession: { device, ip, since }` | Login sin `force` con sesión viva en otro dispositivo |
| 429 | `AUTH_LOCKED` | `Demasiados intentos fallidos. Espera N minuto(s)/segundos...` | Lockout con backoff creciente (5 fallos por tanda: 30s→2m→10m→30m→60m) |

Los 401 del guard de rutas protegidas (token de acceso vencido/ausente) usan
el genérico `UNAUTHORIZED`.

### Empresas (`/api/tenants/*`)
| Código | Mensaje | Causa |
|---|---|---|
| 404 | `Empresa ... no encontrada` | id inexistente |
| 400 | slug/datos inválidos | Reglas del DTO o slug duplicado |

### Flujos (`/api/flows/*`)
| Código | Patrón de mensaje | Causa |
|---|---|---|
| 400 | `El flujo debe tener exactamente un nodo trigger`, `Nodo X: ...`, `Arista rota ...` (11 validaciones) | Validación estructural del grafo al guardar/activar |
| 404 | `Flujo ... no encontrado` | id inexistente |

### WhatsApp / canal (`/api/whatsapp/*`, webhooks)
| Código | Mensaje | Causa |
|---|---|---|
| 404 | `Empresa/instancia ... no encontrada` (7 variantes) | Tenant sin instancia, instancia sin QR, etc. |
| 404 | `Webhook token inválido` | POST a `/webhooks/evolution/:token` con token que no existe (respuesta idéntica a ruta inexistente: no filtra qué tokens son válidos) |

### Integraciones (`/api/integrations/*`, OAuth, service account)
| Código | Mensaje | Causa |
|---|---|---|
| 403 | `La integración no pertenece a esta empresa` | Intento de usar el `integrationId` de otro tenant (aislamiento multi-tenant) |
| 404 | `Integración ... no encontrada` | id inexistente |
| 400 | JSON de service account inválido, faltan campos OAuth, etc. | Config malformada |

### Metering / crédito (`/api/admin/metering/*`)
| Código | Mensaje | Causa |
|---|---|---|
| 400 | `El monto de la recarga debe ser mayor a 0` | Top-up inválido |

### Salud (`/api/health`)
| Código | Mensaje | Causa |
|---|---|---|
| 503 | `BD no disponible` | Postgres no contesta el ping |

## Errores del MOTOR de flujos (no son HTTP)

Los errores en tiempo de conversación (nodo falla, LLM caído, adjunto
indescargable, saldo agotado, empresa suspendida) **no se devuelven por la
API**: se enrutan a la rama `onError` del nodo (o cortan la conversación con
el mensaje genérico del bot) y quedan auditados en `EventLog` (visor de logs
del panel). Mensajes internos típicos (visibles en logs, nunca al cliente
final): `Saldo de IA agotado para el tenant ...`, `La empresa está
desactivada: consumo de IA bloqueado ...`, `No se pudo descargar el
adjunto ...`, `El servidor está procesando muchos audios/imágenes a la vez ...`.

## Convención para errores nuevos

1. Lanzar SIEMPRE la excepción HTTP de Nest que corresponda (`BadRequest…`,
   `NotFound…`, etc.) con mensaje en español, claro y accionable.
2. Nunca incluir en `message` datos internos (ids de otra empresa, stack,
   SQL, rutas de disco, claves).
3. Si el front necesita datos estructurados, pasarlos como payload extra del
   constructor (patrón `activeSession` del 409).
4. Si el front/consumidor necesita DISTINGUIR la causa dentro de un mismo
   status, definir un código específico en `error-codes.ts` y pasarlo en el
   payload: `throw new UnauthorizedException({ message, code: ErrorCode.X })`.
   Si no, el filtro global asigna el genérico del status automáticamente.
5. Documentar el error nuevo en este archivo.
