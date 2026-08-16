# CLAUDE.md — ConectaRiesgo

## Qué es este proyecto

**Aplicación web mobile-first** de gestión de desastres. El ciudadano reporta una emergencia con
foto, ubicación y descripción; recibe un código único y puede seguir su caso; la autoridad lo
atiende y **el ciudadano ve avanzar la cronología en tiempo real**:

```
Reportado → Verificado → Asignado → En atención → Atendido → Cerrado
```

Lo que nos diferencia de lo que ya existe (Yo Reporto de la UNGRD, Ideam en tu Mano) es que
**cerramos el ciclo**: seguimiento real, verificación satelital con NASA FIRMS y transparencia del
gasto público con SECOP. Nadie más conecta el reporte de una emergencia con el dinero que se
destinó a prevenirla.

**Qué construimos y qué no** está en [docs/FASES.md](docs/FASES.md). **En qué vamos y qué está
trabado**, en [docs/CONTROL.md](docs/CONTROL.md). Esos dos documentos mandan sobre cualquier idea
suelta.

Contexto original del problema: [docs/idea-negocio/](docs/idea-negocio/). Ojo: esos documentos son
de la exploración inicial, cuando el producto se pensaba como asistente por WhatsApp y con otro
nombre. **El producto es una app web y se llama ConectaRiesgo.**

Es un proyecto de **hackatón**: prioriza lo que se puede demostrar funcionando. Pragmatismo por
encima de ceremonia, pero sin renunciar a las reglas de abajo — están para que el código siga
siendo tocable cuando queden pocas horas.

**Los usuarios están en emergencia**, muchas veces con conexión mala y dispositivos limitados. Eso
no es color: es un requisito. Un flujo que solo funciona con buena red no sirve.

**Una cosa completa vale más que dos a medias.** Si a la hora 16 algo no está terminado, se corta y
se presenta lo que sí funciona de punta a punta.

---

## Stack y estructura

| Parte | Stack | Ubicación |
|---|---|---|
| Backend | .NET 8, **arquitectura Vertical Slice** | `backend/` |
| Frontend | React + TypeScript + Vite + Tailwind, **mobile-first** | `frontend/` |
| Microservicios de integración | .NET 8, minimal API | `servicios/` |
| Base de datos | PostgreSQL | — |
| Mapas | Leaflet + OpenStreetMap | — |

Idioma de todo: **español neutro** — documentación, comentarios, mensajes de commit, textos de
issues y de PR.

**Por qué hay microservicios aparte:** las integraciones externas (NASA FIRMS, SECOP, redes
sociales) viven en `servicios/` y no dentro de `backend/`, para que quien las construye no dependa
de que la estructura del backend esté lista. El backend las consume por HTTP. Si uno se cae, el
backend **oculta ese bloque** y sigue respondiendo — nunca propaga el error.

**Documentación de referencia:**

| Documento | Para qué |
|---|---|
| [docs/CONTRATO-API.md](docs/CONTRATO-API.md) | Endpoints, formas de JSON, códigos de error |
| [docs/MODELO-DATOS.md](docs/MODELO-DATOS.md) | Todas las entidades y campos |
| [docs/FASES.md](docs/FASES.md) | Qué se construye, en qué orden, qué se corta |
| [docs/CONTROL.md](docs/CONTROL.md) | Bloqueantes, decisiones, riesgos, credenciales |

---

## Arquitectura backend: Vertical Slice (no DDD, no capas)

La unidad de organización es el **caso de uso**, no la capa técnica.

```
backend/src/
  Features/
    <Feature>/                    # Reportes, Ayudas, Seguimiento, …
      <CasoDeUso>/                # CrearReporte, ListarReportes, AsignarAyuda, …
        <CasoDeUso>Endpoint.cs    # transporte: minimal API o controller delgado
        <CasoDeUso>Request.cs     # entrada (record inmutable)
        <CasoDeUso>Response.cs    # salida (record inmutable)
        <CasoDeUso>Handler.cs     # la lógica del caso de uso, de punta a punta
        <CasoDeUso>Validator.cs   # validación de entrada
      <Feature>Entity.cs          # modelo persistido compartido por la feature
  Shared/                         # transversal real: auth, errores, paginación, logging
  Infrastructure/                 # acceso a datos, clientes externos, wiring
  Program.cs
```

**Las reglas, en orden de importancia:**

1. **La rebanada es la unidad.** Un caso de uso vive completo en su carpeta: entrada, validación,
   lógica y acceso a datos. Se lee de arriba abajo sin saltar de proyecto en proyecto.
2. **Cero acoplamiento entre rebanadas.** Una rebanada no referencia tipos de otra. Si dos
   necesitan lo mismo: o se duplica (barato y explícito) o sube a `Shared/`.
3. **Duplicar está permitido; abstraer antes de tiempo, no.** La tercera repetición justifica
   extraer, no la segunda.
4. **`Shared/` no es un cajón de sastre.** Va lo genuinamente transversal: autenticación, manejo de
   errores HTTP, paginación, resultados, logging. Si algo en `Shared/` lo usa una sola rebanada, no
   pertenece ahí.
5. **El endpoint es delgado**: traduce HTTP ↔ handler y nada más.
6. **El handler es el dueño de la regla de negocio** del caso de uso. Si una invariante debe
   sostenerse en varias rebanadas, vive en la entidad de la feature.
7. **Sin capas fantasma.** No crees `Domain`/`Application`/`Infrastructure` dentro de una rebanada,
   ni repositorios genéricos, ni un mediator si no está pagando su coste.

La pregunta de revisión no es "¿respeta las capas?" sino **"¿esta rebanada se entiende sola?"** y
**"¿lo que subió a `Shared/` lo comparten de verdad varias?"**.

---

## Convenciones de código

### C#

- Un tipo público por archivo (helpers y tipos privados anidados, permitidos).
- Tipos explícitos; nada de `var` salvo proyecciones anónimas de LINQ. Los proyectos `.Tests` están
  exentos: ahí `var` es la convención.
- Campos privados `_camelCase`; clases, métodos y propiedades `PascalCase`.
- DTOs como `record` inmutables. Nunca expongas la entidad persistida en el contrato HTTP.
- Timestamps ISO-8601 en UTC.
- Documentación XML en español en todo tipo y miembro con lógica, sea cual sea su visibilidad.
  `/// <inheritdoc />` es forma válida y suficiente al implementar un contrato. `.Tests` exento.
  Ojo: el compilador no lo detecta — solo avisa de miembros públicamente visibles.
- Nombres de test: `[Método]_[Condición]_[ResultadoEsperado]`, estructura AAA.

### TypeScript / React

- TypeScript strict. **Nada de `any`.**
- Ningún texto de UI hardcodeado: todo por i18n.
- La lógica de negocio vive en hooks, no en componentes.
- Todo estado de carga y de error de una llamada a API se maneja explícitamente y se le muestra al
  usuario en lenguaje comprensible — sin jerga ni códigos.
- Accesibilidad y funcionamiento con conexión lenta o intermitente son criterios de aceptación, no
  mejoras opcionales.

### Seguridad (aplica a todo el código)

- **Pertenencia del dato:** quien consulta o modifica un reporte tiene que poder verlo. El
  identificador del solicitante sale del token, **nunca** del cliente.
- Endpoints autenticados por defecto; el acceso anónimo se justifica explícitamente por escrito.
- Validación de entrada siempre en el servidor. La del cliente es cortesía, no defensa.
- Secretos por variables de entorno o gestor de secretos. Nunca en el repo, nunca en el bundle del
  frontend.
- Los logs llevan identificadores, no contenido: la app maneja documentos de identidad, fotos,
  ubicación y datos de personas afectadas. Mínima recolección, y cuidado especial con lo que se
  envía a servicios de IA de terceros.
- Los errores que llegan al cliente no filtran stack traces ni detalles internos.
- Subida de archivos con límite de tamaño y de tipo. Llamadas externas siempre con timeout.

### Git

- Commits en imperativo, explicando **el porqué**, no el qué.
- Nunca commitear `.env`, `.env.local` ni credenciales.

---

## Herramientas del repositorio

**Skills** ([.claude/skills/](.claude/skills/)) — se invocan por nombre:

| Skill | Para qué |
|---|---|
| `audit-backend` | Auditar una rebanada o todo el backend: arquitectura, caminos de fallo, seguridad, tests |
| `audit-frontend` | Auditar el frontend: tipado, estado, datos, i18n, seguridad, accesibilidad, performance |
| `auditar-feature` | Verificar que lo que un issue declara corresponde con el código real |
| `crear-epica` | Entrevista guiada para convertir un requerimiento en issue épica |
| `consultar-issues` | Consultar y agrupar issues por categoría, estado, milestone |
| `pr-review-loop` | Abrir un PR y llevarlo hasta quedar sin observaciones (nunca mergea) |

**Agentes** ([.claude/agents/](.claude/agents/)) — se delegan según la tarea:
`backend-validation-specialist`, `backend-unit-test-specialist`, `api-design-specialist`,
`frontend-validation-specialist`, `frontend-unit-test-specialist`, `security-auditor`.

**Plantillas de GitHub** ([.github/](.github/)) — formularios de issue para épica, feature, bug y
deuda técnica. Una feature no se construye sin **criterios de aceptación verificables en Gherkin**,
y el escenario que **falla** es obligatorio, no solo el feliz. Verificable = puedes nombrar la
prueba que lo hace caer.

`gh` puede no estar en el PATH según la máquina. En Windows, invócalo por ruta completa:
`& "C:\Program Files\GitHub CLI\gh.exe"` (PowerShell) · `"/c/Program Files/GitHub CLI/gh.exe"` (Bash).

---

## Cómo se trabaja

`main` está **protegida**: no se hace push directo. Todo entra por Pull Request con **una
aprobación de cualquier compañero** — basta una, y nadie aprueba su propio trabajo.

```bash
git checkout -b feat/mi-tarea
gh pr create --fill          # el PR debe decir: Closes #<número del issue>
```

- PRs pequeños y frecuentes. Uno gigante a la hora 17 no lo revisa nadie.
- Máximo **15 minutos** para revisar. Si nadie responde, se avisa por el grupo y cualquiera aprueba.
  Un PR bloqueado es tiempo muerto para todo el equipo.
- Si subes un commit **después** de que te aprobaron, la aprobación se borra. Sube todo y *después*
  pide revisión.
- Un comentario sin resolver bloquea el merge.

**CodeRabbit revisa todos los PRs.** Está configurado en [`.coderabbit.yaml`](.coderabbit.yaml) y
comenta en español, priorizando bugs y credenciales filtradas por encima del estilo.

> ⚠️ **Hay que dispararlo a mano.** El repositorio tiene menos de 10 estrellas, y en ese caso
> CodeRabbit no arranca solo. Al abrir un PR, escribe como comentario:
>
> ```
> @coderabbitai review
> ```

**No reemplaza la aprobación humana**: comenta, pero nunca aprueba. `main` sigue exigiendo que una
persona apruebe. Detalle completo en [docs/CODERABBIT.md](docs/CODERABBIT.md).

**Nadie espera a nadie.** El frontend construye contra datos falsos con la forma exacta del
[contrato de API](docs/CONTRATO-API.md). Esperar al backend convierte 20 horas de trabajo paralelo
en 20 horas en fila.

---

## Datos personales — Ley 1581

El sistema captura **documentos de identidad, fotos de rostro, datos de salud y datos de menores**
en el registro de damnificados. Bajo la Ley 1581 de 2012 son datos sensibles y de menores: las dos
categorías con mayor protección.

1. **El repositorio es público.** Nunca subir una foto de un documento real, ni siquiera "de
   prueba": queda expuesta y sigue siendo recuperable del historial de Git aunque después se borre.
2. **Toda la demo con datos inventados.** Nombres, cédulas y rostros falsos, siempre.
3. **Sin consentimiento no se guarda.** El campo `ConsentimientoDatos` es obligatorio antes de
   persistir una persona afectada.
4. **Los datos completos solo los ve** quien registró y los gestores de su entidad.

Detalle completo en [docs/MODELO-DATOS.md](docs/MODELO-DATOS.md).
