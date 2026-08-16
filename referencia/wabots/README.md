# WhatsApp Bots Platform

Plataforma multi-tenant para crear y administrar bots de WhatsApp mediante un editor
visual de flujos por nodos. Cada empresa cliente se ejecuta de forma aislada, con su
propio canal de mensajería, integraciones y consumo de IA medido por separado.

La descripción del sistema, sus módulos y diagramas están en [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Capacidades

- **Editor de flujos por nodos**: disparadores, mensajes, menús interactivos, lógica,
  captura y validación de datos, e integraciones — con probador de chat en vivo.
- **Agente de IA por nodo**: LLM configurable (OpenAI, Anthropic, DeepSeek, Google) con
  memoria conversacional y salida por intención para enganchar sub-flujos.
- **Multicanal**: Evolution API (instancia por empresa) o Twilio (número por empresa).
- **Media offline (sin costo de tokens)**: audio→texto (Whisper), imagen→texto (OCR),
  traducción (NLLB).
- **Google**: agendamiento en Calendar (OAuth o cuenta de servicio) y gestión de Gmail.
- **Medición y saldo**: consumo de IA por empresa, saldo prepago y corte por saldo.
- **Panel de administración** con gestión de empresas, calendario y consola de actividad.

## Requisitos

- Node.js 20+
- PostgreSQL 15+ (o Docker)
- Una instancia de Evolution API o una cuenta de Twilio para el canal de WhatsApp

## Estructura

```
backend/    API NestJS + Prisma (motor de flujos, integraciones, auth)
frontend/   Panel de administración React + Vite
deploy/     Variables y artefactos de despliegue
```

## Puesta en marcha (local)

```bash
# 1. Dependencias
npm run install:all

# 2. Base de datos (Docker)
npm run db:up

# 3. Variables de entorno
cp backend/.env.example backend/.env
#    Edita al menos: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET,
#    ENCRYPTION_KEY (openssl rand -hex 32), ADMIN_USERNAME, ADMIN_PASSWORD.

# 4. Migraciones y admin inicial
cd backend
npm run prisma:generate
npm run prisma:migrate
cd ..

# 5. Backend + frontend
npm run dev
```

- Backend: `http://localhost:3000/api`
- Frontend: `http://localhost:5173`

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL |
| `JWT_SECRET` | Secreto del access token (≥ 32 caracteres) |
| `JWT_REFRESH_SECRET` | Secreto del refresh token, distinto del anterior |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Vigencia de access (p. ej. `15m`) y refresh (`7d`) |
| `ENCRYPTION_KEY` | Clave AES-256-GCM en 64 hex (32 bytes) para secretos en reposo |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Credenciales del admin inicial (seed idempotente) |
| `FRONTEND_URL` | Origen permitido para CORS y Socket.IO |
| `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` | Acceso a Evolution API |
| `PUBLIC_BACKEND_URL` | URL pública del backend para los webhooks |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | OAuth2 de Google |

El backend aborta el arranque si `JWT_SECRET`, `JWT_REFRESH_SECRET` o `ENCRYPTION_KEY`
faltan o son débiles.

## Seguridad

- Cuenta de administrador única por credenciales (sin registro público).
- Access token de vida corta + refresh token con renovación deslizante y revocación.
- **Sesión única por usuario** atada al dispositivo: iniciar sesión en otro equipo
  desconecta el anterior (con confirmación en el panel).
- **Bloqueo por intentos** de login por usuario, con penalización temporal.
- Rate limiting, Helmet, CORS restringido y validación estricta de entrada.
- Secretos (API keys, tokens, credenciales de canal y del grafo) cifrados en reposo.

## Scripts

| Comando | Acción |
|---------|--------|
| `npm run dev` | Backend y frontend en modo desarrollo |
| `npm run install:all` | Instala dependencias de ambos proyectos |
| `npm run db:up` | Levanta PostgreSQL con Docker |
| `backend: npm run prisma:migrate` | Aplica migraciones (desarrollo) |
| `backend: npm run build` | Compila el backend |
| `frontend: npm run build` | Compila el panel |

## Despliegue

Contenedores Docker Compose (frontend, backend, PostgreSQL) tras un proxy inverso.
El backend ejecuta `prisma migrate deploy` al iniciar. Configura las variables en
`deploy/.env.server` (ver `deploy/.env.server.example`). Detalle de la topología en
[`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Uso

1. Inicia sesión en el panel con el administrador del seed.
2. Crea una empresa y conéctale WhatsApp (QR de Evolution o número de Twilio).
3. Diseña su flujo en el editor de nodos y márcalo como flujo activo.
4. Activa el servicio: el bot responde mientras el tenant esté en estado `ACTIVE`.
5. Consulta el consumo de IA y el calendario de citas en el panel.
