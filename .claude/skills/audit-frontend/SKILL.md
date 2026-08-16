---
name: audit-frontend
description: >
  Auditoría del frontend de ConectaRiesgoAI (React + TypeScript en `front`) por
  dimensiones: tipado estricto → componentes → estado → datos/API y errores de red → textos →
  reuso → seguridad → accesibilidad → performance → tests → build. Devuelve hallazgos
  priorizados por severidad, con evidencia `archivo:línea` y escenario de fallo concreto.
  Úsalo cuando pidan auditar, revisar o validar el frontend — p. ej. "audita el frontend",
  "revisa la accesibilidad del front", "auditoría pre-demo de la app web".
allowed-tools: Read, Grep, Glob, Bash
model: sonnet
---

# audit-frontend — Auditoría del frontend

Runbook repetible para auditar `front` sin concesiones.

**Persona:** Principal Frontend Engineer + Application Security Engineer.
**Idioma:** español neutro (Colombia) — **sin voseo** ("evalúa", no "evaluá"); aplica también a los
textos de UI auditados. **Evidencia:** siempre rutas clickeables `archivo:línea`.

**Contexto (define el listón).** ConectaRiesgoAI es una app ciudadana de gestión de emergencias: quien lo
usa puede estar en la calle, con un teléfono de gama baja, señal intermitente y bajo estrés. Eso
vuelve no negociables **accesibilidad**, **comportamiento con red lenta o caída** y **mensajes de
error que una persona entienda y pueda accionar**.

**Stack.** React + TypeScript en `front`. El resto (bundler, estado, runner de tests) **aún no
está decidido**: audita contra lo que usen el `package.json` y el código. Cuando aquí se nombra
una librería concreta es **como ejemplo**, no como el stack vigente. El repo no usa i18n: los
textos van hardcodeados en español neutro directamente en el código — no reportes eso como
hallazgo.

---

## Principios (no negociables)

1. **Sin concesiones.** "Funciona en dev" no es readiness. Toda desviación se reporta.
2. **Evidencia, no impresiones.** Cada hallazgo cita `archivo:línea` y el **escenario de fallo**: qué
   hace el usuario → qué resultado incorrecto obtiene.
3. **Audita lo que hay**, no una lista de librerías esperadas: "no usa X" cuando el proyecto eligió Y
   es ruido.
4. **Patrón vs. defecto local.** Lo que se repite en todas las pantallas es una entrada de deuda
   transversal, no diez hallazgos.
5. **No dupliques.** Duplicar dos veces está permitido; a la tercera repetición se extrae.
6. **El contexto de emergencia manda.** Entre elegancia técnica y que la pantalla sirva con mala
   señal o con lector de pantalla, gana lo segundo.

---

## Fase 0 — Fuentes de verdad

`CLAUDE.md` de la raíz (convenciones vigentes) · `front/package.json` y `tsconfig*.json`
(dependencias y scripts reales) · el código en `front/src`. Lo que no esté escrito en ninguna
parte no es una regla: no lo inventes.

## Fase 1 — Inventario

```bash
git status --porcelain -- front
ls front/src
node -e "const p=require('./front/package.json');console.log(Object.keys(p.scripts||{}),Object.keys(p.dependencies||{}))"
```

Estructura razonable: `components/ hooks/ services/ (o api/) store/ utils/ constants/ types/ pages/
(o routes/)`. Anota desviaciones; no las reportes si el proyecto es coherente.

## Fase 2 — TypeScript y tipado

- [ ] `strict: true` en `tsconfig` (con `strictNullChecks` y `noImplicitAny`).
- [ ] **Cero `any`**, explícito o vía `as any`. Lo desconocido es `unknown` + narrowing: un `any` en
      un servicio propaga tipos falsos a media app.
- [ ] Props tipadas con `interface`/`type`, `readonly` donde no se mutan; firmas completas.
- [ ] Tipos de la API **derivados del contrato real** (`Request`/`Response` de la rebanada en
      `back/src/ConectaRiesgoAI.Api/Features/…`). Un campo que el front cree obligatorio y llega `null` es crash.
- [ ] Variantes con **uniones discriminadas** (p. ej. el estado de un reporte); sin magic strings
      repartidos → `constants/` o unión de literales.
- [ ] Los módulos se importan por su punto de entrada, no por rutas profundas a sus archivos
      internos.

## Fase 3 — Componentes

- [ ] **Una responsabilidad por componente** (referencia: < ~200 líneas).
- [ ] **Presentacional vs. contenedor:** la UI no mezcla fetching ni reglas de negocio; esa lógica
      vive en **hooks** (`useXxx`) o servicios.
- [ ] Sin **prop drilling** de más de ~3 niveles (contexto o store).
- [ ] **Memoization donde aporta** (`memo`/`useMemo`/`useCallback`), no por reflejo en todo.
- [ ] **Limpieza de efectos:** `AbortController` por fetch, timers y listeners liberados en el
      `return`. Sin esto, navegar rápido deja peticiones vivas escribiendo sobre lo desmontado.

## Fase 4 — Estado

- [ ] Estado **global** solo para lo que lo es (sesión, tema, notificaciones), en stores enfocados con
      acciones simples, con la librería que use el proyecto — mientras sea **una sola** y consistente.
- [ ] Estado **local** para lo de la pantalla (toggles, inputs, paginación); configuración global
      escondida en un `useState` es un bug esperando.
- [ ] Lógica compleja en hooks o servicios, no en el store.
- [ ] **Una sola fuente de verdad por dato:** el mismo reporte cacheado en dos sitios se desincroniza.

## Fase 5 — Datos, API y errores de red (⚠️ eje reforzado)

- [ ] **Capa de servicios aislada y tipada** (`services/` o `api/`); ningún `fetch` suelto en un
      componente.
- [ ] Auth: `Authorization: Bearer`; **401 → refresco → reintento**; el logout limpia el estado.
- [ ] Los tres estados **cargando / éxito / error** se renderizan siempre. Solo el camino feliz deja
      al usuario mirando un vacío cuando falla la red.
- [ ] **Timeout explícito** en cada llamada: sin él, con señal débil el spinner gira para siempre.
- [ ] **Reintento** con backoff solo en operaciones idempotentes; **nunca ciego** en las que crean
      datos — reenviar un reporte tres veces genera tres reportes.
- [ ] **Conexión intermitente:** ¿qué pasa si se cae la señal enviando un reporte con foto? Debe
      haber detección de desconexión y una salida real: guardar el borrador, reintentar al volver la
      conexión o, como mínimo, avisar que no se envió y conservar lo escrito. Perderlo es crítico.
- [ ] **Errores comprensibles y accionables**, en español neutro: qué pasó y qué hacer ("No pudimos
      enviar tu reporte. Revisa tu conexión e intenta de nuevo"). Nunca `Error 500`, `undefined`, un
      stack trace ni el mensaje crudo del backend.
- [ ] **Doble envío bloqueado:** botón deshabilitado mientras la petición está en vuelo.
- [ ] **Paginación** en toda lista (`skip`/`take` + total y controles). Cargar la lista completa es
      lento en la red del usuario y caro en su plan de datos.

## Fase 6 — Textos

El repo no usa i18n: los textos de UI van hardcodeados en español neutro, directamente en el
código. Eso no es un hallazgo — lo que sí se audita es la calidad del texto:

- [ ] Español **neutro colombiano, sin voseo**, frases cortas, sin jerga ni nombres internos de
      estados (enums, códigos): el usuario está en emergencia, no leyendo un manual.
- [ ] Labels, botones, placeholders, errores, estados vacíos, `aria-label` y títulos tienen texto
      real y comprensible — nada de claves crudas, `TODO`, texto de relleno ni cadenas vacías.
- [ ] Consistencia de tono y terminología entre pantallas para el mismo concepto (p. ej. un mismo
      estado del reporte no se nombra distinto en dos vistas).
- [ ] Fechas y números formateados con criterio (`Intl` u otro), no concatenados a mano de forma
      que rompa con valores límite.

## Fase 7 — Reuso

- [ ] Componentes base (botón, input, modal, card, spinner, estado vacío) definidos **una vez** en
      `front/src/components`; nada de tres botones casi iguales.
- [ ] Lógica repetida entre pantallas → hook compartido, no copiar-pegar.
- [ ] Reglas de presentación duplicadas (formatear un estado, colorear una prioridad) centralizadas:
      dispersas, al cambiar el catálogo de estados se actualizan unas y otras no.

## Fase 8 — Seguridad

- [ ] **Tokens fuera de `localStorage`/`sessionStorage`** (memoria o cookie `httpOnly` del backend).
      Un XSS con el token en `localStorage` es una cuenta robada.
- [ ] **`dangerouslySetInnerHTML` ausente**, o sanitizado (p. ej. DOMPurify) y justificado. Ojo con
      contenido del ciudadano o de la IA: es entrada no confiable.
- [ ] **Sin secretos en el bundle.** Todo lo que llega al front es público: llaves de API con
      privilegios o credenciales en variables de entorno del cliente son filtraciones aunque el
      `.env` no esté commiteado.
- [ ] **Datos sensibles fuera del almacenamiento del navegador y de los logs:** ubicación exacta,
      teléfono, documento, nombre y foto de una persona afectada no van a `localStorage`, ni a
      `console.log`, ni a query params (quedan en historiales y en logs de proxies).
- [ ] `console.*` fuera de producción, o tras un logger que no imprima payloads.
- [ ] Redirecciones controladas por el usuario validadas contra lista blanca; `target="_blank"` con
      `rel="noopener noreferrer"`.
- [ ] La validación del cliente es **UX, no control de seguridad**: autorización y validación reales
      las impone el backend. Comprueba además que la UI no muestre datos ajenos al usuario (que el
      reporte le pertenezca), aunque la API los devolviera.

## Fase 9 — Accesibilidad (WCAG 2.1 AA — ⚠️ eje reforzado)

- [ ] **HTML semántico** (`<button>`, `<nav>`, `<main>`, `<form>`, encabezados). Un `<div onClick>` no
      recibe foco ni responde a Enter: para teclado y lector de pantalla, ese botón no existe.
- [ ] `<label htmlFor>` en cada input; encabezados sin saltos; `alt` descriptivo en imágenes
      informativas y `alt=""` en las decorativas.
- [ ] **Contraste ≥ 4.5:1**, pensando en pantalla al sol. Nunca el color como único portador de
      información (estado, prioridad, gravedad): añade texto o ícono.
- [ ] **Teclado completo** y **foco visible** en todo lo interactivo; foco gestionado al abrir y
      cerrar modales, sin trampas de foco.
- [ ] **Áreas táctiles ≥ 44×44 px**; usable con una mano en pantalla pequeña.
- [ ] **ARIA donde aporta:** `aria-live` para estados y errores (si no, el lector no anuncia que el
      envío falló), `aria-label` en botones de solo ícono, `aria-invalid` + mensaje asociado.
- [ ] Respeta `prefers-reduced-motion`; nada crítico depende de una animación o de un temporizador
      que no se pueda extender.

## Fase 10 — Performance (bajo red lenta)

- [ ] **Code-splitting por ruta** (`React.lazy` + `Suspense`) y bundle vigilado: cada 100 KB extra son
      segundos reales en 3G. Revisa dependencias pesadas que entran por una sola función.
- [ ] Sin re-renders innecesarios; `key` estable (no el índice si la lista se reordena o filtra).
- [ ] Imágenes con carga diferida y tamaños responsivos, y **compresión antes de subir** la foto del
      reporte: enviar 8 MB con señal débil es un envío que no termina.
- [ ] Source maps fuera de producción; sin dependencias muertas.

## Fase 11 — Tests

Con el runner que use el proyecto (Vitest, Jest u otro) y React Testing Library o equivalente; lo que
importa es **qué** se prueba:

- [ ] **Queries accesibles** (`getByRole`, `getByLabelText`, `getByText`); `getByTestId` o clases solo
      como último recurso: un test que solo pasa con `data-testid` no prueba que la pantalla sea usable.
- [ ] `userEvent` (no `fireEvent`) y esperas asíncronas explícitas (`findBy`/`waitFor`).
- [ ] Hooks probados aislados, cubriendo **cargando, éxito y error** — el camino de error es el que
      más se rompe y el menos probado.
- [ ] Casos del contexto: **fallo de red**, **timeout**, respuesta vacía y **doble clic en enviar**.
      Que "envía el reporte" pase no dice nada sobre qué ocurre sin señal.
- [ ] **Cobertura real:** un script `test` inexistente, o uno que pasa sin tests
      (`--passWithNoTests`), es verde que no prueba nada. Repórtalo como gap.
- [ ] Nombres orientados al usuario: `muestra … cuando …`, `deshabilita el botón mientras envía`.

## Fase 12 — Build

- [ ] `npm run build` sin errores · `npx tsc --noEmit` limpio · `npm test` en verde y con tests reales.
- [ ] `npm run lint` limpio si el script existe; `npm audit` sin vulnerabilidades altas sin justificar.
- [ ] Sin `.env.local` / `.env.production` commiteados; funcionalidad a medias detrás de un flag.

---

## Fase 13 — Consolidación de hallazgos

**Severidades**, de más a menos grave:

- 🔴 **Crítica** — bloquea el release: vulnerabilidad, pérdida de datos del usuario, barrera de a11y
  que impide usar la app, crash en un camino principal.
- 🟠 **Alta** — rompe un caso de uso relevante o degrada seriamente la experiencia en condiciones
  reales (red lenta, móvil de gama baja).
- 🟡 **Media** — defecto acotado, deuda que crecerá, convención incumplida con impacto.
- 🔵 **Baja** — mejora clara sin impacto inmediato.
- ⚪ **Informativa** — observación o patrón transversal del repo.

Por hallazgo: **título · severidad · evidencia `archivo:línea` clickeable · escenario de fallo
concreto · recomendación**. Distingue **bloqueantes** de lo que puede ir tras el release.

**Salida por defecto:** informe inline con la plantilla de abajo; si piden archivo, guárdalo en la
ruta que indiquen. Cierra siempre con **veredicto** (LISTO / NO LISTO + pendientes bloqueantes) y
**ofrece** aplicar los arreglos de severidad media y baja dejando `npm run build`, `npx tsc --noEmit`
y `npm test` en verde.

### Comandos de verificación rápidos

```bash
grep -rnE ":\s*any\b|\bas any\b|<any>" front/src --include=*.ts --include=*.tsx | grep -v ".d.ts"
grep -rnE "dangerouslySetInnerHTML|(local|session)Storage\.(set|get)Item" front/src
grep -rn "fetch(" front/src --include=*.tsx                          # fetch fuera de servicios
grep -rn "AbortController\|signal:" front/src                        # cancelación
grep -rnE "<(div|span)[^>]*onClick" front/src --include=*.tsx        # a11y
grep -rn "console\." front/src
( cd front && npm run build && npx tsc --noEmit && npm test )        # verde de verdad
```

### Plantilla de reporte (inline)

```markdown
# Auditoría — Frontend ConectaRiesgoAI
**Veredicto:** <LISTO / NO LISTO — 1-2 líneas + estado de build / tsc --noEmit / test>

## Lo que está bien
- <p. ej. TS strict sin `any` · textos claros y consistentes · estados de error cubiertos · foco visible>

## Hallazgos
### 🔴 Crítica — <título>
[front/src/…/Componente.tsx:42](front/src/…/Componente.tsx#L42): <defecto> →
<escenario: qué hace el usuario y qué obtiene> → <recomendación>.
### 🟠 Alta — <título>
### 🟡 Media — <título>
### 🔵 Baja — <título>
### ⚪ Informativa — <título>   (p. ej. patrón repetido en todo el front)

## Bloqueantes para el release
1. <hallazgo crítico o alto>

### Nits
```

**Los seis defectos que ninguna herramienta delata** y que aquí duelen más — revísalos siempre antes
de cerrar: script `test` ausente o con `--passWithNoTests` · solo el camino feliz, sin estados de
carga y error · fetch sin timeout ni cancelación, o reintento ciego en un envío · placeholders,
estados vacíos o `aria-label` con texto crudo, técnico o vacío en vez de un mensaje real · tokens o
datos del ciudadano en `localStorage` o en consola · `<div onClick>` y el color como única señal de
gravedad.
