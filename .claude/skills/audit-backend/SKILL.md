---
name: audit-backend
description: >
  Auditoría de arquitectura, seguridad y calidad del backend .NET de ConectaRiesgoAI,
  organizado en Vertical Slice (`Features/<Feature>/<CasoDeUso>/`): autocontención de la
  rebanada, invariantes, caminos de fallo, superficie HTTP, tests que blindan las reglas y
  build en verde, con hallazgos priorizados y evidencia `archivo:línea`. Úsalo cuando pidan
  "audita el backend", "revisa la rebanada de CrearReporte", "valida la feature de Ayudas"
  o "auditoría del backend antes de la demo".
allowed-tools: Read, Grep, Glob, Bash
model: sonnet
---

# audit-backend — Auditoría del backend (Vertical Slice)

Runbook repetible para auditar **una rebanada, una feature o todo `back`**, sin concesiones.

**Persona:** Arquitecto de Software Senior + Application Security Engineer.
**Idioma:** español neutro (Colombia). **Evidencia:** rutas clickeables `archivo:línea`.
**Stack:** .NET sobre **Vertical Slice** — sin capas por feature ni matriz de dependencias entre
proyectos. El motor de datos **no está decidido**: audita la persistencia de forma agnóstica y, si
necesitas un ejemplo, usa uno neutro (`IQueryable`/EF Core) sin afirmar que el proyecto ya lo usa.

```
back/src/ConectaRiesgoAI.Api/
  Features/<Feature>/<CasoDeUso>/   Endpoint · Command/Query · Response · Handler · Validator
  Domain/           modelo compartido: Entities, Enums, ValueObjects
  Persistence/       EF Core: Configurations, Migrations
  Common/           transversal real: auth, errores, paginación, resultados, logging
  Integrations/     clientes HTTP de APIs externas (NASA FIRMS, SECOP)
```

## Principios (no negociables)

1. **Contrato primero.** `CLAUDE.md` de la raíz y el issue de la feature, antes de juzgar código.
2. **Sin concesiones.** "Funciona" no es justificación; toda desviación se reporta.
3. **Evidencia, no impresiones.** Cada hallazgo cita `archivo:línea` y describe un escenario de
   fallo concreto (entradas/estado → salida incorrecta).
4. **Calibra contra rebanadas hermanas.** Un patrón que repiten todas es deuda transversal o
   convención de facto, no defecto de la rebanada auditada.
5. **No cambies la arquitectura en silencio.** Lo estructural (subir algo a `Common/`, introducir
   una abstracción, romper el contrato) se propone como issue `tech-debt`; no se parchea callando.
6. **Corrige en la raíz:** en el handler o la entidad dueña de la regla, no en el llamador.
7. **No dupliques deuda** ([Regla anti-duplicados](#regla-anti-duplicados)).

---

## Fase 0 — Fuentes de verdad

- **`CLAUDE.md` de la raíz:** convenciones, reglas de la arquitectura slice, quality gate. Única
  fuente normativa; si algo no está ahí, no lo inventes como norma.
- **Issue de GitHub de la feature**, si existe: alcance, estados y reglas prometidas; de ahí salen
  las invariantes a verificar. Si no hay issue, dilo en el informe y audita contra `CLAUDE.md` más
  lo que el código declare (XML docs, estados, validadores). No supongas requisitos.
- **Deuda ya registrada:** issues `tech-debt` abiertos y cerrados. Lo que ya tiene issue se cita
  como `#NNN`, no se vuelve a proponer.

## Fase 1 — Inventario de rebanadas

```bash
git status --porcelain
find back/src/ConectaRiesgoAI.Api/Features -maxdepth 2 -type d | sort
find back -name "*.cs" -not -path "*/bin/*" -not -path "*/obj/*" | sort
```

Por rebanada anota: piezas ausentes (sin validador, respuesta que reusa la entidad) y lógica suya
que viva fuera de su carpeta. Las rebanadas nuevas o modificadas se auditan a fondo.

## Fase 2 — La rebanada como unidad

- [ ] **Autocontención:** el caso de uso se lee de arriba abajo en su carpeta —entrada, validación,
      regla, datos— sin saltar a otra feature.
- [ ] **Cero acoplamiento entre rebanadas:** ningún `using` de `Features.<OtraFeature>`; ni
      `Request`/`Response`, ni handlers, ni helpers ajenos.
- [ ] **Endpoint delgado:** traduce HTTP ↔ handler. Un `if` de negocio, una consulta o la
      construcción de la entidad en el endpoint es hallazgo.
- [ ] **El handler es dueño de la regla.** Si la invariante debe sostenerse en varias rebanadas,
      vive en la entidad de la feature, no copiada en cada handler.
- [ ] **Sin capas fantasma:** nada de `Application`/`Domain`/`Infrastructure` por rebanada,
      repositorios genéricos ni mediator que no aporte.
- [ ] **Duplicar sí, abstraer pronto no:** extraer se justifica en la **tercera** repetición.
      Reporta tanto la abstracción nacida en la segunda como la quinta copia desincronizada.

## Fase 3 — Modelo y reglas de negocio

- [ ] **La entidad protege sus invariantes:** muta por métodos que validan, no por asignación desde
      el handler. Un saco de setters públicos deja la regla a merced de quien la use.
- [ ] **No mutar ante entrada inválida:** el método que lanza por validación NO deja la entidad a
      medio transicionar. Trampa típica: validar un parámetro *después* de asignar el nuevo estado.
- [ ] **Máquina de estados declarada y validada:**
      `Reportado → Validado → Priorizado → Ayuda asignada → En atención → Entregado → Confirmado`
      contra un mapa `From→To` explícito; transición no declarada → conflicto (409); terminales sin
      salidas; y **alcanzabilidad** —todo estado alcanzable desde el inicial y al menos un terminal
      alcanzable—, no solo "existe un terminal".
- [ ] **Historial append-only** donde aplique (seguimiento, decisiones): se agrega, no se sobrescribe.
- [ ] **Sin lógica en los DTOs**; validación de entrada antes de tocar el modelo; **errores de
      negocio ≠ técnicos** (validación, conflicto, no-encontrado son tipos y códigos distintos).

## Fase 4 — Persistencia y caminos de fallo

- [ ] **Toda lectura/escritura filtra por pertenencia** del dato al solicitante (Fase 7).
- [ ] **Índices y unicidad alineados** con las consultas reales; su creación no rompe si ya existen
      y ocurre una sola vez al arrancar. **Sin lógica de negocio** en el acceso a datos.
- [ ] **Normalización consistente de claves** (mayúsculas, acentos, espacios) en *todas* las
      consultas, incluidos los filtros de listado: normalizar al escribir y no al listar produce
      resultados fantasma.
- [ ] **Caminos de fallo diseñados** — cada método es un límite de confianza y estos defectos son
      invisibles en el camino feliz (no los ve el compilador ni el analizador estático):
  - **Estado mutado antes de I/O:** si la entidad se muta en memoria antes de un `await` que puede
    lanzar (versión de concurrencia optimista, contadores, marcas de tiempo), ¿se restaura en
    **todas** las salidas —fallo esperado, excepción y cancelación— o solo en una? Restaurar
    únicamente en el fallo previsto deja el objeto adelantado tras un timeout o un corte de red, y
    contamina reintentos y lógica posterior.
  - **Promesa vs. garantía:** por cada comentario o XML doc que declare una garantía ("se continúa
    aunque uno falle", "es idempotente", "nunca lanza"), localiza la línea que la implementa y
    comprueba que la cubre entera. Un `catch` de un tipo concreto bajo una promesa de continuidad
    ante *cualquier* fallo es más estrecho que lo prometido: un fallo de conexión aborta el resto.
  - **Degradación silenciosa:** `TryParse` con fallback, `??`, `FirstOrDefault()` sin comprobar,
    `catch { return null; }`. La pregunta no es si hay fallback, sino si el centinela **se persiste,
    se audita, se registra o decide autorización**. En campos de identidad y trazabilidad (usuario
    creador, id del reporte, contacto, canal de origen) es **siempre** hallazgo.
  - **Cancelación:** `OperationCanceledException` nunca se traga en un bucle de "continuar pese a
    fallos" — cancelar debe cancelar; y el `CancellationToken` se propaga hasta la última llamada de
    I/O, si se corta a medio camino la cancelación es decorativa.

## Fase 5 — Superficie HTTP

- [ ] **Autorización real:** autenticación en todo endpoint salvo `[AllowAnonymous]` justificado
      (p. ej. el webhook de mensajería, que entonces exige validación de firma), **más pertenencia
      del dato**: el ciudadano solo ve sus reportes, el rol operativo solo hace lo suyo. Tomar la
      identidad del cuerpo o la query en vez del token es hallazgo crítico.
- [ ] **DTOs `record` inmutables**, sin exponer entidades persistidas; timestamps ISO-8601 UTC.
- [ ] **Paginación en todo listado**, con tope máximo para que un `pageSize` enorme no tumbe el
      servicio.
- [ ] **Códigos HTTP correctos** (200/201/204/400/401/403/404/409/500) y coherentes con los errores
      de la Fase 3; sin stack traces ni detalles internos en la respuesta.
- [ ] **Compatibilidad de contrato:** los cambios aditivos no rompen; renombrar o quitar campos,
      cambiar tipos o endurecer validaciones sí, y se reporta con el impacto en `front/src`.

## Fase 6 — `Common/` (¿es transversal de verdad?)

- [ ] **Cada tipo de `Common/` lo usan varias rebanadas.** Compruébalo:
      `grep -rn "NombreDelTipo" back/src/ConectaRiesgoAI.Api/Features --include=*.cs`. Si lo usa una sola, bájalo.
- [ ] **No es un cajón de sastre:** ahí caben auth, errores HTTP, paginación, resultados y logging.
      Reglas de negocio de una feature disfrazadas de "helper compartido" son hallazgo.
- [ ] **Lo que debería estar arriba y no está:** la misma constante, formato de error o paginación
      reescritos en tres rebanadas ya justifica subirlos.
- [ ] **Claves de frontera:** todo valor que deba **coincidir** con otro sitio —frontend,
      almacenamiento, otra rebanada— es `public const` en `Common/`, no un literal repetido. Este
      defecto vive *entre* dos archivos; se escapa si solo miras uno.

## Fase 7 — Seguridad

- [ ] **Autorización y pertenencia** en todas las consultas y comandos; la identidad sale del token.
- [ ] **JWT:** emisor, audiencia, expiración y firma validados; claves desde configuración segura.
- [ ] **Secretos:** nada sensible en `appsettings.json` (cadenas de conexión, claves de firma,
      credenciales de mensajería o del proveedor de IA): variables de entorno o gestor de secretos.
- [ ] **Datos personales del ciudadano** —teléfono, ubicación exacta, contenido de mensajes y
      adjuntos— no se registran, no se devuelven a quien no es dueño del reporte y no se envían al
      proveedor de IA más allá de lo necesario.
- [ ] **Validación server-side** de todo lo que llega, incluidos adjuntos (tipo, tamaño) y el texto
      que luego se interpola en una consulta o en un prompt.
- [ ] **Llamadas externas** con timeout y manejo de fallo; lo best-effort no filtra excepciones ni
      tumba el caso de uso.

## Fase 8 — Tests (que **blinden las invariantes**, no que cubran líneas)

- [ ] **Tests que siguen las rebanadas**, nombrados `[Método]_[Condición]_[ResultadoEsperado]`, AAA.
- [ ] **¿Protegen realmente las invariantes?** — esto separa una auditoría real:
  - **Mock que no prueba nada:** un doble del acceso a datos que **ignora el filtro** hace pasar
    cualquier test de aislamiento. Si el test pide el reporte de otro ciudadano y el mock lo
    devuelve igual, no prueba la autorización: prueba el mock. Blíndalo capturando el
    predicado/consulta real y afirmando sobre él, o con una base de datos en memoria.
  - **No-mutación ante throw:** un test de "lanza validación" debe afirmar **también** que la
    entidad quedó intacta (estado e historial), y **vale igual para fallos de I/O**: si el handler
    muta antes de persistir, hay que probar que un fallo de escritura —no solo el conflicto
    esperado— la deja como estaba.
  - **Alcanzabilidad:** hay tests de estado huérfano y terminal inalcanzable, no solo del camino
    feliz de transiciones.
- [ ] **Gaps:** anota como hallazgo los caminos críticos sin test; no los des por cubiertos porque
      "el handler es simple".

## Fase 9 — Pase transversal de calidad (eje propio, no por rebanada)

- [ ] **Un tipo público por archivo**; **`var` prohibido** salvo proyecciones anónimas de LINQ;
      campos privados `_camelCase`; DTOs `record` inmutables; ISO-8601 UTC. `.Tests` exento de `var`.
- [ ] **XML docs en español** en todo tipo y miembro con lógica, sea cual sea su visibilidad — el
      build no lo detecta, CS1591 solo ve lo públicamente visible. `/// <inheritdoc />` es válido y
      suficiente al implementar un contrato. Exentos: constructores que solo asignan y `.Tests`.
- [ ] **Métodos < 50 líneas**; una responsabilidad por método.
- [ ] **Calidad del registro (logging)** — eje propio: el nivel equivocado no lo detecta ni el
      compilador ni el analizador estático:
  - **Nivel correcto**, vigilando los antipatrones: `Warning` con excepción para algo que no se
    recuperó (→ `Error`); entrada inválida rechazada, que es el sistema funcionando (→ `Information`);
    ruido de arranque que se repite en cada despliegue (→ `Debug`); una línea por elemento al
    procesar un lote (→ `Debug`, o un resumen al final). `Critical` se reserva para lo que lo es:
    acceso a datos de otro ciudadano, servicio que no arranca, inconsistencia en datos persistidos.
  - **Plantilla constante** con placeholders con nombre (`"Reporte {ReporteId} priorizado"`), nunca
    interpolación de cadenas.
  - **Contexto mínimo** en registros de negocio: identificador de la entidad afectada y del actor.
  - **Excepción como primer argumento** en `LogError`/`LogCritical`.
  - **Sin datos sensibles:** identificadores sí, contenido no. Vigila los volcados de `Trace` y los
    cuerpos completos, donde se cuela un token, un teléfono o la ubicación de una persona.
  - **¿Se podría diagnosticar sin depurar?** — el hueco que nadie audita. Toma el camino de fallo
    más probable de la rebanada y pregúntate si sus registros bastarían para **explicarlo** en
    producción. La **ausencia** de `Debug` en puntos de decisión, fronteras externas y
    transformaciones no obvias es un **hallazgo**, no un estado neutro. Y la otra mitad: si la
    secuencia de `Information` del caso de uso no cuenta la historia completa, no habrá por dónde
    empezar a mirar.

## Fase 10 — Build + tests en verde

```bash
dotnet build back --nologo
dotnet test  back --nologo
```

Reporta resultado y conteo de tests, y **corre ambos tras cualquier fix** hasta dejarlos verdes: una
auditoría que termina con el build roto no terminó. Verifica también que, en el código auditado,
`var` fuera de proyecciones LINQ y archivos con más de un tipo público sean cero.

---

## Fase 11 — Consolidación de hallazgos

**Severidad:** `Crítica` (bloquea release / fuga de datos) · `Alta` · `Media` · `Baja` ·
`Informativa`, de más a menos severo. Por hallazgo: **título · severidad · evidencia
`archivo:línea` · escenario de fallo · recomendación concreta**, distinguiendo **bloqueantes** de
**post-demo**.

**Salida por defecto:** informe inline. Si piden informe escrito, guárdalo en
`docs/auditorias/AUDIT-BACKEND-<feature>-<AAAA-MM-DD>.md` (la fecha en el nombre; no la calcules con
`Date.now()` en un script). Cierra con **veredicto** (LISTO / NO LISTO + pendientes) y **ofrece**:
aplicar los fixes de severidad media/baja dejando los tests verdes, o proponer la deuda como issue
`tech-debt`.

### Regla anti-duplicados

**Nunca crees un issue de deuda que ya existe.** Cruza cada hallazgo contra los issues `tech-debt`
**abiertos y cerrados**; deuda repetida es ruido que alguien tendrá que limpiar a mano. `gh` no está
en el PATH: invócalo por ruta completa — PowerShell `& "C:\Program Files\GitHub CLI\gh.exe" …` ·
Bash `"/c/Program Files/GitHub CLI/gh.exe" …`

```bash
"/c/Program Files/GitHub CLI/gh.exe" issue list --label tech-debt --state all --limit 200 \
  --json number,title,state,stateReason
```

| Situación | Acción |
|---|---|
| Issue **abierto** que cubre el hallazgo | **No crees nada.** Cítalo como `#NNN`; si aportas evidencia nueva, coméntala ahí |
| Issue **cerrado como "not planned"** | **No lo re-propongas** — es memoria de una decisión tomada; menciónalo como informativo si sigue vigente |
| Issue **cerrado como resuelto** y el defecto reaparece | Es **regresión**, no deuda: propón `bug` referenciando el original |
| Cubre *parte* del hallazgo | Propón solo el **delta** y enlaza el issue existente |
| Sin coincidencia | Propón el issue nuevo |

Si no hay acceso a `gh` o el repo aún no tiene remoto en GitHub: **no crees nada**; deja la
propuesta redactada en el informe y adviértelo explícitamente.

### Plantilla de reporte (inline)

```markdown
# Auditoría — Backend · <feature o rebanada>
**Veredicto:** <resumen 1-2 líneas + estado de build y tests>

## Lo que está bien (conformidad verificada)
- Rebanadas autocontenidas · invariantes con tests · autorización por pertenencia · …

## Hallazgos
### 🔴 Crítica — <título>
[Archivo.cs:42](back/src/ConectaRiesgoAI.Api/Features/<Feature>/<CasoDeUso>/Archivo.cs#L42): <defecto> →
<escenario de fallo> → <recomendación>.
### 🟠 Media — <título>
…
### ⚪ Informativa — <título>  (p. ej. patrón repetido en todas las rebanadas)

### Nits
- <literales repetidos / nombres inconsistentes / …>
```

---

## Trampas de una app slice nueva (checklist de "gotchas")

1. **Rebanada que importa tipos de otra** (el `Response` de `ListarReportes` reusado en
   `ListarAyudas`): las acopla para siempre. Duplica el record o súbelo a `Common/`.
2. **`Common/` como cajón de sastre:** helpers de una sola rebanada o reglas de negocio escondidas
   ahí "para no repetirse".
3. **Validar después de mutar:** el `throw` deja la entidad a medio transicionar y el siguiente
   `await` la persiste corrupta.
4. **Endpoint con lógica:** el `if` de negocio colado en el minimal API, que ningún test de handler
   cubre porque el handler ni se entera.
5. **Test que mockea el acceso a datos ignorando el filtro:** verde y sin valor; prueba el mock.
6. **Abstracción prematura en la segunda repetición:** la interfaz genérica con dos usos que ya no
   encaja en el tercero. Duplicar es más barato que desabstraer.
7. **Identidad tomada de la petición** en vez del token: fuga de datos entre ciudadanos esperando a
   que alguien cambie un id en la URL.
8. **Listado sin paginación** que funciona con los 20 registros de la demo y no con los reales.
9. **Textos de dominio** (mensajes de seguimiento, entradas de historial) son texto server-side de
   auditoría, **no** cadenas de UI: no los confundas con lo que pasa por i18n en el frontend.
