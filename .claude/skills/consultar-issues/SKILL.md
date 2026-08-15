---
name: consultar-issues
description: Consulta los issues del repositorio actual por categoría (epic, feature, bug, tech-debt), estado abierto/cerrado, milestone o asignado, y los presenta en tabla compacta con conteos. Úsalo cuando el usuario pida contar, listar o filtrar issues — p. ej. "cuántos bugs hay abiertos", "lista las features del milestone MVP", "qué issues tengo asignados", "cuántas épicas faltan por cerrar".
model: sonnet
---

# Consultar issues (epic / feature / bug / tech-debt)

Cada issue lleva exactamente una **etiqueta de categoría** — `epic`, `feature`, `bug` o `tech-debt` —
y esa etiqueta es el eje principal de consulta. Los demás filtros útiles son el estado del issue
(`open` / `closed`), el **milestone** y el **asignado**.

`gh` no está en el PATH. Invócalo siempre por ruta completa:

- PowerShell: `& "C:\Program Files\GitHub CLI\gh.exe" ...`
- Bash: `"/c/Program Files/GitHub CLI/gh.exe" ...`

En los ejemplos se escribe `gh` por brevedad; sustitúyelo por la ruta completa al ejecutar.

## 1. Antes de consultar: resuelve el repositorio

Nunca hardcodees el repo ni consultes a ciegas. Primero:

```bash
gh repo view --json nameWithOwner,owner,name
```

- Si responde, guarda `nameWithOwner` (`<owner>/<repo>`) y `owner.login` para el resto de la sesión.
- Si **falla** (no hay remoto, o el remoto no apunta a GitHub — mensaje típico: *"none of the git
  remotes configured for this repository point to a known GitHub host"*), **detente y dilo claro**:
  este repositorio todavía no tiene remoto de GitHub, así que no hay issues que consultar. Confirma
  con `git remote -v` y ofrece la salida (crear el repo remoto con `gh repo create`), pero **no
  lances más consultas**.

## 2. ¿Hay un Project v2 asociado? (descúbrelo, no lo asumas)

El repo puede tener o no un tablero. Averígualo en tiempo de ejecución:

```bash
gh api graphql -f query='query($owner:String!,$name:String!){repository(owner:$owner,name:$name){projectsV2(first:20){nodes{number title}}}}' -f owner=<owner> -f name=<repo> --jq '.data.repository.projectsV2.nodes'
```

- **Lista vacía o error de permisos →** trabaja solo con etiquetas y estado (sección 3). Eso es
  normal y no es un fallo: no lo reportes como error, simplemente no menciones estados de tablero.
- **Hay tablero →** úsalo para el estado de flujo (sección 4).

## 3. Consulta por etiqueta, estado, milestone y asignado

Comando base (ajusta filtros; todos son opcionales y combinables):

```bash
gh issue list --label bug --state open --limit 500 \
  --json number,title,state,labels,milestone,assignees,url
```

| Filtro    | Flag                          | Notas |
|-----------|-------------------------------|-------|
| Categoría | `--label feature`             | Repite `--label` para exigir varias a la vez (AND). |
| Estado    | `--state open\|closed\|all`   | Por defecto `open`; para conteos totales usa `all`. |
| Milestone | `--milestone "MVP"`           | Se pasa el **título** del milestone, tal cual. |
| Asignado  | `--assignee @me` o `--assignee <usuario>` | `--search "no:assignee"` para los que no tienen. |
| Autor     | `--author <usuario>`          | |

⚠️ **`--limit` por defecto es 30 y trunca en silencio.** Súbelo siempre (500 va sobrado aquí) o
cualquier conteo que reportes será incorrecto.

Milestones y etiquetas disponibles, cuando el usuario nombre uno que no reconoces:

```bash
gh milestone list        # si no está disponible: gh api repos/<owner>/<repo>/milestones --jq '.[].title'
gh label list --limit 100
```

Ver un issue concreto (cuerpo, etiquetas, sub-issues) cuando ya tienes el número:

```bash
gh issue view <numero> --json number,title,state,labels,milestone,assignees,body
```

## 4. Estado del tablero, solo si existe

⚠️ **Trampa: `state` del issue ≠ `Status` del tablero.** `gh issue list` devuelve `state` =
`OPEN`/`CLOSED`. Si hay un Project v2 con campo `Status` (`Todo`/`In Progress`/`Done`…), eso es otra
cosa: un issue puede estar `OPEN` y a la vez `Done` en el tablero. Para preguntas de flujo ("¿cuántas
en progreso?") usa el tablero; para abierto/cerrado usa `gh issue list`.

```bash
gh project item-list <numero> --owner <owner> --limit 400 --format json
gh project field-list <numero> --owner <owner> --format json   # opciones reales del campo Status
```

Cada item trae `title`, `status`, `labels`, `milestone`, `repository`, `content`. Aquí `--limit`
también viene bajo por defecto (30): súbelo. El filtro `--query "status:Todo"` funciona bien; el de
milestone no es fiable — trae todo y filtra en cliente por `milestone.title`.

## 5. Contar y agrupar

Conteo directo por categoría y estado (una llamada por combinación, sin dependencias externas —
`--jq` va incluido en `gh`):

```bash
gh issue list --label bug --state open --limit 500 --json number --jq 'length'
```

Agrupar en cliente cuando necesitas el desglose completo de una sola pasada:

PowerShell:
```powershell
& "C:\Program Files\GitHub CLI\gh.exe" issue list --state all --limit 500 --json number,title,state,labels,milestone |
  ConvertFrom-Json |
  Group-Object { ($_.labels.name | Where-Object { $_ -in 'epic','feature','bug','tech-debt' }) -join ',' }, state |
  Select-Object Name, Count
```

Bash:
```bash
gh issue list --state all --limit 500 --json state,labels \
  --jq '[.[] | {state, cat: ([.labels[].name] | map(select(. == "epic" or . == "feature" or . == "bug" or . == "tech-debt")) | first // "sin-categoria")}] | group_by(.cat + .state) | map({cat: .[0].cat, state: .[0].state, count: length})'
```

Un issue sin ninguna etiqueta de categoría es un hallazgo, no ruido: menciónalo aparte.

## 6. Cómo presentar el resultado

**Nunca vuelques el JSON crudo.** Responde primero el número que se preguntó y luego una tabla
compacta, agrupada por categoría si hay varias:

```
Bugs abiertos: 7 (3 con milestone MVP)

| #   | Título                                   | Milestone | Asignado |
|-----|------------------------------------------|-----------|----------|
| 142 | El audio de WhatsApp no se transcribe    | MVP       | —        |
| 138 | Reporte duplicado al reenviar ubicación  | MVP       | jperez   |
```

- Trunca los títulos largos (~60 caracteres) en vez de romper la tabla.
- Columnas solo si aportan: no pintes `Asignado` si nadie lo tiene, ni `Estado` si filtraste por uno.
- Añade la columna `Estado` (del tablero) únicamente si el paso 2 encontró un Project v2.
- Si el resultado es largo (>25 filas), muestra un resumen por conteos y las primeras filas, y ofrece
  el detalle completo.
- Incluye la URL del issue solo cuando el usuario vaya a actuar sobre uno concreto.

## Reglas

- Repo siempre resuelto con `gh repo view`; sin remoto de GitHub, lo dices y paras.
- Sube `--limit` en toda consulta que alimente un conteo.
- "Abierto/cerrado" → `gh issue list --state`. "En progreso/hecho" → tablero, y solo si existe.
- Si el usuario reporta que un conteo no cuadra, no discutas: re-verifica las etiquetas reales
  (`gh label list`) y las opciones del campo `Status` (`gh project field-list`) antes de responder.
