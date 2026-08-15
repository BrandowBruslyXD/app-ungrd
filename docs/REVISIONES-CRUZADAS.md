# Revisiones cruzadas

Regla única: **nadie aprueba su propio trabajo.** Todo PR lo revisa otra persona.

`main` está protegida y pide **1 aprobación** para hacer merge. No se puede pushear directo.

---

## Quién revisa a quién (rotación en anillo)

| Autor del PR | Se lo pide a | (y esa persona se lo pide a) |
|---|---|---|
| `@BrandowBruslyXD` | `@jasonfabian8` | ↓ |
| `@jasonfabian8` | `@JefersonMunoz` | ↓ |
| `@JefersonMunoz` | `@jhongarzon` | ↓ |
| `@jhongarzon` | `@BrandowBruslyXD` | ↺ vuelve al inicio |

El anillo se cierra: nadie se revisa a sí mismo y nadie depende siempre de la misma persona.

**Es un valor por defecto, no una cárcel.** Si a tu revisor le toca algo que no conoce, o simplemente no está disponible, pídeselo al siguiente del anillo y sigue. Lo que no se vale es aprobarte tú mismo.

> Los roles (backend / frontend / mapas y datos) todavía no están asignados. Cuando se confirmen, esta tabla no cambia: el anillo es por persona, no por rol.

---

## Acuerdo de tiempo: 15 minutos

- Revisar un PR toma **máximo 15 minutos**. Si te toma más, el PR es demasiado grande: pide que lo partan.
- **Si nadie revisó en 15 minutos**, el autor avisa por el grupo y **cualquiera del equipo puede aprobar**. No hay que esperar al revisor "oficial".
- En un hackathon un PR bloqueado es tiempo muerto para todos, no solo para el autor. Ante la duda: aprueba y deja el comentario. Si algo se rompe, se arregla en el siguiente PR.
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

- **Se descartan las aprobaciones al pushear.** Si te aprueban y después subes otro commit al mismo PR, la aprobación **se borra** y necesitas que te aprueben otra vez. Sube todo y *después* pide revisión.
- **Hay que resolver los comentarios.** Un comentario sin resolver bloquea el merge. Si dejas un comentario menor y ya apruebas, **resuélvelo tú mismo** para no dejar el PR trancado.

---

## Revisores automáticos (CODEOWNERS)

Existe `.github/CODEOWNERS` pero está **todo comentado a propósito**, incluida la regla global.

Hoy los roles no están confirmados. Un CODEOWNERS con la persona equivocada manda las revisiones a quien no toca y, si alguien activa "Require review from Code Owners", **bloquea los merges** hasta que apruebe esa persona exacta.

La regla global `* @BrandowBruslyXD` también quedó comentada, por dos razones: concentraría todas las revisiones en el PMO en lugar de repartirlas por el anillo, y en los PR del propio PMO GitHub no puede pedirle revisión a sí mismo, así que esos PR quedarían sin revisor asignado.

Mientras tanto: **el autor pide la revisión a mano** a quien le toca en el anillo. Cuando los roles estén claros, se descomenta el archivo (hay instrucciones adentro) y GitHub empieza a pedir revisión solo.
