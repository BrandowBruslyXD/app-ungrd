# ConectaRiesgoAI

Plataforma ciudadana de gestión de emergencias. Una persona reporta lo que está pasando —una inundación, un incendio, una vía caída— y recibe un código con el que puede seguir su reporte hasta que alguien lo atiende.

Lo que nos diferencia es cerrar el ciclo: **reporte → verificación satelital → asignación → atención → confirmación**, y mostrar de paso cuánto ha invertido la alcaldía en prevenir justamente eso, con datos abiertos del SECOP.

## Estructura

```
back/       API en .NET 10 (slice vertical + PostgreSQL)
front/      Aplicación React 18 + Vite + TypeScript
servicios/  ms-bot-api: puente temporal del bot de WhatsApp, corre aparte en un VPS
infra/      Scripts de aprovisionamiento de infraestructura
docs/       Documentación del proyecto
```

## Requisitos

- .NET 10 SDK
- Node 20+
- Docker (para PostgreSQL y Azurite en local)

## Cómo correr

```bash
# Solo la primera vez: configuración local
cp back/src/ConectaRiesgoAI.Api/appsettings.Development.example.json \
   back/src/ConectaRiesgoAI.Api/appsettings.Development.json

docker compose up -d                    # base de datos + Azurite (emulador de Azure Blob Storage)
dotnet ef database update --project back/src/ConectaRiesgoAI.Api
dotnet run --project back/src/ConectaRiesgoAI.Api      # API  → localhost:5000
npm install --prefix front && npm run dev --prefix front  # web → localhost:5173
```

Para confirmar que la API quedó arriba: `curl http://localhost:5000/health` debe responder `200`.

## Ambientes

| Ambiente | URL |
|:---|:---|
| Backend (producción) | https://conectariesgoai-api.delightfulsand-f3f95f4d.brazilsouth.azurecontainerapps.io |
| Frontend (producción) | `conectariesgoai.vercel.app` — el issue #33 (front sin inicializar) está **cerrado**; el front ya tiene siete features construidas (`auth`, `reportes`, `gestor`, `rescatista`, `socorro`, `ungrd`, `publico`). Ver [docs/EXPERIENCIAS-FRONTEND.md](docs/EXPERIENCIAS-FRONTEND.md#despliegue) |

El backend corre en Azure Container Apps (`conectariesgoai-rg`, región `brazilsouth`) con
PostgreSQL en Azure Database for PostgreSQL Flexible Server. Cada push a `main` que toque `back/`
dispara [`deploy-backend.yml`](.github/workflows/deploy-backend.yml), que reconstruye la imagen y
la despliega automáticamente.

## Usuarios de demo

La migración inicial siembra tres cuentas —una por rol— para poder probar login sin pasar por
`/api/auth/registro` (que solo crea Ciudadanos). Quedan en la base en cuanto corrés
`dotnet ef database update`:

| Rol | Email | Password |
|:---|:---|:---|
| Ciudadano | `ciudadano@conectariesgoai.demo` | `Demo1234!` |
| Gestor | `gestor@conectariesgoai.demo` | `Demo1234!` |
| Admin | `admin@conectariesgoai.demo` | `Demo1234!` |

Probar con `POST http://localhost:5000/api/auth/login` (o desde `/swagger`):

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "gestor@conectariesgoai.demo", "password": "Demo1234!" }'
```

## Documentación

El índice completo de los documentos de `docs/` — arquitectura, contrato de API, modelo de
datos, fases, control del proyecto, bots y más — vive en **[docs/README.md](docs/README.md)**, con
una fila por documento y a quién le sirve cada uno. Empieza ahí.

> **Antes de escribir código, lee `docs/ARQUITECTURA.md`.** Son cinco minutos y evitan que terminemos con cinco formas distintas de hacer lo mismo.
