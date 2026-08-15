# Arquitectura — ConectaRiesgoAI

> Este documento define **dónde va cada cosa**. Si tienes que decidir en qué carpeta poner un archivo y dudas, la respuesta está aquí. Si no está, avisa en el grupo y lo agregamos.
>
> El **qué** manda cada endpoint está en [CONTRATO-API.md](CONTRATO-API.md). Este documento es el **dónde**.

## Decisiones tomadas

| Área | Decisión |
|:---|:---|
| Repositorio | Monorepo: backend y frontend conviven en el mismo repo |
| Backend | .NET 10, Web API, **arquitectura de slice vertical** con MediatR |
| Base de datos | PostgreSQL + EF Core |
| Frontend | React 18 + Vite + TypeScript, organizado por features |
| Puerto backend | `http://localhost:5000` (según el contrato de API) |
| Puerto frontend | `http://localhost:5173` (Vite por defecto) |

---

## Estructura general

```
app-ungrd/
├─ back/     API en .NET 10
├─ front/    Aplicación React
└─ docs/     Documentación del proyecto
```

---

## Backend — slice vertical

La idea es simple: **cada endpoint vive en su propia carpeta, con todo lo que necesita adentro.** No hay capas Application/Domain/Infrastructure repartidas por todo el repo. Si trabajas en "crear reporte", abres una sola carpeta y ahí está todo.

```
back/
├─ src/
│  └─ ConectaRiesgoAI.Api/
│     ├─ Features/                      ← el corazón: una carpeta por endpoint
│     │  ├─ Auth/
│     │  │  ├─ Registro/
│     │  │  ├─ Login/
│     │  │  └─ ObtenerPerfil/
│     │  ├─ Reportes/
│     │  │  ├─ CrearReporte/
│     │  │  ├─ ListarReportes/
│     │  │  ├─ ObtenerReporte/
│     │  │  ├─ MisReportes/
│     │  │  └─ ActualizarEstado/
│     │  ├─ Estadisticas/
│     │  │  └─ ResumenEstadisticas/
│     │  ├─ Verificacion/
│     │  │  └─ VerificacionSatelital/
│     │  └─ Transparencia/
│     │     └─ ContratosSecop/
│     │
│     ├─ Domain/                        ← modelo compartido entre slices
│     │  ├─ Entities/                     Usuario, Reporte, EventoCronologia
│     │  ├─ Enums/                        Rol, Tipo, Estado, Prioridad
│     │  └─ ValueObjects/                 Ubicacion
│     │
│     ├─ Persistence/
│     │  ├─ Configurations/               IEntityTypeConfiguration<T>
│     │  └─ Migrations/                   generadas por dotnet ef
│     │
│     ├─ Common/                         ← lo transversal
│     │  ├─ Behaviors/                    pipeline de MediatR (validación)
│     │  ├─ Endpoints/                    IEndpoint + registro automático
│     │  ├─ Errors/                       forma única de error del contrato
│     │  ├─ Auth/                         JWT, políticas por rol
│     │  └─ Extensions/
│     │
│     ├─ Integrations/                   ← clientes de APIs externas
│     │  ├─ Nasa/                          NASA FIRMS
│     │  └─ Secop/                         datos.gov.co
│     │
│     └─ Properties/
│
└─ tests/
   └─ ConectaRiesgoAI.Api.Tests/
      └─ Features/
         ├─ Auth/
         └─ Reportes/
```

### Qué va dentro de un slice

Ejemplo con `Features/Reportes/CrearReporte/`. **Esta es la plantilla que se replica en todos los slices:**

| Archivo | Rol |
|:---|:---|
| `CrearReporteCommand.cs` | el request — `IRequest<CrearReporteResponse>` |
| `CrearReporteHandler.cs` | la lógica; habla directo con el `DbContext` |
| `CrearReporteValidator.cs` | FluentValidation; corre solo, en el pipeline |
| `CrearReporteEndpoint.cs` | el mapeo HTTP (ruta, verbo, rol requerido) |
| `CrearReporteResponse.cs` | el DTO de salida, con la forma exacta del contrato |

Las consultas usan `Query` en vez de `Command`: `ListarReportesQuery`, `ListarReportesHandler`, etc.

### Las dos reglas del slice

1. **Un slice nunca importa código de otro slice.** Si `ActualizarEstado` necesita algo que ya escribió `CrearReporte`, ese algo se sube a `Domain/`, `Common/` o `Persistence/`. Copiar tres líneas es mejor que acoplar dos slices.
2. **Lo que se repite en dos slices no se comparte todavía; en tres, sí.** Compartir demasiado temprano nos devuelve al enredo del que estamos huyendo.

### Dónde cae cada endpoint del contrato

| Endpoint | Slice |
|:---|:---|
| `POST /api/auth/registro` | `Features/Auth/Registro/` |
| `POST /api/auth/login` | `Features/Auth/Login/` |
| `GET /api/auth/yo` | `Features/Auth/ObtenerPerfil/` |
| `POST /api/reportes` | `Features/Reportes/CrearReporte/` |
| `GET /api/reportes` | `Features/Reportes/ListarReportes/` |
| `GET /api/reportes/{codigo}` | `Features/Reportes/ObtenerReporte/` |
| `GET /api/reportes/mios` | `Features/Reportes/MisReportes/` |
| `PATCH /api/reportes/{codigo}/estado` | `Features/Reportes/ActualizarEstado/` |
| `GET /api/estadisticas/resumen` | `Features/Estadisticas/ResumenEstadisticas/` |
| `GET /api/verificacion/satelital` | `Features/Verificacion/VerificacionSatelital/` |
| `GET /api/transparencia/secop` | `Features/Transparencia/ContratosSecop/` |

> `GET /api/reportes/{codigo}` compone su respuesta llamando a `Integrations/Nasa` y `Integrations/Secop`. Ambas con tiempo límite de 5 segundos y devolviendo `null` / `[]` si fallan — la pantalla de seguimiento **nunca** se cae por un servicio externo.

---

## Frontend — por features

La misma idea del backend: agrupar por lo que hace, no por lo que es.

```
front/
├─ public/
└─ src/
   ├─ api/               cliente HTTP + una función por endpoint
   ├─ mocks/             respuestas de ejemplo del CONTRATO-API
   ├─ features/
   │  ├─ auth/           login, registro, sesión
   │  ├─ reportes/       dashboard, reportar, seguimiento
   │  ├─ mapa/           mapa de riesgo
   │  ├─ gestor/         panel de la autoridad
   │  └─ admin/          panel de administración
   ├─ components/        UI compartida (layout, badges, botones)
   ├─ hooks/             hooks transversales
   ├─ lib/               utilidades
   ├─ types/             tipos espejo de los DTOs del backend
   └─ styles/
```

Cada feature tiene adentro `components/`, `hooks/` y `pages/`. Lo que usen dos features distintas sube a `src/components/` o `src/hooks/`.

### Dónde cae cada pantalla

| Pantalla | Ubicación |
|:---|:---|
| Login / Registro | `features/auth/pages/` |
| Dashboard ciudadano | `features/reportes/pages/` |
| Reportar emergencia | `features/reportes/pages/` |
| Seguimiento del reporte | `features/reportes/pages/` |
| Mapa de riesgo | `features/mapa/pages/` |
| Panel de gestor | `features/gestor/pages/` |
| Panel de administrador | `features/admin/pages/` |

### `src/mocks/` no es opcional

Ahí van los ejemplos de respuesta del contrato, copiados tal cual. El frontend construye contra ellos desde el minuto cero y cuando un endpoint queda listo solo se cambia el origen de datos en `src/api/`. **Nadie espera a nadie.**

---

## Cómo correr el proyecto

Requisitos: **.NET 10 SDK**, **Node 20+**, **Docker** (para PostgreSQL).

```bash
# 1. Configuración local (solo la primera vez)
cp back/src/ConectaRiesgoAI.Api/appsettings.Development.example.json \
   back/src/ConectaRiesgoAI.Api/appsettings.Development.json

# 2. Base de datos
docker compose up -d

# 3. Aplicar las migraciones (solo la primera vez y cuando alguien agregue una)
dotnet ef database update --project back/src/ConectaRiesgoAI.Api

# 4. Backend  → http://localhost:5000, Swagger en /swagger
dotnet run --project back/src/ConectaRiesgoAI.Api

# 5. Frontend → http://localhost:5173
npm install --prefix front
npm run dev --prefix front
```

Para comprobar que la API está viva sin depender de la base de datos: `GET http://localhost:5000/health`
(también responde en `/api/health`, para quien prefiera mantener todo bajo el prefijo del contrato).

Si cambias una entidad, genera la migración:

```bash
dotnet ef migrations add NombreDelCambio \
  --project back/src/ConectaRiesgoAI.Api \
  --output-dir Persistence/Migrations
```

## Variables de entorno

| Variable | Dónde | Para qué |
|:---|:---|:---|
| `ConnectionStrings__Postgres` | backend | conexión a PostgreSQL |
| `Jwt__Secret` | backend | firma de los tokens |
| `Nasa__ApiKey` | backend | NASA FIRMS |
| `Secop__AppToken` | backend | datos.gov.co (opcional, sube el límite de consultas) |
| `VITE_API_BASE_URL` | frontend | `http://localhost:5000/api` |

En el backend estas llaves viven en `appsettings.json` (vacías, es la plantilla) y se llenan en
`appsettings.Development.json` para local. Ese archivo trae valores de desarrollo que sirven tal cual:
la cadena de conexión que corresponde al `docker-compose.yml` y un secreto JWT de juguete.

**Nada de eso sirve fuera de local.** En despliegue se pasan como variables de entorno con doble guion
bajo (`ConnectionStrings__Postgres`, `Jwt__Secret`), que sobrescriben lo del archivo.

En el frontend, `VITE_API_BASE_URL` va en `.env.local`, que no se commitea.

---

## Pendientes de este documento

- **El nombre del producto está en disputa:** este repo y los namespaces dicen `ConectaRiesgoAI`; `CONTRATO-API.md` dice `RespondeYA`. Hay que cerrarlo en el grupo y que quede uno solo.
- Los enums de este documento siguen `CONTRATO-API.md` (`Incendio`, `Inundacion`, …), que difiere de las categorías de `investigacion/investigacion-uno.md` (`vivienda_albergue`, …). **Manda el contrato**, porque es lo que frontend y backend ya acordaron.
- Falta definir el despliegue (`docker-compose.yml` solo cubre la base de datos local).
