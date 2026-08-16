# Control del proyecto — ConectaRiesgo

> El tablero del PMO. Aquí se ve **qué bloquea**, **qué se decidió** y **qué falta**.
> Si alguien pregunta "¿en qué vamos?", la respuesta está en este archivo.

**Última actualización:** 15 de agosto de 2026

---

## 🔴 Bloqueantes — lo que hay que resolver ya

| # | Qué | Quién lo destraba | Frena a |
|:---|:---|:---|:---|
| B1 | **Azure sigue sin verificarse.** El PR #73 arregla la causa (las migraciones no se aplicaban), pero nadie con permisos ha confirmado que `GET /api/reportes` responda 200 tras el despliegue | Quien tenga acceso a la suscripción | La demo con datos reales |
| B2 | **El frontend no consume la API.** Las pantallas están construidas pero leen de mocks y `localStorage` | Frontend | El ciclo completo en vivo |
| B3 | **El bot escribe en `ms-bot-api`**, no en el backend. Los endpoints de ingesta ya existen: falta cambiar la URL en el flujo y añadir el host a `HTTP_NODE_ALLOWED_HOSTS` | Quien opere wabots | Un solo origen de datos |
| B4 | **Sin MapKey de NASA** | PMO | Verificación satelital |
| B5 | **CodeRabbit no está instalado.** El `.coderabbit.yaml` está en `main`, la app de GitHub no | Dueño del repo — **solo él puede** | Revisión automática |

> **Resueltos:** ~~roles sin repartir~~ · ~~`front/` vacío~~ · ~~sin PostgreSQL en la nube~~ · ~~el backend sin casos de uso~~

---

## 🔑 Credenciales — estado

Todas gratuitas. **El repositorio es público: ninguna se escribe en el código.**

| Servicio | Para qué | Costo | Dónde se pide | Estado |
|:---|:---|:---|:---|:---|
| **NASA FIRMS** | Verificación satelital | Gratis | `firms.modaps.eosdis.nasa.gov/api/area/` — llega al correo en minutos | ⬜ |
| **PostgreSQL** | Base de datos | Burstable B1ms (bajo costo, no gratis) | Azure Database for PostgreSQL Flexible Server, suscripción de Azure del equipo | ✅ |
| **Cloudinary** | Fotos (subida desde el frontend, `CONTRATO-API.md` sección 2) | Gratis | `cloudinary.com` | ⬜ |
| **Azure Blob Storage** | Fotos (subida desde el backend, `POST /api/evidencias`, issue #47) | Bajo costo (Standard_LRS) | `infra/aprovisionar-storage.sh` — ya en la suscripción de Azure del equipo | ✅ |
| **Bluesky** | Monitoreo de redes | Gratis | Cuenta normal + **contraseña de aplicación** | ⬜ |
| **SECOP** | Contratos públicos | Gratis | No requiere clave | ✅ |
| **X / Twitter** | Monitoreo de redes | **~USD 100+/mes** | — | ❌ Descartado |

**Cómo se comparten:** por el grupo privado. El backend tiene
[`appsettings.Development.example.json`](../back/src/ConectaRiesgoAI.Api/appsettings.Development.example.json),
el frontend [`front/.env.example`](../front/.env.example), y cada microservicio en `servicios/` su
propio `appsettings.Example.json` — todos con valores falsos.

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
| D4 | **Sin panel de administrador** (pantalla 6) | No aporta al pitch y cuesta horas. ⚠️ **En revisión:** la entrevista con la ingeniera de la UNGRD cambió el argumento — el panel de reparto sectorial sí aporta, y mucho. Ver D15 |
| D15 | **Reparto sectorial a ministerios: diseño aprobado, construcción pendiente de decisión** | El dolor real de la UNGRD es repartir la información entre ministerios, hoy a mano y con un mes de demora. Diseño completo y nueve decisiones tomadas en `docs/REPARTO-SECTORIAL.md`: envío de correo **simulado**, entregable **PDF + CSV**, aprobación **humana** obligatoria, ministerios que **no entran al sistema**, tres fuentes con nivel de confianza visible, clasificación determinista primero, agrupación por evento, trece sectores del formato oficial FR-1703-SMD-09, correos falsos en la demo. **Falta decidir si desplaza a la Fase 1 como diferenciador del pitch** — ver `FASES.md`, Fase 3.5 |
| D5 | **Sin modo offline** en el hackathon | 5-6 horas de trabajo y es lo que más fácil se rompe en vivo. Se muestra el indicador y se cuenta como visión |
| D6 | **Registro de damnificados en Fase 3** | La Fase 1 sola ya es demostrable. Empezar por lo grande es apostar todo |
| D7 | **Sin PostGIS** | Haversine en C# alcanza y ahorra una hora de pelear con extensiones |
| D8 | **Una aprobación de cualquiera** para hacer merge | Un PR bloqueado es tiempo muerto. Solo no se vale autoaprobarse |
| D16 | **Las migraciones se aplican al arrancar la app**, no en el workflow | Producción estuvo caída sin que nadie lo notara: `/health` respondía 200 porque no toca la base, y todo lo demás daba 500 con "relation reportes does not exist". Aplicarlas al arrancar cubre cualquier despliegue, venga de donde venga |
| D17 | **Se amplía `TipoReporte` con Sismo, Vendaval y AvenidaTorrencial** | El agente telefónico los dicta y devolvían 500. Y como el nodo HTTP del bot no distingue un 500 de un éxito, respondía "su reporte quedó registrado" sin guardar nada |
| D18 | **WhatsApp por Meta Cloud API, no por Evolution** | Baileys no soporta botones ni ubicación nativa, y se cae cada pocas semanas. Meta sí. Evolution queda como respaldo |
| D19 | **Un bifurcador reparte los webhooks de Meta por `phone_number_id`** | Una app de Meta tiene un solo webhook y el número está prestado por otro cliente. El bifurcador desvía solo el número de prueba y ante cualquier duda manda a producción del cliente |
| D9 | **Respaldo de SECOP** marcado como no real | `datos.gov.co` estuvo caído. Mostrarlo como real sería engañar al jurado |
| D16 | **Backfill de `Reporte.Clase = AfectacionPropia`** para los reportes previos a la migración `AgregaCamposParaWhatsapp` | Es una suposición, no un dato real: no hay forma de saber retroactivamente si esos reportes eran un aviso sobre un evento o una afectación propia. Quien construya reportes o filtros por `Clase` debe saber que los históricos están adivinados |
| D17 | **Azure Blob Storage además de Cloudinary, no en reemplazo** — `POST /api/evidencias` sube server-side a dos contenedores privados (`evidencias`, `censo`) con URL firmada. Coexiste con el flujo Cloudinary client-side de `CONTRATO-API.md` sección 2; no se tocó ese endpoint | Issue #47: Azure Container Apps no tiene disco persistente, y las fotos del censo (documentos, rostros) necesitan un contenedor con la protección más alta de la Ley 1581. Unificar ambos flujos de subida queda para cuando exista `CrearReporte` |
| D18 | **`GET /api/ingesta/reportes/{codigo}` devuelve `200` siempre**, con `estado: "No encontrado"` para códigos inexistentes | El bot de WhatsApp no diferencia `200`/`404` con ramas de código; tratar ambos casos como texto simplifica la lógica del bot y elimina una clase de error en producción |
| D19 | **Índice único sobre `verificaciones_satelitales.ReporteId`** (migración `IndiceUnicoVerificacionSatelitalPorReporte`, PR #68) | Dos consultas simultáneas del detalle podían duplicar la verificación y gastar doble cuota del MAP_KEY (B4). La tabla está vacía hoy, así que el índice aplica sin limpieza; si aparecieran duplicados históricos en otro ambiente, habría que depurarlos antes de aplicar la migración |

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
| R8 | **El panel de reparto sectorial se come el tiempo de la Fase 1** | Alta | Es más grande que el censo de damnificados, que ya era lo primero que se corta. Se construye **solo la pantalla del paquete del ministerio** y el resto se cuenta como lo que sigue. Ver `FASES.md`, Fase 3.5 |
| R9 | **Presentar el envío de correo como real** | Media | Es simulado. Se marca en la interfaz y se dice en el pitch, igual que el respaldo de SECOP (D9). Si el jurado lo descubre, cuesta más que reconocerlo |
| R10 | **Enviar un correo de prueba a un ministerio de verdad** | Baja | Los correos de destino son configurables y en la demo son `@ejemplo.gov.co`. Ninguna dirección real en el código ni en los datos sembrados |

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
| ~~H6~~ | ~~#9 (fotos) está etiquetado backend pero el trabajo real es del frontend~~ → **resuelto**: #9 se cerró documentado como cubierto por `CrearReporte` + `POST /api/evidencias` (issue #47/PR #51); lo que queda es conectar el formulario del issue #12 a ese endpoint | — |

---

## 📊 Dónde está cada canal

| Canal | Estado | Escribe en |
|:---|:---|:---|
| **WhatsApp (Evolution)** | ✅ Probado de punta a punta | `ms-bot-api` |
| **WhatsApp (Meta Cloud API)** | ✅ Con botones nativos y ubicación por pin | `ms-bot-api` |
| **Llamada telefónica (Dapta)** | ✅ Funcionando | `ms-bot-api` |
| **App web** | 🟡 Pantallas construidas, sin conectar | mocks + `localStorage` |
| **Backend .NET** | 🟡 14 endpoints, desplegado, **Azure sin verificar** | PostgreSQL en Azure |

> **Los tres canales conversacionales escriben en la API puente, no en la base real.** Es lo último que falta para que el dato viva en un solo lugar.

---

## ✅ Lo que ya está hecho y verificado

**Los tres canales conversacionales funcionan de punta a punta:**

- **WhatsApp por Meta** — botones nativos, listas desplegables, ubicación por pin del mapa, y la IA entendiendo lenguaje libre (*"se me metió el agua a media pared"* → clasifica y ubica)
- **WhatsApp por Evolution** — el mismo flujo, como respaldo
- **Llamada telefónica** — agente de voz con transferencia por riesgo vital

**El riesgo de vida no depende de la IA.** Falló una vez en pruebas —"hay una señora atrapada" no disparó la transferencia— y ahora corta por un patrón determinístico de 20 palabras, sin llamar al modelo. Verificado en tres escenarios, incluido que no dispare de más.

**Backend:** 14 endpoints en 8 rebanadas, migraciones aplicándose solas, y una colección de Postman con 28 peticiones encadenadas (**62 de 69 aserciones pasan**).

**Frontend:** 8 áreas funcionales más el módulo de censo EDAN, con los tipos ya alineados al contrato.

**Documentación:** el sistema real de reportes de Colombia investigado con fuentes oficiales — formatos EDAN, campos del RUD, cadena CMGRD→CDGRD→UNGRD.

---

## Cómo mantener esto vivo

No sirve de nada si queda desactualizado. **Se toca en tres momentos:**

1. Cuando se **destraba un bloqueante** → se marca y se avisa al grupo
2. Cuando se **toma una decisión** → se anota con su porqué, para no repetir la discusión
3. Al **cerrar cada fase** → se actualiza el semáforo en `FASES.md`

Es responsabilidad del PMO. Toma dos minutos y evita la pregunta constante de "¿en qué vamos?".
