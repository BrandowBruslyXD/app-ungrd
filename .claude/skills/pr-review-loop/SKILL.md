---
name: pr-review-loop
description: >
  Abre un PR y lo acompaña con un ciclo cerrado: publicar → esperar → recoger señales
  (checks de CI si los hay + comentarios de revisión, humanos o de bots) → corregir →
  push → repetir hasta que no quede ninguna observación negativa. Nunca mergea ni
  cierra: el cierre es manual. Úsalo cuando pidan "haz el PR", "sube el PR y atiende
  los comentarios" o "prepara el PR de la feature X y llévalo a verde".
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
model: sonnet
---

# pr-review-loop — Abrir un PR y llevarlo a verde

Un PR no termina cuando se publica: termina cuando la CI (si la hay) y **todos** los revisores
—personas y bots— no tienen nada que objetar. Este skill automatiza ese acompañamiento.

## Reglas no negociables

1. **Nunca mergear ni cerrar el PR.** Ni `gh pr merge`, ni `gh pr close`, ni "auto-merge". El cierre
   lo hace una persona; tu trabajo acaba en "listo para mergear".
2. **Nunca declares en el cuerpo del PR algo que no hayas medido.** Cada cifra (pruebas, cobertura,
   warnings) sale de un comando que ejecutaste en esta sesión sobre el estado real de la rama.
3. **Verde no es evidencia.** Un test que pasa contra código correcto también pasa contra código roto
   si no verifica nada: antes de declarar una prueba como cobertura de un criterio, **muta el código**
   y confirma que la prueba cae.
4. **No apliques una recomendación que empeora el código**: explica por qué no y ataca la causa de
   que la observación dispare.
5. **Solo entra en el PR lo que pertenece al issue.** El "Incluye / No incluye" es el contrato del diff.

---

## Fase 0a — Comprobar el terreno

Este repo puede **no tener remoto de GitHub configurado todavía** y puede **no tener workflows de
CI**. Compruébalo antes de prometer señales que no van a llegar:

```bash
GH="/c/Program Files/GitHub CLI/gh.exe"     # PowerShell: & "C:\Program Files\GitHub CLI\gh.exe" ...

git remote get-url origin || echo "SIN REMOTO: no hay dónde publicar el PR"
"$GH" auth status         || echo "gh NO autenticado"
REPO=$("$GH" repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null)
ls .github/workflows/*.y*ml 2>/dev/null || echo "SIN WORKFLOWS DE CI"
```

- **Sin remoto o sin `gh` autenticado:** dilo y **detente**; no falles a ciegas ni inventes un
  `REPO`. Ofrece la alternativa útil: dejar el cuerpo del PR escrito en el scratchpad y correr la
  verificación local, para publicar en cuanto exista el remoto.
- **Sin workflows de CI:** dilo en el resultado y en el cuerpo del PR. La señal de checks **no
  existe**: el ciclo se apoya en los **comentarios de revisión** y en la **verificación local**, que
  pasa a ser obligatoria en cada iteración.

Nunca fijes el nombre del repositorio en un comando: sácalo siempre de `$REPO`.

## Fase 0b — Antes de publicar

**Lee el issue completo.** Sus criterios Gherkin son la tabla que vas a rellenar en el cuerpo del PR,
y su "No incluye" te dice qué dejar fuera aunque esté escrito en tu árbol de trabajo.

**Si el issue no trae criterios, no los redactes aquí.** Escritos al abrir el PR se ajustan a lo ya
construido: la tabla `criterio → prueba` sale llena y no reprueba nada. Van primero al **cuerpo del
issue**, y el PR dice que faltaban. Si al escribirlos aparece un comportamiento —normalmente el del
camino que falla— que el código no cubre, ese es el hallazgo más barato del ciclo entero.

**Acota el diff al alcance** (`git add` solo las rutas de esta feature) y **verifica el estado real
de la rama**, no el de tu árbol:

```bash
git stash push -u -m "pendiente de features posteriores"

dotnet build back/src/<Proyecto>.csproj -v q --nologo             # y el host, si son varios
dotnet test  back/tests/<Proyecto>.Tests/<Proyecto>.Tests.csproj -v q --nologo
npm --prefix front run build
npx --prefix front tsc --noEmit

git stash pop
```

Sin esto estarías midiendo código que no está en el PR. Si vas a citar cobertura (regla 2), mídela
con `dotnet test --collect:"XPlat Code Coverage"` y lee el `line-rate` del `coverage.cobertura.xml`.

**Pásate el espejo del auditor.** Quien audite este PR contrastará el diff contra la tabla de señales
del skill [`auditar-feature`](../auditar-feature/SKILL.md): caminos de fallo sin prueba, centinelas en
campos de identidad, `catch` más estrecho que la garantía que promete, niveles de registro, `any` en
TypeScript. Recórrela tú primero — cuesta menos que una iteración de revisión.
Incluye la doc XML, que el build no exige en tipos `internal` ni miembros `private` (ver Trampas):
saca los archivos con `git diff --name-only main...HEAD -- '*.cs'` y léelos.

**Escribe el cuerpo en un archivo** (`<scratchpad>/prNNN.md`), con `Closes #NNN` en la primera línea
y una tabla criterio → prueba nominal. Si no hay CI, dilo también ahí.

---

## Fase 1 — Publicar

```bash
"$GH" api repos/$REPO/pulls -X POST \
  -f title="<mismo estilo que el commit>" \
  -f head="feature/NNN-slug" -f base="main" \
  -F body=@"<scratchpad>/prNNN.md" --jq '"PR #\(.number): \(.html_url)"'
```

> Usa REST, no `gh pr create`: la API GraphQL se queda sin cuota con frecuencia y REST tiene su
> propio contador. Ojo con la sintaxis del cuerpo — `gh api` usa `-F body=@archivo`, mientras
> `gh pr edit` / `gh issue edit` usan `--body-file archivo`.

---

## Fase 2 — Esperar antes de recoger

Revisores y bots no responden al instante, y los checks —si existen— tardan en arrancar. `sleep` en
primer plano está bloqueado: lanza la espera **en segundo plano**, con la recogida encadenada.

```bash
# Bash con run_in_background: true
end=$((SECONDS+300)); while [ $SECONDS -lt $end ]; do sleep 20; done
echo "=== espera cumplida ==="
# … aquí los comandos de la Fase 3 …
```

Ajusta la espera al terreno: **con workflows de CI**, unos 5 minutos o hasta que los checks dejen de
estar `PENDING`; **sin workflows**, no esperes un verde que no va a llegar — 2 o 3 minutos bastan
para dar margen a un comentario, y la señal de calidad la pone tu verificación local.

---

## Fase 3 — Recoger las señales

Solo hay **dos** fuentes, y la segunda vive en dos endpoints distintos.

**1) Checks de CI — solo si el repo tiene workflows:**

```bash
"$GH" pr view <N> --repo $REPO --json state,statusCheckRollup,reviews \
  --jq '{state, checks:[.statusCheckRollup[]?|{name:(.name//.context),c:(.conclusion//.state)}],
         reviews:[.reviews[]?|{a:.author.login,s:.state}]}'
```

Si `checks` sale vacío, **no lo interpretes como aprobación**: significa que no hay CI. Dilo y
sustituye esa señal por el build y las pruebas locales corridos sobre la rama del PR.

**2) Comentarios de revisión, humanos o de bots — por sus DOS endpoints.** Aquí es donde se pierden
hallazgos: la conversación y los comentarios **en línea sobre el diff** son colecciones distintas, y
`gh pr view --json comments` solo trae los primeros; los revisores automáticos suelen comentar en
línea. Consulta ambos, siempre:

```bash
# a) Conversación
"$GH" api repos/$REPO/issues/<N>/comments --jq '.[] | "[\(.created_at)] \(.user.login)\n\(.body)\n"'

# b) En línea sobre el diff
"$GH" api repos/$REPO/pulls/<N>/comments \
  --jq '.[] | "[\(.created_at)] \(.user.login) — \(.path):\(.line // .original_line)\n\(.body)\n"'

# c) Cronología: ¿la aprobación es posterior a tu último push, o quedó DISMISSED?
"$GH" api repos/$REPO/pulls/<N>/reviews --jq '.[] | "\(.submitted_at) \(.user.login) \(.state)"'
```

---

## Fase 4 — Triage antes de tocar nada

Para cada observación, decide **con evidencia**, no por obediencia:

| Situación | Qué hacer |
|---|---|
| Apunta a un commit anterior a tu último push | Compara el SHA sobre el que se hizo la observación con el de tu último commit: puede estar ya resuelta. Dilo, no re-corrijas |
| El hallazgo es correcto | Corrígelo y busca **el resto del mismo problema**, no solo la línea citada |
| La premisa del hallazgo es falsa | Compruébalo empíricamente y muestra el comando. Aun así, pregúntate si el olor de fondo era real |
| La sugerencia empeora el código | No la apliques: explica por qué y ataca la causa de que dispare |
| Es una decisión de diseño abierta | Decídela, di qué inclinó la balanza y déjala con prueba |
| Es transversal al repo, no del PR | **Propón**; no lo arregles dentro de esta rebanada |

**Si el mismo hallazgo sobrevive a tres pushes, para y escala al usuario.** Dar vueltas no lo resuelve.

---

## Fase 5 — Corregir, verificar, empujar

1. Corrige y añade o ajusta la prueba que blinda el arreglo.
2. **Verifica por mutación**: rompe a propósito el comportamiento nuevo, confirma que la suite cae y
   restaura. **Muta también el camino de fallo**, no solo el feliz: quita la restauración del estado,
   estrecha el `catch`, cambia el centinela. Si la suite sigue verde, ese camino no está probado — y
   ahí vive el hallazgo que no ve ni el compilador ni el linter.
3. Compila y corre las suites afectadas (backend y frontend, según toque el diff), no solo la tuya.
4. Commit en español, imperativo, explicando el **porqué**, con `Co-Authored-By`.
5. Si el cuerpo del PR declaraba algo que ya no es cierto, **corrígelo**:
   `"$GH" api repos/$REPO/pulls/<N> -X PATCH -F body=@<archivo>`

Mutar con cuidado: bajo `TreatWarningsAsErrors`, `when (false)` da CS8359 y el código tras un `throw`
da CS0162 — ambos rompen el build en vez de correr la suite. Muta sustituyendo la expresión o el
cuerpo, no añadiendo ramas muertas.

---

## Fase 6 — Responder en el PR

Un comentario por vuelta del ciclo, que para cada punto diga **qué se hizo y con qué evidencia**:

```bash
"$GH" api repos/$REPO/issues/<N>/comments -X POST -F body=@"<scratchpad>/respuesta.md"
```

Reconoce el error cuando lo hubo, sin rodeos; si corregiste el diagnóstico del revisor, muestra el
comando que lo demuestra. Vuelve a la **Fase 2**.

---

## Cuándo termina

Se sale del ciclo cuando **todas** las señales disponibles están limpias:

- Todos los checks en `SUCCESS` — o, sin workflows, build y pruebas locales en verde sobre la rama
  del PR, declarado como tal.
- Ningún comentario, en conversación o en línea, posterior a tu último push sin atender.
- La aprobación, si la hay, es **posterior** a tu último commit (no `DISMISSED`).

Entonces **para y reporta**. No mergees. Enumera lo que quedó propuesto y pendiente de decisión del
usuario (deuda técnica, documentación diferida, cambios transversales).

---

## Trampas

| Trampa | Detalle |
|---|---|
| **Comentarios en línea invisibles** | `gh pr view --json comments` y `/issues/N/comments` **no** devuelven los comentarios sobre líneas del diff: si solo miras esos, das el PR por limpio con hallazgos sin atender |
| **Ausencia de checks leída como verde** | Un `statusCheckRollup` vacío no es un PR aprobado por CI: es un repo sin CI. Nunca lo reportes como señal positiva |
| **Sin remoto configurado** | Si `git remote get-url origin` falla, todo `gh api repos/$REPO/...` correrá con `$REPO` vacío y fallará con mensajes confusos |
| **Aprobación desestimada** | Un push nuevo puede dejarla en `DISMISSED`: compara `submitted_at` con la fecha de tu último commit antes de cantar "aprobado" |
| **La doc XML no la ve el compilador** | `GenerateDocumentationFile` + `TreatWarningsAsErrors` la exigen solo en miembros **públicamente visibles**: una clase `internal sealed` compila sin una línea de doc. Se verifica leyendo el diff |
| **`using` sin usar** | `IDE0005` es analizador de IDE, **no** warning de compilación: `TreatWarningsAsErrors` no lo ataja. Solo se ve en revisión |
| **`mergeable_state: blocked`** | Suele ser CI pendiente o protección de rama, no conflicto. Confírmalo con `git merge-tree` antes de alarmar |
| **Cuota de GraphQL** | `gh pr create` falla con 0 remaining; REST sigue disponible |

Referencias: convención de commits, arquitectura y calidad en [`CLAUDE.md`](../../../CLAUDE.md);
auditar la feature que el PR cierra con el skill [`auditar-feature`](../auditar-feature/SKILL.md).
