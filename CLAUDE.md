# CLAUDE.md — RespondeYA

## Qué es este proyecto

Asistente ciudadano de gestión de emergencias accesible por **WhatsApp**. El ciudadano reporta
afectaciones con texto, audio, fotos y ubicación; la IA clasifica y prioriza las necesidades,
orienta sobre ayudas y trámites, y el caso avanza por estados hasta la confirmación de entrega:

```
Reportado → Validado → Priorizado → Ayuda asignada → En atención → Entregado → Confirmado
```

Contexto completo del problema y del alcance: [investigacion-uno.md](investigacion-uno.md) ·
fuentes de datos exploradas: [investigacion-dos.md](investigacion-dos.md). Ojo: esos documentos son
de la idea inicial y usan el nombre de trabajo anterior; el producto es **RespondeYA**.

Es un proyecto de **hackatón**: prioriza lo que se puede demostrar funcionando. Pragmatismo por
encima de ceremonia, pero sin renunciar a las reglas de abajo — están para que el código siga
siendo tocable cuando queden pocas horas.

**Los usuarios están en emergencia**, muchas veces con conexión mala y dispositivos limitados. Eso
no es color: es un requisito. Un flujo que solo funciona con buena red no sirve.

---

## Stack y estructura

| Parte | Stack | Ubicación |
|---|---|---|
| Backend | .NET, **arquitectura Vertical Slice** | `backend/` |
| Frontend | React + TypeScript | `frontend/` |

Idioma de todo: **español neutro** — documentación, comentarios, mensajes de commit, textos de
issues y de PR.

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
prueba que lo hace caer. La plantilla de PR y el anillo de revisores cruzados los define el equipo
en su propia rama.

`gh` no está en el PATH de las sesiones. Invócalo por ruta completa:
`& "C:\Program Files\GitHub CLI\gh.exe"` (PowerShell) · `"/c/Program Files/GitHub CLI/gh.exe"` (Bash).
