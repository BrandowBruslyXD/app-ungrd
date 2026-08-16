---
name: auditar-feature
description: >
  Audita UNA feature (issue de GitHub) contrastando lo que declara contra el código
  real, con evidencia `archivo:línea`. Úsalo cuando pidan "audita la feature #12",
  "¿esta feature está realmente terminada?", "valida el issue antes de cerrarlo" o
  "revisa si el PR completa lo que promete el issue". Entrega veredicto + evidencia
  + acción recomendada; ejecutar la acción es de quien invoca.
allowed-tools: Read, Grep, Glob, Bash
model: sonnet
---

# Auditar una feature contra el código

Verificas que lo que el issue declara corresponde con el código real, sobre **una feature por
invocación**. Este skill es de **revisión**: entrega veredicto, evidencia y acción recomendada —
**ejecutar la acción (cerrar el issue, comentar, reabrir alcance) es de quien lo invoca**.

**Contextos:** contra `main` (entrada `#NNN`, estado real de la rama principal) o contra un PR que
cierra la feature con `Closes #NNN` (¿lo que cierra realmente la completa?).

## Acceso a GitHub

`gh` no está en el PATH; invócalo por ruta completa:

```bash
GH="/c/Program Files/GitHub CLI/gh.exe"     # PowerShell: & "C:\Program Files\GitHub CLI\gh.exe" ...
git remote get-url origin || echo "SIN REMOTO"
```

Sin remoto de GitHub o sin `gh` autenticado, **dilo y detente ahí**: pide que te peguen el cuerpo del
issue y audita contra ese texto, declarando que la fuente fue manual. Nunca supongas el contenido de
un issue que no pudiste leer.

## Reglas duras

1. **El descubrimiento no es autorización**: bugs, deudas o riesgos hallados se reportan — no se
   crean issues ni se corrige nada.
2. **Toda afirmación cita `archivo:línea`** (ruta relativa, línea real). Un "no encontrado" declara
   qué se buscó y con qué variantes de nombre.
3. **Cerrar, recortar alcance o descartar una feature es del responsable.** El skill lo *propone*.
4. Los ítems de la definición de hecho que son **de proceso** no bloquean el cierre; se declaran.
5. No re-especifiques ni opines de gusto de diseño: solo correspondencia issue ↔ código.

## Lo que toda feature debe cumplir aquí

No hay catálogo ni códigos: son estas seis exigencias, aplicables a toda feature por defecto.

1. **Criterios de aceptación verificables**, en Gherkin, en el issue, incluyendo **el camino que
   falla** y no solo el feliz. Sin ellos solo se contrasta la existencia de las piezas, no el
   comportamiento.
2. **Manejo de errores explícito**: qué pasa con entrada inválida, servicio externo caído, dato
   inexistente o quien no tiene permiso para verlo.
3. **Tests que cubran el camino que falla**, no solo el feliz.
4. **Accesibilidad** si toca UI: teclado, foco visible, etiquetas asociadas, alternativas
   textuales, contraste.
5. **Observabilidad mínima**: que un fallo en producción se diagnostique **sin depurar**, leyendo el
   registro.
6. **Textos de UI por i18n**: ni un literal visible al usuario incrustado en el componente.

Audita solo las que el alcance realmente toca (no reclames i18n sin superficie de UI), pero señala si
alguna debió declararse como no aplicable. Las exclusiones que el issue declare **se respetan y se
reportan**; si no declara ninguna, se asume que las aceptó todas.

### Cómo se ve un incumplimiento en el código

Lo que se pierde en silencio son los **caminos de fallo** —invisibles en el camino feliz— y las
**claves que nadie compara** entre dos puntos del sistema: no las ve el compilador ni el linter.

| Exigencia | Señal en el código |
|---|---|
| Manejo de errores | `catch` de tipo concreto bajo un comentario o XML doc que promete continuidad ante **cualquier** fallo: contrasta la amplitud de la promesa escrita contra la del `catch`. Estado mutado **antes** de un `await` que puede lanzar, sin restaurarlo en el fallo. `OperationCanceledException` tragada en un bucle de "continuar pese a fallos": la cancelación deja de cancelar |
| Degradación silenciosa | `TryParse` con fallback, `??`, `FirstOrDefault()`, `catch { return null; }` que meten un centinela (`Guid.Empty`, `string.Empty`, `null`) en un campo de **identidad o trazabilidad** —quién reportó, id del reporte, id de la solicitud—: la operación queda registrada, pero sin a quién atribuirla |
| Autorización | Consulta o comando que no comprueba la **pertenencia del dato**: que quien pregunta pueda ver *ese* reporte. La prueba solo vale si cae al borrar la comprobación — si sigue verde, no prueba nada |
| Observabilidad | `LogError`/`LogCritical` sin la excepción como primer argumento; interpolación en vez de plantilla constante con **placeholders con nombre**; nivel mal puesto (fallo no recuperado como `Warning`; ruido idempotente o rechazos de auth esperados como `Information`); operación de negocio sin el identificador de la entidad afectada; datos sensibles del ciudadano en el mensaje; fronteras externas (mensajería, audio, IA), puntos de decisión y transformaciones no obvias **sin ningún `Debug`**, o una secuencia de `Information` con la que no se puede contar la historia del caso de uso |
| Tests | Caminos de fallo nuevos (`throw`, `catch`, ramas de degradación) sin prueba nominal que los ejerza. Test de "lanza validación" que no afirma **también** que el objeto quedó intacto. Suite que solo cubre fallos de dominio y no de I/O. Transiciones de estado (`Reportado → Validado → Priorizado → Ayuda asignada → En atención → Entregado → Confirmado`) sin prueba de alcanzabilidad ni de las prohibidas |
| Claves que deben coincidir | Un literal que tiene que **coincidir** con otro punto del sistema —nombre de cola, clave de configuración, código de estado, clave de metadata—, reconocible por su **forma** y no por su valor: argumento con nombre en un registro de DI, cadena que acaba en un `==` de consulta, el mismo texto en dos capas o dos stacks. La prueba debe **afirmar el valor**, no solo que el servicio resuelve |
| UI y documentación | Texto visible incrustado en el `.tsx`; `any` o `@ts-ignore`; control sin etiqueta asociada; interacción solo alcanzable con ratón. En C#, tipos o miembros con lógica sin XML doc en español **en cualquier visibilidad**: el compilador solo exige lo públicamente visible, así que una clase `internal` compila verde sin una línea (`/// <inheritdoc />` es suficiente) |

La tabla es de **arranque, no de cierre**: recoge lo que más se escapa, no todo lo auditable.

## La forma de la rebanada

Un cambio puede deformar la arquitectura sin que nadie lo note: pasa el build y hasta una revisión
centrada en el issue, porque el disparador no está en la descripción — está en la **forma** del diff
(`git diff --name-status main...HEAD -- 'back/src/**'`).

- **¿La rebanada es autocontenida y se entiende sola?** ¿O referencia tipos de otra, o inventa capas
  fantasma dentro de su carpeta (`Application`/`Domain` por caso de uso, repositorios genéricos, un
  mediator que no aporta)?
- **¿Lo que subió a `Common/` lo usan de verdad varias rebanadas?** Si solo lo usa esta, no pertenece
  ahí. Duplicar es barato y explícito: la tercera repetición justifica extraer, no la segunda.

Un acierto aquí es un **hallazgo estructural**: se reporta con `archivo:línea`; no se arregla desde
este skill (regla dura 1).

## Protocolo

1. **Lee el issue completo**: historia, alcance *Incluye / No incluye*, criterios Gherkin, definición
   de hecho y exclusiones declaradas.
2. **Lee los comentarios en orden cronológico**: acuerdos, recortes de alcance y hallazgos previos.
   **El último comentario manda** sobre el cuerpo cuando se contradicen — el cuerpo es la intención
   inicial; el hilo es lo que se decidió después. Si el alcance cambió, audita el vigente y dilo.

   ```bash
   "$GH" issue view <NNN> --json title,body --jq '.title, .body'
   "$GH" issue view <NNN> --json comments --jq '.comments[] | "[\(.createdAt)] \(.author.login)\n\(.body)\n"'
   ```
3. **Extrae los verificables**: cada elemento del *Incluye* + cada escenario, ajustados por los
   comentarios. **Si el issue no trae escenarios Gherkin, ese es el primer hallazgo**: audita el
   *Incluye* que haya, pero dilo. Los criterios en prosa valen si nombran algo observable. **No los
   redactes tú**: escritos *después* de ver el código se ajustan a lo construido y no reprueban nada.
4. **Verifica contra el código** — backend en `back/src/ConectaRiesgoAI.Api/Features/<Feature>/<CasoDeUso>/`,
   frontend en `front/src/` (o el diff del PR): endpoints, handlers, validadores, pantallas y
   rutas por nombre y variantes; tests del área (`[Método]_[Condición]_[ResultadoEsperado]`). Ejecuta
   tests puntuales solo si un veredicto depende de ello.
5. **Verifica las seis exigencias.** Buscar por nombre encuentra lo que existe, no lo que falla: en
   el contexto contra un PR, materializa los candidatos del diff y contrástalos con la tabla.

   ```bash
   git diff main...HEAD -- '*.cs' | grep -nE '^\+.*(catch|TryParse|\?\?|Guid\.Empty|FirstOrDefault|LogError|LogWarning|throw |[a-z][A-Za-z]*: ")'
   git diff main...HEAD -- '*.ts' '*.tsx' | grep -nE '^\+.*(any|@ts-ignore|catch|console\.)'
   ```
6. **Recorre la forma de la rebanada** y **emite el veredicto** con su acción recomendada.

## Veredictos y acción recomendada

La acción es una **recomendación**: quien invoca decide cuáles puede ejecutar (una revisión de PR
solo comenta; descartar o recortar alcance es siempre del responsable).

| Veredicto | Acción recomendada |
|---|---|
| ✅ Completa | Cerrar el issue como *completed* con la evidencia |
| 🔀 Resuelta por otra vía | Proponer cerrar y/o recortar alcance, citando dónde quedó cubierta la necesidad |
| 🟡 Parcial | Dejar constancia de qué está hecho y qué falta; mantener abierta |
| ⬜ Sin evidencia de avance | Proponer al responsable devolverla al backlog |
| 🚫 Ya no aplica | Proponer al responsable cerrarla como *not planned* |

**Ningún ✅ sobre una feature sin criterios de aceptación**: aunque todo el *Incluye* esté construido,
el veredicto es 🟡 con el hueco declarado y la acción incluye escribirlos en el issue; la salida
legítima es que el issue declare por qué no aplican. **Ningún ✅ sobre un camino de fallo sin prueba
ni sobre un hallazgo estructural abierto.**

## Formato del resultado

Markdown listo para usarse como comentario (de issue o de PR) o sección de informe:

```markdown
**Auditoría de feature — <veredicto>**
**Alcance auditado:** <cuerpo original / ajustado por el comentario de <fecha>: qué cambió>
**Verificables:** X de Y encontrados
**Evidencia:** <archivo:línea por cada afirmación — o qué se buscó, con qué variantes, sin éxito>
**Exigencias:** <cumplidas las aplicables / incumple <cuál>: motivo, con archivo:línea> · <exclusiones declaradas>
**Estructura:** <rebanada autocontenida / hallazgo: archivo:línea>
**Acción recomendada:** <concreta, del catálogo de veredictos>
**Hallazgos fuera de alcance:** <si los hay; solo reporte>
```

**El conteo de verificables no delata la ausencia de criterios: la esconde.** Sin escenarios el
denominador solo cuenta el *Incluye*, sale cuadrado —`4 de 4`— y se lee igual que un cumplimiento.
Márcalo en esa línea (`4 de 4 — el issue no declara escenarios de aceptación`) y en **Exigencias**.
