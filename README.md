# ConectaRiesgoAI

Plataforma ciudadana de gestión de emergencias. Una persona reporta lo que está pasando —una inundación, un incendio, una vía caída— y recibe un código con el que puede seguir su reporte hasta que alguien lo atiende.

Lo que nos diferencia es cerrar el ciclo: **reporte → verificación satelital → asignación → atención → confirmación**, y mostrar de paso cuánto ha invertido la alcaldía en prevenir justamente eso, con datos abiertos del SECOP.

## Estructura

```
back/     API en .NET 10 (slice vertical + PostgreSQL)
front/    Aplicación React 18 + Vite + TypeScript
docs/     Documentación del proyecto
```

## Requisitos

- .NET 10 SDK
- Node 20+
- Docker (para PostgreSQL en local)

## Cómo correr

```bash
# Solo la primera vez: configuración local
cp back/src/ConectaRiesgoAI.Api/appsettings.Development.example.json \
   back/src/ConectaRiesgoAI.Api/appsettings.Development.json

docker compose up -d                                   # base de datos
dotnet ef database update --project back/src/ConectaRiesgoAI.Api
dotnet run --project back/src/ConectaRiesgoAI.Api      # API  → localhost:5000
npm install --prefix front && npm run dev --prefix front  # web → localhost:5173
```

Para confirmar que la API quedó arriba: `curl http://localhost:5000/health` debe responder `200`.

## Usuarios de demo

En Development, la primera vez que arranca la API con la tabla `usuarios` vacía, se siembran tres
cuentas —una por rol— para poder probar login sin pasar por `/api/auth/registro`:

| Rol | Email | Password |
|:---|:---|:---|
| Ciudadano | `ciudadano@conectariesgoai.com` | `Demo1234!` |
| Gestor | `gestor@conectariesgoai.com` | `Demo1234!` |
| Admin | `admin@conectariesgoai.com` | `Demo1234!` |

Probar con `POST http://localhost:5000/api/auth/login` (o desde `/swagger`):

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "gestor@conectariesgoai.com", "password": "Demo1234!" }'
```

## Documentación

| Documento | Para qué |
|:---|:---|
| [ARQUITECTURA.md](docs/ARQUITECTURA.md) | dónde va cada archivo y por qué |
| [CONTRATO-API.md](docs/CONTRATO-API.md) | qué devuelve cada endpoint — fuente de verdad entre back y front |
| [idea-negocio/](docs/idea-negocio/) | la investigación que originó el proyecto |

> **Antes de escribir código, lee `ARQUITECTURA.md`.** Son cinco minutos y evitan que terminemos con cinco formas distintas de hacer lo mismo.
