# Control del proyecto — ConectaRiesgoAI

> El tablero del PMO. Aquí se ve **qué bloquea**, **qué se decidió** y **qué falta**.
> Si alguien pregunta "¿en qué vamos?", la respuesta está en este archivo.

**Última actualización:** 15 de agosto de 2026

---

## 🔴 Bloqueantes — lo que hay que resolver ya

Cada uno de estos frena a varias personas.

| # | Qué | Quién lo destraba | Frena a |
|:---|:---|:---|:---|
| B1 | **Roles sin repartir.** 22 de 25 issues sin dueño | PMO | **Todo el equipo** |
| B2 | **`front/` son solo carpetas vacías** (`.gitkeep`, issue #33): falta el proyecto React real. El backend ya existe — PR #34 compila y pasa 5/5 tests | Frontend | Todas las pantallas |
| B3 | ~~Sin PostgreSQL en la nube~~ → **resuelto**: Azure Database for PostgreSQL Flexible Server en `conectariesgoai-rg` (región `brazilsouth`) | Infra | — |
| B4 | **Sin MapKey de NASA** | PMO | Verificación satelital |
| B5 | **CodeRabbit no está instalado.** El `.coderabbit.yaml` está en `main`, pero la app de GitHub no. Cero comentarios en los PRs #31, #32, #34 y #35 | PMO — **solo el dueño puede** | Revisión automática |

> **B1 sigue siendo el que más cuesta.** Mientras nadie sepa qué le toca, hay gente esperando en vez de construir.

---

## 🔑 Credenciales — estado

Todas gratuitas. **El repositorio es público: ninguna se escribe en el código.**

| Servicio | Para qué | Costo | Dónde se pide | Estado |
|:---|:---|:---|:---|:---|
| **NASA FIRMS** | Verificación satelital | Gratis | `firms.modaps.eosdis.nasa.gov/api/area/` — llega al correo en minutos | ⬜ |
| **PostgreSQL** | Base de datos | Burstable B1ms (bajo costo, no gratis) | Azure Database for PostgreSQL Flexible Server, suscripción de Azure del equipo | ✅ |
| **Cloudinary** | Fotos | Gratis | `cloudinary.com` | ⬜ |
| **Bluesky** | Monitoreo de redes | Gratis | Cuenta normal + **contraseña de aplicación** | ⬜ |
| **SECOP** | Contratos públicos | Gratis | No requiere clave | ✅ |
| **X / Twitter** | Monitoreo de redes | **~USD 100+/mes** | — | ❌ Descartado |

**Cómo se comparten:** por el grupo privado. El backend tiene
[`appsettings.Development.example.json`](../back/src/ConectaRiesgoAI.Api/appsettings.Development.example.json)
y el frontend [`front/.env.example`](../front/.env.example), ambos con valores falsos.

---

## 📋 Decisiones tomadas

Se anotan para no volver a discutir lo mismo a las 3 de la mañana.

| # | Decisión | Por qué |
|:---|:---|:---|
| D1 | **Stack: React + .NET 10 + PostgreSQL** | Lo definió el PMO. .NET pesa más al arrancar, pero el backend lo domina |
| D10 | **Backend con arquitectura Vertical Slice**, no capas `Api/Domain/Infrastructure` | Propuesta de Jason en su PR de herramientas. Un caso de uso vive completo en su carpeta y se lee sin saltar entre proyectos — en un hackatón eso vale más que la pureza de capas. Detalle en `CLAUDE.md` |
| D11 | **Se adoptan las skills y agentes de Claude** que trajo Jason | Codifican el criterio de revisión para que no dependa de quién tenga tiempo a la hora 17 |
| D12 | **Sí se usa MediatR** | Lo preguntó Jhon en el PR #34, porque `CLAUDE.md` decía «ni un mediator si no está pagando su coste». Paga su coste: el `ValidationBehavior` valida toda petición sin que haya que acordarse de invocar el validador en cada endpoint — ese olvido es un agujero de seguridad clásico. `CLAUDE.md` queda corregido para que no haya contradicción |
| D13 | **El proyecto se llama ConectaRiesgoAI** | El nombre anterior era «RespondeYA» y cambió al definir la estructura, pero la documentación quedó a medias: ocho archivos seguían con el nombre viejo. Unificado |
| D14 | **Las carpetas son `back/` y `front/`**, no `backend/` y `frontend/` | Igual que arriba: la documentación citaba rutas que ya no existían |
| D15 | **Backend en Azure Container Apps + Azure Database for PostgreSQL Flexible Server** (región `brazilsouth`), no en Railway/Render ni Neon como se sugería antes | El App Service Plan chocó con cuota de cómputo en 0 en la suscripción (`Intelapps Subscription`); Container Apps usa cuota de consumo y no tuvo ese problema. Se aprovecha la suscripción de Azure ya disponible. Cada push a `main` que toca `back/` se despliega solo vía `deploy-backend.yml` (GitHub Actions + Azure Container Registry) |
| D2 | **Sin monitoreo de X** | Buscar publicaciones dejó de ser gratis. Se usa Bluesky, que sí lo es |
| D3 | **Integraciones como clientes HTTP internos** en `back/src/ConectaRiesgoAI.Api/Integrations/` | Detalle en `docs/ARQUITECTURA.md`. ⚠️ **Sin ejecutar todavía:** ya existen microservicios reales en `servicios/` (`ms-satelital`, `ms-transparencia`, `ms-social`) que cubren esto mismo — falta decidir si se migran a `Integrations/` o si esta decisión se revierte |
| D4 | **Sin panel de administrador** (pantalla 6) | No aporta al pitch y cuesta horas |
| D5 | **Sin modo offline** en el hackathon | 5-6 horas de trabajo y es lo que más fácil se rompe en vivo. Se muestra el indicador y se cuenta como visión |
| D6 | **Registro de damnificados en Fase 3** | La Fase 1 sola ya es demostrable. Empezar por lo grande es apostar todo |
| D7 | **Sin PostGIS** | Haversine en C# alcanza y ahorra una hora de pelear con extensiones |
| D8 | **Una aprobación de cualquiera** para hacer merge | Un PR bloqueado es tiempo muerto. Solo no se vale autoaprobarse |
| D9 | **Respaldo de SECOP** marcado como no real | `datos.gov.co` estuvo caído. Mostrarlo como real sería engañar al jurado |

---

## ⚠️ Riesgos

| # | Riesgo | Qué tan probable | Qué hacer |
|:---|:---|:---|:---|
| R1 | **SECOP caído en la demo** | Alta — ya pasó | Respaldo activo y **decirlo en el pitch** |
| R2 | **No llega la MapKey de NASA** | Media | El bloque satelital se oculta solo. No rompe nada |
| R3 | **El backend no llega a tiempo** | Media | El frontend trabaja con datos falsos desde el arranque |
| R4 | **Se cae el wifi del evento** | Alta | **Video de la demo grabado.** Innegociable |
| R5 | **Alguien sube una credencial** | Media | Repo público: quedaría expuesta. Casilla en la plantilla de PR |
| R6 | **Meter funcionalidades tarde** | Alta | Congelación en la hora 16, sin excepciones |
| R7 | **Datos personales reales en la demo** | Media | Solo datos inventados. Nunca una cédula real |

---

## 🕳️ Huecos detectados en la auditoría

Encontrados al revisar el plan. **Sin issue creado todavía.**

| # | Hueco | Gravedad |
|:---|:---|:---|
| H1 | **No hay pantalla de login/registro** en el frontend. Sin ella no hay sesión, sin sesión no hay rol, y sin rol el panel del gestor es inalcanzable | 🔴 |
| H2 | **El rol de Mapas tiene una sola tarea.** Esa persona quedaría desocupada mientras backend carga con 4 issues P0 | 🔴 |
| H3 | **`Integrations/Nasa` e `Integrations/Secop` no existen en `back/`** — la funcionalidad ya está en `servicios/ms-satelital` y `servicios/ms-transparencia`, pero nadie tiene asignado decidir si se migran o si D3 se revierte | 🟠 |
| H4 | **El monitoreo social no tiene issue** — está construido pero invisible en el tablero | 🟠 |
| H5 | **No hay issue de tramitar credenciales**, y bloquea a otros | 🟠 |
| H6 | **#9 (fotos) está etiquetado backend** pero el trabajo real es del frontend | 🟡 |

---

## 📊 Estado por área

| Área | Issues | Con dueño |
|:---|:---:|:---:|
| Backend | 7 | 0 |
| Frontend | 7 | 0 |
| Datos | 3 | 0 |
| Infra | 3 | 0 |
| Mapas | 1 | 0 |
| PMO | 5 | 3 |

---

## ✅ Lo que ya está hecho y verificado

Para no perder de vista que sí hay avance:

- **Repositorio** público, con `main` protegida y 25 issues en 7 hitos
- **Contrato de API** escrito, con endpoints y ejemplos listos para copiar
- **Modelo de datos** definido, incluyendo el registro de damnificados
- **Backend base en .NET 10** con PR #34: slice vertical con MediatR, EF Core + PostgreSQL,
  autenticación JWT y la primera migración (`Usuario`, `Reporte`, `EventoCronologia`)
- **Tres microservicios de integración** compilando con 0 errores y 0 advertencias en `servicios/`:
  `ms-transparencia` (probado con SECOP caído, devuelve el respaldo marcado), `ms-social` (acierta
  los 8 casos de prueba del clasificador) y `ms-satelital` (responde correctamente sin
  credenciales) — ver D3/H3: falta decidir si se quedan aquí o migran a `back/.../Integrations/`
- **CodeRabbit** configurado (falta que el dueño instale la app de GitHub)
- **Plantillas de issues** aportadas por Jason, aprobadas

---

## Cómo mantener esto vivo

No sirve de nada si queda desactualizado. **Se toca en tres momentos:**

1. Cuando se **destraba un bloqueante** → se marca y se avisa al grupo
2. Cuando se **toma una decisión** → se anota con su porqué, para no repetir la discusión
3. Al **cerrar cada fase** → se actualiza el semáforo en `FASES.md`

Es responsabilidad del PMO. Toma dos minutos y evita la pregunta constante de "¿en qué vamos?".
