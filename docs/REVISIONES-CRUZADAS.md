# Revisiones de código

**La política en una línea: UNA aprobación de CUALQUIER compañero y haces merge.**

`main` está protegida y pide **1 aprobación** para hacer merge. No se puede pushear directo. Eso es todo lo que exige el repo.

Regla innegociable, la única: **nadie aprueba su propio PR.** GitHub ya lo impide solo, así que ni siquiera hay que acordarse.

No hace falta que apruebe una persona concreta. No hace falta que apruebe un "dueño" del área. No hacen falta dos aprobaciones. **Una, de quien sea del equipo, y adelante.**

---

## A quién pedirle primero (sugerencia, no obligación)

Esta tabla existe por una sola razón: que revisar no le caiga siempre a la misma persona. Es un **reparto por defecto**, para no tener que pensar a quién escribirle.

| Si el PR es tuyo… | …pídeselo primero a |
|---|---|
| `@BrandowBruslyXD` | `@jasonfabian8` |
| `@jasonfabian8` | `@JefersonMunoz` |
| `@JefersonMunoz` | `@jhongarzon` |
| `@jhongarzon` | `@BrandowBruslyXD` |

**Esto NO es "quién debe aprobar". Es "a quién le escribo primero".**

- Si esa persona está ocupada, en otra cosa, o simplemente no contesta: **pídeselo a cualquier otro y ya**. No hay que esperar a nadie.
- Cualquiera de los cuatro puede aprobar cualquier PR, del área que sea, en cualquier momento. No necesitas permiso ni justificación para revisar un PR que no te "tocaba".
- **Un PR bloqueado es tiempo muerto para todo el equipo**, no solo para el autor. Si ves un PR parado, ábrelo y apruébalo tú. Eso es ayudar, no meterte donde no te llaman.

> Los roles (backend / frontend / mapas y datos) todavía no están asignados. Cuando se confirmen, esta tabla no cambia y sigue siendo una sugerencia: el reparto es por persona, no por rol.

---

## Acuerdo de tiempo: 15 minutos

- Revisar un PR toma **máximo 15 minutos**. Si te toma más, el PR es demasiado grande: pide que lo partan.
- Si nadie revisó en 15 minutos, el autor avisa por el grupo y el primero que lo vea aprueba. Sin escalar, sin esperar turno.
- Ante la duda: **aprueba y deja el comentario**. Si algo se rompe, se arregla en el siguiente PR.
- PR chicos y seguido. Un PR de 40 archivos no lo revisa nadie en 15 minutos.

---

## Qué SÍ se mira

Cuatro cosas. Nada más:

1. **Que compile / levante.** Backend `dotnet build` y frontend `npm run build` sin errores.
2. **Que no rompa lo de otro.** ¿Tocó archivos compartidos, rutas, modelos de EF Core o config que use alguien más?
3. **Que no haya credenciales quemadas.** Ni contraseñas, ni connection strings de Postgres, ni API keys, ni `.env` commiteado. Esto es lo único que **no se negocia**: el repo es **público**.
4. **Que el contrato de API no cambie en silencio.** Si un endpoint cambia de nombre, de forma o de respuesta, tiene que estar dicho en el PR. Si no, el frontend se cae y nadie sabe por qué.

## Qué NO se mira

- Estilo, formato, indentación.
- Nombres de variables "perfectos".
- Tests exhaustivos.
- Refactors y arquitectura ideal.
- Optimización prematura.

Si tienes una observación de estas, **no bloquees el PR**: apruébalo y déjala como comentario suelto o como issue para después del hackathon.

---

## Revisar rápido desde la terminal

```bash
gh pr list                  # ver qué hay pendiente

gh pr diff 12               # leer el cambio (lo más rápido, empieza aquí)
gh pr checkout 12           # bajarlo y probarlo de verdad
gh pr review 12 --approve   # aprobar
```

Aprobar con comentario, o pedir un cambio concreto:

```bash
gh pr review 12 --approve -b "Va, el endpoint de reportes responde bien"
gh pr review 12 --comment -b "Ojo: dejaste la connection string en appsettings.json"
```

Truco para el punto 3, antes de aprobar:

```bash
gh pr diff 12 | grep -iE "password|apikey|api_key|secret|connectionstring|\.env"
```

Si eso devuelve algo, **no apruebes** hasta que lo saquen.

---

## Dos cosas de GitHub que nos van a morder

La protección de `main` tiene activado:

- **Se descartan las aprobaciones al pushear** (`dismiss_stale_reviews`). Si te aprueban y después subes otro commit al mismo PR, la aprobación **se borra** y necesitas que te aprueben otra vez. Sube todo y *después* pide revisión.
- **Hay que resolver los comentarios** (`required_conversation_resolution`). Un comentario sin resolver bloquea el merge. Si dejas un comentario menor y ya apruebas, **resuélvelo tú mismo** para no dejar el PR trancado.

---

## CodeRabbit: revisor automático, no sustituto

Vamos a sumar **CodeRabbit** como revisor automático de los PR. Sirve para que alguien (algo) mire el diff enseguida y cace lo obvio: credenciales, cambios de contrato, cosas que no compilan.

**CodeRabbit NO cuenta como la aprobación.** GitHub sigue exigiendo **1 aprobación humana** y eso no cambia. Trátalo como un par de ojos extra y gratis:

- Si CodeRabbit marca algo grave (una credencial, un endpoint que cambió), hazle caso antes de aprobar.
- Si marca estilo, naming o refactors, aplica la sección "Qué NO se mira" y sigue. No bloquees por eso.

---

## Revisores automáticos (CODEOWNERS)

Existe `.github/CODEOWNERS` pero está **todo comentado a propósito**, incluida la regla global. Y con la política actual está bien así.

En la protección de rama, `require_code_owner_reviews` está en **`false`**: aunque el archivo se activara, GitHub no exigiría la aprobación de un dueño concreto. Eso es deliberado — activarlo convertiría a una persona específica en cuello de botella, que es exactamente lo que esta política quiere evitar.

La regla global `* @BrandowBruslyXD` también quedó comentada: concentraría todas las revisiones en el PMO en lugar de repartirlas, y en los PR del propio PMO GitHub no puede pedirle revisión a sí mismo.

Mientras tanto: el autor le escribe a quien le sugiere la tabla de arriba y, si no hay respuesta, a cualquiera. Cuando los roles estén claros se puede descomentar el archivo (hay instrucciones adentro) para que GitHub *sugiera* revisor solo — pero **sin** activar `require_code_owner_reviews`, o volvemos a bloquear merges.
