# Acceso al entorno local en Docker — WhatsApp Bots Platform (wabots)

Documento de handoff para otro agente. Describe cómo está levantado el stack en esta
máquina, cómo consultar sus datos (API y base de datos) y qué limitaciones tiene.

Verificado y funcionando el 2026-08-04.

---

## 1. Qué está corriendo

Stack definido en `docker-compose.local.yml` (archivo nuevo, derivado de
`docker-compose.server.yml`), con variables en `deploy/.env.local`.

| Contenedor | Imagen | Rol | Puerto en el host |
|---|---|---|---|
| `wabots-postgres` | `postgres:16-alpine` | Base de datos | `127.0.0.1:5434` → 5432 |
| `wabots-backend` | build de `./backend` | API NestJS + motor de flujos + WebSocket | `127.0.0.1:3000` |
| `wabots-frontend` | build de `./frontend` | Panel React servido por nginx (proxya `/api` y `/socket.io`) | `127.0.0.1:8090` |

Todo escucha **solo en loopback** (`127.0.0.1`), no está expuesto a la red.

Puertos elegidos así porque en esta máquina ya había otros contenedores ocupando
`5432` (`wabots_postgres`, del compose de desarrollo antiguo) y `5433` (`uoman-db`).
Esos dos contenedores viejos siguen arriba pero **no forman parte de este stack**.

### URLs

- Panel de administración: <http://localhost:8090>
- API (directa, sin nginx): <http://localhost:3000/api>
- Salud: `GET http://localhost:3000/api/health` → `{"ok":true}`

---

## 2. Credenciales

Definidas en `deploy/.env.local`. Son de uso local exclusivamente.

```
usuario:    admin
contraseña: Local_Admin_2026!
```

Postgres:

```
host: localhost   puerto: 5434
db:   wabots      usuario: wabots      contraseña: wabots_local_pass
DATABASE_URL (desde el host):
  postgresql://wabots:wabots_local_pass@localhost:5434/wabots?schema=public
```

El admin lo crea el propio backend al arrancar (`AdminSeedService`, seed idempotente
en `onApplicationBootstrap`). No hace falta ejecutar `npm run db:seed`.

---

## 3. Cómo consumir la API

Autenticación por JWT Bearer. Access token de 15 min, refresh de 7 días.

### 3.1 Login

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Local_Admin_2026!"}'
```

Respuesta: `{"data":{"accessToken":"...","refreshToken":"...", ...}}`.

Guardar el token en una variable:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Local_Admin_2026!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["accessToken"])')
```

### 3.2 Llamadas autenticadas

```bash
curl -s http://localhost:3000/api/auth/me            -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/api/tenants            -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:3000/api/admin/activity?limit=20" -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/api/admin/metering/summary    -H "Authorization: Bearer $TOKEN"
```

Todas las respuestas vienen envueltas en `{"data": ...}`.

### 3.3 Renovar / cerrar sesión

```bash
curl -s -X POST http://localhost:3000/api/auth/refresh \
  -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$REFRESH\"}"

curl -s -X POST http://localhost:3000/api/auth/logout -H "Authorization: Bearer $TOKEN"
```

### 3.4 ⚠️ Sesión única por usuario — leer antes de hacer login

El backend impone **una sola sesión activa por usuario, atada al dispositivo**. Si haces
login por API mientras alguien tiene el panel abierto, **la sesión del panel se cae** (y
viceversa: si luego alguien entra por el panel, tu token deja de valer). Cuando ya hay
una sesión activa, el login puede exigir `"force": true` en el cuerpo para desplazarla.

Además hay **bloqueo temporal por intentos fallidos** de login por usuario: no
iterar contraseñas.

Recomendación para trabajar en paralelo: si solo necesitas **leer** datos, usa Postgres
directamente (sección 4) en vez de la API, así no tocas la sesión de nadie.

### 3.5 Endpoints disponibles

Todos bajo el prefijo `/api`.

**Auth** — `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`

**Salud** — `GET /health`

**Empresas (tenants)**
```
GET|POST   /tenants
GET|PATCH|DELETE /tenants/:id
POST       /tenants/:id/activate
POST       /tenants/:id/suspend
POST       /tenants/:id/whatsapp/connect        (QR de Evolution)
GET        /tenants/:id/whatsapp/state
POST       /tenants/:id/channel/twilio | /channel/meta | /channel/reset
GET        /tenants/:tenantId/conversations
GET        /tenants/:tenantId/media
GET|POST   /tenants/:tenantId/integrations
```

**Flujos**
```
GET|POST   /flows
GET|PATCH|DELETE /flows/:id
GET        /flows/templates
POST       /flows/:id/simulate        (probador de chat)
POST       /flows/simulate-graph
POST       /flow-agent/build | /flow-agent/templates
```

**Conversaciones** — `GET /conversations/:id`

**Integraciones**
```
GET|POST   /integrations/ai/platform
GET|POST   /integrations/ai/tenant/:tenantId
PATCH|DELETE /integrations/:id
GET        /integrations/google/auth-url | /integrations/google/callback
POST       /integrations/google/service-account
POST       /integrations/gmail/agent/:tenantId
```

**Administración**
```
GET        /admin/activity
GET        /admin/logs
GET        /admin/calendar/events
GET        /admin/metering/summary | /provider-balance
GET        /admin/metering/tenant/:tenantId | /balance | /topups
POST       /admin/metering/tenant/:tenantId/topup
GET|DELETE /admin/preview-media
GET|DELETE /admin/preview-media/item
GET|POST   /admin/deepseek/accounts | /admin/deepseek/account
GET|POST   /admin/deepseek-panel/status | /login | /logout
```

**Webhooks entrantes** (los llama el proveedor de mensajería, no un cliente)
```
POST /webhooks/evolution/:webhookToken
GET|POST /webhooks/meta
POST /webhooks/twilio
```

**WebSocket** (Socket.IO) — `ws://localhost:8090/socket.io/` (nginx) o directo en
`ws://localhost:3000/socket.io/`. Se usa para el probador de chat en vivo, la consola
de actividad y el control de sesión.

---

## 4. Cómo consultar la base de datos

### Desde el host (psql instalado o vía el contenedor)

```bash
# Sin instalar nada: usa el psql del propio contenedor
docker exec -it wabots-postgres psql -U wabots -d wabots

# Una consulta puntual
docker exec wabots-postgres psql -U wabots -d wabots -c 'SELECT id, name, status FROM tenants;'
```

### Desde un cliente externo (DBeaver, TablePlus, psql local, Prisma Studio)

```
postgresql://wabots:wabots_local_pass@localhost:5434/wabots?schema=public
```

Para Prisma Studio (interfaz web sobre el esquema, requiere deps del backend instaladas):

```bash
cd backend
DATABASE_URL='postgresql://wabots:wabots_local_pass@localhost:5434/wabots?schema=public' \
  npx prisma studio      # abre http://localhost:5555
```

### Tablas (esquema `public`)

| Tabla | Contenido |
|---|---|
| `admin_users` | Cuentas de administración (hash argon2, versión de token, bloqueos de login) |
| `tenants` | Empresas cliente: estado, canal de WhatsApp, saldo, credenciales cifradas |
| `flows` | Grafos de nodos por empresa (JSON), cuál es el flujo activo |
| `conversations` | Conversaciones por teléfono/empresa, estado del recorrido en el flujo |
| `message_logs` | Mensajes entrantes/salientes |
| `media_files` | Adjuntos archivados (audios, imágenes) con su ruta en `data/preview-media` |
| `integrations` | Integraciones por empresa o de plataforma (LLMs, Google), secretos cifrados |
| `ai_usage_records` | Consumo de IA (tokens/costo) por empresa |
| `credit_topups` | Recargas de saldo prepago |
| `reminders` | Recordatorios / seguimientos programados |
| `event_logs` | Eventos del sistema para la consola de actividad |
| `deepseek_accounts`, `deepseek_sessions`, `deepseek_messages` | Sesión de DeepSeek-web (bearer/cookies cifrados) |
| `_prisma_migrations` | Historial de migraciones aplicadas por Prisma |

El esquema autoritativo está en `backend/prisma/schema.prisma`.

> Los campos de secretos (API keys, tokens de canal, credenciales de Google) están
> **cifrados con AES-256-GCM** usando `ENCRYPTION_KEY` de `deploy/.env.local`. Leerlos
> por SQL devuelve el ciphertext; para verlos en claro hay que pasar por la app.

---

## 5. Estado actual de los datos

La base se creó vacía en este arranque: el único registro es el usuario `admin`.
`tenants`, `flows` y `conversations` están en 0. Para ver la aplicación con datos hay
que crear una empresa y un flujo desde el panel o por API.

---

## 6. Operación del stack

Desde `/Users/brusly/Repositorios/wabots`:

```bash
# Estado
docker compose -f docker-compose.local.yml ps

# Logs
docker compose -f docker-compose.local.yml logs -f wabots-backend
docker logs --tail 100 wabots-backend

# Parar / arrancar (conserva datos)
docker compose -f docker-compose.local.yml stop
docker compose -f docker-compose.local.yml up -d

# Reconstruir tras cambiar código
docker compose -f docker-compose.local.yml up -d --build

# Borrar TODO incluida la base de datos
docker compose -f docker-compose.local.yml down -v
```

Volúmenes: `wabots_wabots_local_pgdata` (datos de Postgres) y `wabots_wabots_local_models`
(modelos offline Whisper/Tesseract, para no redescargarlos). La media archivada se
monta en la carpeta del host `./data/preview-media`.

El backend ejecuta `npx prisma migrate deploy` en cada arranque, así que las migraciones
se aplican solas. Su healthcheck consulta `/api/health`: si la BD se cae, el contenedor
aparece `unhealthy` en `docker ps`.

---

## 7. Limitaciones de este entorno local

1. **Sin canal de WhatsApp real.** `EVOLUTION_API_URL` y `EVOLUTION_API_KEY` están vacías
   en `deploy/.env.local`. El panel y la API funcionan completos, pero conectar un número
   (QR de Evolution) fallará hasta que se apunten a una instancia de Evolution API.
   Alternativa: descomentar el servicio `evolution-api` de `docker-compose.yml`.
2. **Webhooks entrantes no alcanzables desde internet.** `PUBLIC_BACKEND_URL` es
   `http://localhost:3000`; haría falta un túnel (ngrok/cloudflared) para recibir
   webhooks de un proveedor real.
3. **Sin daemon de DeepSeek-web.** El servicio `wabots-deepseek-daemon` del compose de
   servidor se omitió a propósito: exige un perfil de Chromium ya logueado a mano en
   una máquina con pantalla. Los nodos de IA que usen DeepSeek-web no funcionarán; los
   que usen API keys (OpenAI, Anthropic, Google, DeepSeek API) sí, configurándolas en
   `/api/integrations/ai/platform`.
4. **Sin Redis y sin el servicio de backup.** No los necesita el stack para arrancar.
5. **`NODE_ENV=production`** dentro del contenedor (la imagen es la de producción). Para
   desarrollo con hot-reload sigue sirviendo `npm run dev` en el host contra
   `npm run db:up`.

---

## 8. Referencias en el repo

- `docker-compose.local.yml` — este stack.
- `deploy/.env.local` — variables y credenciales locales.
- `docker-compose.server.yml` — despliegue de servidor (Traefik, red `edge`, backups, DeepSeek).
- `docker-compose.yml` — solo Postgres + Redis, para desarrollo en el host.
- `ARCHITECTURE.md` — módulos, motor de flujos y topología.
- `README.md` — puesta en marcha nativa y tabla de variables de entorno.
- `ERRORS.md` — contrato de errores de la API.
- `backend/prisma/schema.prisma` — esquema de datos autoritativo.
