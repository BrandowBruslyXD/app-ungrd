# CodeRabbit en ConectaRiesgoAI

CodeRabbit es un revisor de codigo con IA que se engancha a los Pull Requests del
repositorio y deja comentarios automaticos. En este proyecto lo usamos como **red de
seguridad**, sobre todo para que no se nos escape una credencial en un repositorio
que es **publico**.

La configuracion vive en [`.coderabbit.yaml`](../.coderabbit.yaml) en la raiz del repo.

---

## 0. TL;DR

| Cosa | Estado |
|---|---|
| Repo | `BrandowBruslyXD/app-ungrd` (**publico**, 0 estrellas) |
| Costo | **Gratis** para repos publicos (ver seccion 2) |
| Idioma de las revisiones | Espanol |
| Perfil | `quiet` (solo lo importante) |
| Aprueba PRs | **NO**. `main` exige 1 aprobacion **humana** |
| Falta para que funcione | **Instalar la GitHub App** (solo el dueno puede) -> seccion 3 |
| Ojo | Con menos de 10 estrellas hay que **disparar la revision a mano** -> seccion 4 |

---

## 1. Que hace y como leer sus comentarios

En cada PR, CodeRabbit publica:

1. **Un resumen del PR** (high level summary): 3-6 vinetas en espanol con que cambia,
   que endpoints/pantallas toca y que hay que probar a mano antes de la demo.
2. **Un "walkthrough"** plegado: tabla de archivos cambiados con una linea por archivo.
3. **Comentarios linea por linea** sobre el diff, cuando encuentra algo. Muchos traen
   un bloque de codigo sugerido que puedes aplicar con **Commit suggestion** desde
   la propia interfaz de GitHub.
4. **Un comentario de estado** con el progreso de la revision y botones/checkboxes
   para acciones (por ejemplo, disparar una revision).

### Como priorizar lo que dice

Configuramos el perfil `quiet` y le dimos instrucciones explicitas de **no** opinar de
estilo, nombres, formato, refactors ni cobertura de tests. Asi que, si comenta, casi
siempre es una de estas cuatro:

| Prioridad | Que es | Que hacer |
|---|---|---|
| **CRITICO** | Secreto filtrado (API key, MapKey de NASA FIRMS, token de SECOP, credenciales de Bluesky/X, cadena de conexion de PostgreSQL, clave de firma JWT) | Arreglar **ya** y ademas **rotar la credencial**: el repo es publico y el historial de git ya quedo expuesto |
| **ALTO** | Excepcion de un servicio externo que se propaga y tumba un endpoint, o `HttpClient` sin timeout | Arreglar antes de mergear |
| **ALTO** | Frontend: URL de API quemada, o pantalla que revienta porque no maneja carga/vacio | Arreglar antes de mergear |
| **MEDIO** | Bug real (null reference, `.Result`/`.Wait()`, bucle de reintentos, CORS mal puesto) | Valorar segun el reloj del hackathon |

Si un comentario te parece ruido, **respondele en el hilo explicando por que** y
resuelvelo. No pasa nada: CodeRabbit no bloquea el merge.

### Que le pedimos por carpeta

- `servicios/**` y `back/**` (.NET 10): que las integraciones externas **degraden sin
  romper** (si NASA FIRMS o SECOP fallan -> `null` o lista vacia + log, nunca propagar la
  excepcion), que **todo `HttpClient` tenga timeout** y que **no haya credenciales en el codigo**.
- `front/**` (React): que **no haya URLs de API quemadas** (deben venir de
  `import.meta.env.VITE_*`) y que **los estados de carga y vacio esten manejados**.
- Archivos de configuracion (`appsettings*.json`, `.env`, `docker-compose*.yml`): barrido
  antifugas de secretos.

### Que NO analiza

`**/bin/**`, `**/obj/**`, `**/node_modules/**`, `**/dist/**`, `investigacion-*.md` y los
lockfiles. Tambien apagamos `markdownlint` y `languagetool` para que no corrija prosa.

---

## 2. Cuanto cuesta (verificado, no asumido)

**Los repositorios publicos usan CodeRabbit gratis.** La documentacion oficial lo dice
en dos sitios:

- Pagina de precios: *"Sign up for CodeRabbit using GitHub or GitLab, install CodeRabbit
  on a public repository, and receive free reviews forever for public repositories."*
  -> https://www.coderabbit.ai/pricing
- Documentacion de planes: *"Open-source projects receive Pro+ features with no paid
  subscription required."* -> https://docs.coderabbit.ai/management/plans

O sea: `app-ungrd` es publico, asi que **no hace falta tarjeta ni suscripcion**, y las
funciones que usamos en `.coderabbit.yaml` (instrucciones por ruta, linters, escaneres
de secretos) estan cubiertas.

**Limites que si aplican** (segun la misma pagina de planes):

- El plan open source tiene entre **1 y 10 revisiones de PR por hora**, y el numero exacto
  *"varia segun el numero de estrellas del repositorio"*. Con 0 estrellas estamos en el
  extremo bajo: si abrimos 6 PRs en 10 minutos, algunos van a esperar.
- El plan gratuito de repos privados es mucho mas limitado (1 revision/hora, sin chat),
  pero **eso no nos aplica** mientras el repo siga publico.

> Si en algun momento el repo se vuelve privado, esta configuracion sigue siendo valida
> pero varias cosas dejan de ser gratis. Avisad antes de cambiar la visibilidad.

---

## 3. EL PASO MANUAL: instalar la GitHub App (solo el dueno)

**Nada de esto funciona hasta que alguien con permisos de owner sobre
`BrandowBruslyXD/app-ungrd` instale la GitHub App.** Un archivo `.coderabbit.yaml` en el
repo no activa nada por si solo. Segun la documentacion, hacen falta *"owner-level
permissions for at least one repository"* u *"organization owner permissions"*.

Pasos exactos (flujo oficial, https://docs.coderabbit.ai/platforms/github-com):

1. Entrar a **https://app.coderabbit.ai/login** y elegir **"Login with GitHub"**.
   (Alternativa equivalente: abrir **https://github.com/apps/coderabbitai** y pulsar
   *Install* / *Configure*; es la misma app oficial, publicada por `@coderabbitai`).
2. Autenticarse en GitHub como **BrandowBruslyXD**.
3. Autorizar los permisos iniciales de lectura que pide CodeRabbit (organizaciones y
   equipos asociados a la cuenta, y direcciones de correo).
4. Elegir la **cuenta personal `BrandowBruslyXD`** como destino de la instalacion
   (no una organizacion).
5. En "Repository access", seleccionar **"Only select repositories"** y marcar
   **`app-ungrd`**. Recomendado frente a "All repositories": limita el alcance del token.
6. Revisar los permisos y pulsar **"Install & Authorize"**.

Permisos que pide la app (documentados):

- **Solo lectura**: actions, checks, discussions, members, metadata.
- **Lectura y escritura**: code, commit statuses, issues, pull requests.

> El permiso de escritura sobre *code* es el que le permite ofrecer sugerencias
> aplicables con un clic; no hace push por su cuenta a `main`, y `main` sigue protegida.

7. (Opcional) En **https://app.coderabbit.ai/settings/repositories** comprobar que
   `app-ungrd` aparece como repositorio anadido.

Cuando termine, CodeRabbit empezara a comentar en los PRs nuevos. Los PRs abiertos
**antes** de la instalacion pueden necesitar un `@coderabbitai review` para arrancar.

---

## 4. OJO: con menos de 10 estrellas hay que disparar la revision a mano

Esto es importante y no es obvio. La documentacion de planes dice literalmente:

> *"For public repositories with less than 10 stars, CodeRabbit requires reviews to be
> triggered manually. Select **Trigger review** in the CodeRabbit status comment, or
> comment `@coderabbitai review` for the latest changes or `@coderabbitai full review`
> for a full review."*
> — https://docs.coderabbit.ai/management/plans

`app-ungrd` tiene **0 estrellas**. Asi que, aunque en `.coderabbit.yaml` tengamos
`auto_review.enabled: true`, **es muy probable que en la practica haya que escribir
`@coderabbitai review` en cada PR** (o pulsar el boton *Trigger review* del comentario
de estado del bot).

Dos salidas:

- **La rapida**: acostumbrarse a comentar `@coderabbitai review` al abrir el PR. Un
  segundo de trabajo.
- **La otra**: conseguir 10+ estrellas en el repo. Con un equipo de 4 no llegamos solos.

Dejamos `auto_review.enabled: true` de todas formas: no estorba, y si el repo cruza el
umbral de estrellas la revision automatica se activa sola sin tocar nada.

---

## 5. Comandos en un PR (verificados en la documentacion oficial)

Se escriben como un comentario normal en el PR. Lista oficial:
https://docs.coderabbit.ai/guides/commands

| Comando | Que hace |
|---|---|
| `@coderabbitai review` | Revision **incremental**: solo lo que cambio desde la ultima revision. **Este es el que mas vais a usar** (ver seccion 4) |
| `@coderabbitai full review` | Revision **completa** desde cero, ignorando comentarios previos. Util tras un rebase o un cambio grande |
| `@coderabbitai summary` | Regenera el resumen del PR |
| `@coderabbitai resolve` | Marca **todos** sus comentarios anteriores como resueltos. El botón de pánico para limpiar el PR |
| `@coderabbitai pause` | **Pausa** las revisiones automaticas en ese PR |
| `@coderabbitai resume` | Las reanuda |
| `@coderabbitai ignore` | **Desactiva** las revisiones automaticas de ese PR |
| `@coderabbitai approve` | Resuelve sus hilos e intenta aprobar. **NO lo useis**: ver seccion 6 |
| `@coderabbitai generate sequence diagram` | Publica un diagrama de secuencia del historial de cambios |
| `@coderabbitai configuration` | Publica la configuracion efectiva en YAML. Util para depurar este archivo |
| `@coderabbitai help` | Chuleta de sus propios comandos |

Ademas, se le puede **preguntar en lenguaje natural** respondiendo a cualquiera de sus
comentarios (por ejemplo: *"¿por que esto rompe la demo?"*). Tenemos `chat.auto_reply`
activado, asi que contesta solo.

---

## 6. CodeRabbit NO reemplaza la aprobacion humana

Que quede claro:

- La rama `main` esta protegida y **exige 1 aprobacion de una persona**. Eso no cambia.
- CodeRabbit **comenta**, no aprueba. En `.coderabbit.yaml` dejamos
  `request_changes_workflow: false` justamente para que **nunca** apruebe
  automaticamente un PR.
- Aunque exista `@coderabbitai approve`, **no lo useis**: una aprobacion de un bot no
  sustituye a que un companero mire el codigo, y en un hackathon el ojo humano es el que
  detecta "esto no es lo que pidio el jurado".
- `fail_commit_status: false`: sus hallazgos **no ponen el commit en rojo** ni bloquean
  el merge. Si CodeRabbit se equivoca, no os frena.

Regla practica: **primero revisa una persona, CodeRabbit es la segunda pasada.**

---

## 7. Como silenciarlo si a las 4 de la madrugada estorba

De menos a mas agresivo:

1. **Abrir el PR como Draft.** Tenemos `auto_review.drafts: false`, asi que CodeRabbit
   **no toca los PRs en borrador**. Cuando este listo, lo pasas a "Ready for review".
   Esta es la valvula de escape mas limpia.
2. **Poner una palabra clave en el titulo del PR**: si el titulo contiene `WIP`,
   `borrador` o `no-revisar` (sin distinguir mayusculas), CodeRabbit lo ignora.
3. **`@coderabbitai pause`** en el PR: para las revisiones automaticas de ese PR.
   `@coderabbitai resume` las reactiva.
4. **`@coderabbitai ignore`** en el PR: desactiva del todo la revision automatica ahi.
5. **`@coderabbitai resolve`**: no lo calla, pero colapsa todos sus comentarios de golpe
   y deja el PR legible.
6. **Nuclear (requiere el dueno)**: cambiar `reviews.auto_review.enabled` a `false` en
   `.coderabbit.yaml` y mergear ese cambio, o desinstalar la app desde
   `https://github.com/settings/installations`.

> No hace falta llegar al punto 6. Con Draft + `pause` se resuelve el 99% de los casos.

---

## 8. Referencias oficiales usadas

- Referencia de configuracion: https://docs.coderabbit.ai/reference/configuration
- Plantilla YAML: https://docs.coderabbit.ai/reference/yaml-template
- Configuracion via YAML: https://docs.coderabbit.ai/getting-started/yaml-configuration
- Esquema JSON (fuente de verdad): https://storage.googleapis.com/coderabbit_public_assets/schema.v2.json
- Comandos: https://docs.coderabbit.ai/guides/commands
- Instalacion en GitHub.com: https://docs.coderabbit.ai/platforms/github-com
- Planes y limites: https://docs.coderabbit.ai/management/plans
- Precios: https://www.coderabbit.ai/pricing
- GitHub App: https://github.com/apps/coderabbitai
