---
name: crear-epica
description: Entrevista guiada para capturar un requerimiento funcional y crearlo como issue Épica en GitHub. Úsalo cuando el usuario pida crear un requerimiento, una épica, un epic, o traiga una necesidad funcional de un ciudadano, una entidad o del responsable del producto. Acompaña la decisión de si es 1 requerimiento o varios, y ofrece descomponerlo en sub-issues feature.
model: sonnet
---

# Crear un requerimiento (Épica)

Guías al usuario para capturar un requerimiento **funcional** (no técnico, sin formato de historia de
usuario) y lo creas como issue con la estructura de `.github/ISSUE_TEMPLATE/epic.yml`. El
requerimiento puede venir de un ciudadano afectado, de una entidad o voluntariado que atiende la
emergencia, o del propio responsable del producto.

**Contexto de producto** (úsalo para preguntar mejor, no para poner palabras en boca del usuario):
asistente ciudadano de gestión de emergencias accesible por WhatsApp. El ciudadano reporta
afectaciones por texto, audio, foto o ubicación; la IA clasifica y prioriza, orienta sobre ayudas y
trámites, y cada solicitud avanza por estados
(`Reportado → Validado → Priorizado → Ayuda asignada → En atención → Entregado → Confirmado`).
Restricciones típicas de este dominio que conviene sondear si el usuario no las menciona:
conectividad pobre, personas sin documentos, dispositivos antiguos, y la diferencia entre *orientar*
al ciudadano y *decidir* sobre su elegibilidad (lo segundo no lo hace la IA).

## 1. La entrevista

Recoge las respuestas a estas preguntas — **conversando, no como formulario**. Si el usuario ya dio
parte de la información en su mensaje, NO la vuelvas a preguntar: confirma lo entendido y pregunta
solo lo que falte. Usa AskUserQuestion cuando haya opciones claras; texto libre para lo abierto.

**Obligatorias (sin esto no hay requerimiento):**

1. **¿Qué necesitas lograr?** — la necesidad en sus palabras. Si el usuario describe una solución
   ("quiero un botón que…"), pregunta por el problema detrás ("¿qué necesitas lograr con eso?") y
   registra la necesidad, no la solución.
2. **¿Quiénes lo van a usar?** — roles en lenguaje de negocio (ciudadano afectado, operador que
   valida reportes, entidad que asigna ayudas…).
3. **¿Cómo sabrás que quedó resuelto?** — ejemplos concretos de "terminado" en lenguaje llano.

**Opcionales (ofrécelas; no insistas si no aportan en este caso):**

4. ¿Cómo se resuelve hoy? (proceso actual, aunque sea manual o por teléfono)
5. ¿Qué tan urgente y por qué? (fecha límite, personas esperando, mejora diaria, idea a futuro)
6. Restricciones o condiciones (normativa, canal, volúmenes, cobertura, datos sensibles)
7. Ejemplos o anexos (casos reales, formatos, capturas de conversación)

## 2. ¿Uno o varios requerimientos?

Antes de crear nada, evalúa el alcance y **recomienda** (la decisión es del usuario):

- **UNA épica** cuando hay UNA necesidad con UN resultado de "resuelto", aunque el flujo tenga muchos
  pasos o toque varias partes del sistema — la granularidad fina la darán las features al descomponer.
- **VARIAS épicas** cuando detectes necesidades con **resultados de "resuelto" independientes** (se
  puede entregar una sin la otra y cada una tiene valor por sí sola), **usuarios distintos** con
  problemas distintos, o **procesos separados** que solo comparten contexto.
- Señal de alerta para dividir: la respuesta a "¿cómo sabrás que quedó resuelto?" contiene varios
  "y también…" inconexos entre sí.

Si recomiendas dividir, presenta la partición propuesta (título tentativo + necesidad de cada una) y
deja que el usuario confirme antes de crear.

## 3. Crear el/los issues

`gh` no está en el PATH: invócalo por ruta completa —
PowerShell `& "C:\Program Files\GitHub CLI\gh.exe" ...` · Bash `"/c/Program Files/GitHub CLI/gh.exe" ...`

Antes de crear, confirma que hay repo remoto: `gh repo view --json nameWithOwner`. Si falla (aún no
hay remoto de GitHub configurado), **dilo claramente** y ofrece guardar el requerimiento redactado en
un archivo para crearlo cuando exista el repo; no intentes crear el issue a ciegas.

Para cada épica confirmada:

- **Título:** `[Epic] <resumen corto de la necesidad>`.
- **Etiqueta:** `epic`, y solo esa. Si aún no existe en el repo, créala una vez:
  `gh label create epic --description "Requerimiento funcional" --color 5319E7`.
- **Cuerpo:** las secciones de la plantilla `.github/ISSUE_TEMPLATE/epic.yml`
  (`### ¿Qué necesitas lograr?`, `### ¿Quiénes lo van a usar?`, `### ¿Cómo sabrás que quedó
  resuelto?` y las opcionales que se hayan respondido), con las respuestas del usuario **en sus
  palabras** (limpia la redacción, no cambies el sentido). Cierra con `Co-autor: Claude Code`.
- Escribe el cuerpo en un archivo del scratchpad y pásalo con `--body-file` (evita los problemas de
  comillas de PowerShell 5.1):

```bash
gh issue create --title "[Epic] ..." --label epic --body-file <ruta-del-scratchpad>
```

Muestra al usuario el/los enlaces creados.

## 4. Ofrecer la descomposición en features (opcional)

Pregunta si quiere descomponer ya la épica en features. Si acepta:

1. Propón la lista de features (título + una línea de alcance cada una) derivadas de la necesidad y
   del "cómo sabrás que quedó resuelto". Espera su confirmación o ajuste.
2. Crea cada feature con la etiqueta `feature` (créala si no existe, igual que `epic`) y cuerpo con:
   alcance en una frase, criterios de aceptación y enlace a la épica padre (`Parte de #<épica>`).
3. **Escribe los criterios de aceptación en Gherkin** (`Dado / Cuando / Entonces`), incluyendo el
   **camino que falla** además del feliz. La materia prima ya la tienes: la respuesta a *"¿cómo
   sabrás que quedó resuelto?"* es eso mismo en lenguaje llano, y repartirla entre las features es
   descomponer, no inventar. Lo que la conversación no permita responder se deja como pregunta
   abierta y visible en el issue — una sección ausente no se distingue de una que nadie echó de menos.
4. Vincula cada feature como **sub-issue** de la épica:
   `gh api repos/<owner>/<repo>/issues/<epica>/sub_issues -f sub_issue_id=<id-numerico-del-feature>`
   El `sub_issue_id` es el id numérico interno, no el número del issue: obtenlo con
   `gh api repos/<owner>/<repo>/issues/<n> --jq .id` (`gh issue view <n> --json id` devuelve el node
   ID de GraphQL, que no sirve aquí).

## Reglas

- Registra necesidades, no soluciones; en las palabras del usuario.
- No inventes criterios de aceptación que el usuario no dio: lo que falte va como pregunta abierta.
- Si el usuario solo quiere dejar la épica capturada sin descomponer, eso es un resultado completo —
  no insistas con las features.
