# Estado del desarrollo — 4 de agosto de 2026

Resumen de una jornada de trabajo sobre wabots, usando como caso real el bot de ventas de
**Holy Cosmetics** (cliente de BizzGrowth, e-commerce de cosmética en Bogotá).

El detalle cronológico de cada hallazgo está en [`pruebas/HALLAZGOS.md`](./pruebas/HALLAZGOS.md)
(1.285 líneas, 11 bugs). Este documento es la foto del estado.

---

## 1. De dónde salieron los datos

El trabajo arrancó en otra plataforma. El cliente usaba **Wizybot** y quería reemplazarlo; se
probó primero **LETY.AI** y luego se decidió concentrar el esfuerzo en wabots.

De ese recorrido queda un activo que vale más que el código: **el histórico real de la operación**.

| Dato | Valor |
|---|---|
| Conversaciones exportadas de Wizybot (feb–ago 2026) | 3.200 |
| Mensajes | 47.531 |
| Mensajes escritos por agentes humanos | 22.035 |
| Mensajes generados por la IA anterior | **511 (2%)** |
| Conversaciones con imagen o audio del cliente | **988 (31%)** |
| Catálogo reconstruido con precio y URL reales | **133 productos** |

El bot anterior no respondía mal: **respondía el 2%**. Todo lo sostenía el equipo a mano.

Los temas reales, por frecuencia: envíos 22%, toma de pedido 21%, pagos 18%, stock 13%,
precios 12%, garantías 8%, rastreo 8%. **Envíos + pedido + pago concentran el 61%.**

El catálogo salió de un descubrimiento: Wizybot inyectaba su catálogo en el prompt del sistema y
esos mensajes quedaron guardados, con nombre, precio en COP y URL de Shopify de cada producto.
Está en `cliente-nuevo/analisis/catalogo.json`.

---

## 2. Lo que se construyó en el motor

Cinco cambios, todos compilados, desplegados en el servidor y verificados.

### `graph-rules.ts` — validación de coherencia en el backend

Antes las reglas lógicas vivían **solo en el editor**, así que todo lo que entraba por la API
—incluido lo que genera el Constructor IA— las esquivaba: el backend solo comprobaba ids, tipos y
posiciones. De ahí salían flujos guardados con condiciones sin ramas y handles sueltos.

Ahora `inspectGraph()` devuelve `{errors, warnings}` en la respuesta de `create`/`update`, y
`autoRepairGraph()` arregla lo mecánico. Cubre 17 reglas, de las cuales **8 no existían en ningún
sitio**: handle `onError` conectado, `exitMarker` coherente con el prompt, marcadores que el motor
no limpia, `invalidPrompt` presente, `validate` acorde al dato, un dato por captura, alcanzabilidad
de un final, ramas de condición al mismo destino.

No bloquea el guardado —un flujo a medio diseñar tiene nodos sueltos legítimamente— pero el
generador sí lo usa como filtro.

### `ai-agent.executor.ts` — salidas múltiples por intención

El nodo era **binario**: una salida `out` disparada por palabras clave o un marcador único. Eso
obligaba a listas de keywords que nunca alcanzan, porque el cliente dice "si por favor" en vez de
"quiero comprar" y "no está funcionando" en vez de "garantía".

Ahora acepta `exitIntents: [{id, when, pattern?}]` y genera un handle **`intent:<id>`** por cada
una, igual que `interactiveMenu` genera `opt:<id>`. La IA clasifica según lo que el cliente
necesita; el motor enruta.

Y el campo `pattern` permite resolver por **la forma** del mensaje, sin llamar al modelo: un texto
con cédula y dirección es un bloque de datos de pedido, y una expresión regular lo resuelve igual
en todas las corridas. Fue lo que llevó el enrutamiento de inestable a **10/10 en tres corridas**.

### Instrucciones de intención: "no hagas tú la gestión"

Al clasificar bien, la IA hacía el trabajo ella misma —pedía los datos del pedido en el chat— y el
subflujo determinista nunca se ejecutaba, así que los datos no quedaban guardados. Ahora las
instrucciones que inyecta el motor le dicen explícitamente que su mensaje debe ser solo una frase
de transición y el marcador.

### `node-catalog.ts`

Documenta `exitIntents`, `intent:<id>` y `pattern` para que el Constructor IA pueda generarlos.

### Configuración: `FLOW_AGENT_PROVIDER`

El Constructor devolvía 504 con un mensaje engañoso ("revisa que tenga API key"). La causa era
`FLOW_AGENT_PROVIDER=deepseek` apuntando a una **API key muerta** (401) en lugar de la sesión web
activa. Cambiado a `deepseek_web`, con backup del `.env.server`.

---

## 3. Estado del bot de Holy Cosmetics

| Elemento | Estado |
|---|---|
| Empresa | `Holy Cosmetics` — **PENDING** (sin activar) |
| Flujo | "Jessika — Ventas y atención Holy Cosmetics", versión 21 |
| Grafo | 27 nodos, 38 conexiones |
| Prompt | 9.784 caracteres, con los 133 productos y 10 reglas de negocio |
| Intenciones | `compra` (+patrón), `rastreo`, `garantia`, `mayoreo`, `asesor` |
| Palabras clave | 48, extraídas del histórico real |
| Media | transcripción (Whisper) y OCR (Tesseract) verificadas con audio e imagen reales |
| **`tenantId` del flujo** | **`null`** — el flujo no está asignado a la empresa |

Composición: 1 `trigger`, 1 `transcribeAudio`, 1 `ocrImage`, 1 `aiAgent`, 3 `interactiveMenu`,
3 `captureInput`, 8 `sendText`, 1 `httpRequest`, 5 `handover`, 3 `end`.

---

## 4. Banco de pruebas

Cuatro baterías, todas reutilizables y con refresco de token automático.

| Script | Qué comprueba | Resultado |
|---|---|---|
| `pruebas/avance.js` | 10 casos de enrutamiento: 6 que deben avanzar y 4 que no | **10/10**, estable en 3 corridas |
| `pruebas/estres.js` | 16 casos adversariales contra las reglas del negocio | **16/16 (100%)** |
| `pruebas/emular-agosto.js` | 15 conversaciones reales de agosto, 69 turnos | 0 errores, 0 invenciones, 12/15 avanzan |
| `pruebas/validar-grafo.js` | Auditoría del grafo con 13 reglas | 0 errores, 7 avisos menores |

Se prueba por `POST /api/flows/:id/simulate`, que devuelve el **`trace`** del recorrido — la señal
más útil de todo el proyecto: dice qué nodos pasó, no solo qué contestó.

Dos detalles para automatizar: el token está atado al User-Agent y hay sesión única, así que las
pruebas corren dentro del navegador autenticado; y el endpoint limita a **30 peticiones/minuto**,
que obliga a espaciar ~4 s.

---

## 5. Los 11 bugs encontrados

| # | Bug | Origen | Estado |
|---|---|---|---|
| 1 | Handles `onError` sin conectar → el flujo muere en seco | Constructor IA | corregido |
| 2 | Marcadores `[PRECIO]` filtrados al cliente y enrutamiento nunca disparado | Constructor IA | corregido |
| 3 | `markerRegex` acepta corchete simple pero `stripInternalTokens` solo limpia doble | motor | documentado |
| 4 | Constructor caído por `FLOW_AGENT_PROVIDER` con API key muerta | configuración | corregido |
| 5 | `captureInput` de dirección pedía tres datos en uno → se perdían | Constructor IA | corregido |
| 6 | Menús sin `invalidPrompt` → bucle silencioso con notas de voz | Constructor IA | corregido |
| 7 | Cédula sin validación | Constructor IA | corregido |
| 8 | El agente inventaba productos y categorías enteras (sérums, SPF) | falta de catálogo | corregido |
| 9 | Nota de voz dentro de un menú deja la conversación en bucle | **motor — pendiente** | abierto |
| 10 | El flujo pedía los datos de uno en uno; el cliente los manda juntos | diseño del flujo | corregido |
| 11 | Prometía revisar pedidos que no puede consultar | prompt | corregido |

**Diez de once eran del generador, de la configuración o del prompt. Solo dos tocan el motor**, y
uno de ellos (el 9) sigue abierto.

---

## 6. Lo que falta, por orden de impacto

### Bug 9 — normalizar media en el engine

Una nota de voz dentro de un `interactiveMenu` o un `captureInput` **se descarta en silencio** y el
menú se repite. Reproducido: el `trace` no pasa por `transcribeAudio` y la transcripción no ocurre.

La causa es que la normalización de media vive en los nodos dedicados y dentro del `aiAgent`, no en
el motor. Y no es un caso de borde: **el 31% de las conversaciones de este negocio traen audio o
imagen**, y el flujo pasa la mayor parte del tiempo esperando entrada en un menú o una captura.

La lógica ya existe en el `aiAgent`; subirla al engine la habilita en todo el flujo.

### Integración con Shopify

Es el hueco que ha aparecido tres veces por puertas distintas: 15 escalamientos que el humano no
necesitaba, respuestas vagas de restock, y promesas de revisar pedidos. **El 13% de las
conversaciones preguntan por disponibilidad y el 12% por precios.**

Además, los precios del catálogo son del 4–11 de marzo de 2026 y **siete productos cambiaron de
precio en esa misma semana**: un catálogo en el prompt envejece.

### Estado de guías (Melonn)

El fulfillment lo hace Melonn, no Shopify. Antes de prometer rastreo hay que verificar si Melonn
escribe el número de guía de vuelta en Shopify. Es el 8% de las conversaciones.

### Base de conocimiento con recuperación

Hoy el catálogo va completo en el prompt: 6.870 de los 9.784 caracteres, enviados **en cada
mensaje**. Con ~650 conversaciones al mes son millones de tokens de catálogo repetido, y no hay
sitio para fichas técnicas ni tabla de envíos por ciudad.

Hace falta una fuente por tenant (CSV o Sheet) de la que se recuperen **solo las filas
relevantes**. Búsqueda de texto sobre Postgres resuelve el 90%; los embeddings pueden esperar.

### Memoria de largo plazo

La ventana de 16 turnos está bien resuelta. Faltan dos cosas: resumen de conversaciones largas —el
histórico tiene hilos de 30+ mensajes— y memoria entre conversaciones, para el cliente que vuelve.

### Canal oficial de WhatsApp

Hoy el canal es **WhatsApp QR (Baileys)**, no oficial. El cliente ya sufrió bloqueos por eso con
su herramienta anterior. Para producción debería ser la Cloud API de Meta, que la plataforma ya
soporta.

### Validación duplicada en el editor

Con las reglas ya en el backend, el editor mantiene su propia copia. Si se conservan las dos,
volverán a divergir — que es exactamente el problema que se acaba de arreglar.

---

## 7. Pendiente de terceros

**Del cliente:** tabla de costos de envío por ciudad (solo hay 5 ciudades observadas, y envíos es
el 22% de las consultas) · número de la cuenta Nequi · texto de la política de devoluciones ·
horario oficial de atención · si aceptan Addi o Sistecrédito · si existen envíos internacionales ·
stock por producto.

**Decisiones:** autorizar la conexión a Shopify (da acceso de lectura/escritura a su tienda) ·
elegir modelo para el `aiAgent` según coste · confirmar el canal de WhatsApp definitivo.

---

## 8. Riesgos abiertos

**`deploy/.env.server` tiene los secretos en claro dentro del repo**, incluida `ENCRYPTION_KEY`,
que es la que descifra los secretos de todos los tenants en la base de datos. Si el repo llega a un
remoto, queda todo expuesto.

**No hay script de despliegue.** Todo es manual: `scp` de los archivos y `docker compose build`.
Funciona, pero cada despliegue depende de que alguien recuerde los pasos.

**Credenciales por chat.** La contraseña de Wizybot, la API key de LETY.AI y la del panel
circularon por conversación. Conviene rotarlas.

**El flujo tiene `tenantId: null`** y la empresa está en PENDING: hoy el bot no atendería a nadie
aunque se conectara el canal.

---

## 9. Dos lecciones que valen para el próximo cliente

**El generador importa más que el motor.** El motor de wabots está bien diseñado y bien
documentado: maneja `onError`, limpia marcadores, reenvía menús con nota amable, valida entradas.
Diez de los once bugs salieron de que **el Constructor IA no usaba esas capacidades**. Invertir en
validar lo generado rinde más que añadir nodos nuevos.

**Las herramientas de verificación envejecen.** Tres de los "fallos" más llamativos del día fueron
errores de mis propias pruebas: una métrica que contaba avances espurios como éxitos, un test que
leía el estado final en vez del recorrido, y un caso que prohibía dar precios cuando ya se había
cargado el catálogo. Cada vez que cambia el comportamiento esperado, hay que revisar si los tests
siguen midiendo lo correcto.

Y una tercera, más práctica: **un prompt no se parchea en sitio.** Editarlo con cortes de texto
automáticos lo dejó vacío una vez, y el bot volvió a inventar precios de inmediato. Debe vivir en
un archivo versionado y subirse completo.
