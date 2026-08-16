# Integración del bot de WhatsApp con el backend

> Qué hay hoy, qué falta, y en qué orden construirlo para que el bot deje de escribir
> en una API de paso y escriba en la base de datos real.
>
> De este documento salen los issues del backend.

---

## 1. El estado real

**El backend ya expone sus casos de uso.** Cuando se escribió este documento las once carpetas de `Features/` estaban vacías; hoy hay **14 endpoints en 8 rebanadas**, incluidos los tres de ingesta que el bot necesita:

```
POST /api/ingesta/reportes          ← el bot crea el reporte
GET  /api/ingesta/reportes/{codigo} ← consulta formateada para WhatsApp
POST /api/ingesta/censo             ← registro del brigadista
```

**Lo que falta es apuntar el bot a ellos.** Hoy sigue escribiendo en `servicios/ms-bot-api`, la API puente.

| Paso | Estado |
|:---|:---|
| Endpoints de ingesta en el backend | ✅ construidos |
| Migraciones aplicándose | ✅ al arrancar (PR #73) |
| Azure verificado tras el despliegue | ⬜ **falta confirmarlo** |
| Cambiar la URL en los 4 nodos del flujo | ⬜ |
| Añadir el host a `HTTP_NODE_ALLOWED_HOSTS` | ⬜ requiere recrear `wabots-backend` |
| Apagar `ms-bot-api` | ⬜ solo cuando lo anterior esté probado |

> **No apagar la API puente antes de tiempo.** Hoy el bot está completo y probado; si se le quita el respaldo antes de verificar el backend, se queda sin nada.

---

## 2. El problema de fondo: el bot no tiene sesión

Esto es lo que hay que resolver antes de escribir el primer endpoint, y no es un detalle
de implementación.

El backend está diseñado para un **frontend web con usuarios que inician sesión**:

```
Usuario → login → token JWT → cada petición lleva el token → el backend sabe quién es
```

En WhatsApp **no hay login, ni contraseña, ni token**. Lo único que hay es un número de
teléfono. Y el bot no es una persona: es un servicio que escribe a nombre de muchas.

Si se ignora esto, pasa una de dos cosas, ambas malas:

- Se abren los endpoints sin autenticación → **cualquiera en internet puede crear reportes
  falsos** a nombre de cualquier teléfono.
- Se le da al bot el token de un usuario fijo → todos los reportes quedan a nombre de esa
  cuenta y **se pierde de quién es cada caso**.

### La salida: autenticación de servicio + identidad por teléfono

```
Bot ──[X-Api-Key del servicio]──► POST /api/ingesta/reportes
                                        │  { telefono, tipo, descripcion, ... }
                                        ▼
                              El backend resuelve o crea
                              el Usuario por su teléfono
                                        ▼
                              Crea el Reporte a nombre de ese usuario
```

Dos reglas que sostienen esto:

1. **El bot se autentica como servicio**, con una clave propia, no como usuario. Esa clave
   va en configuración, nunca en el repositorio.
2. **La identidad del ciudadano es su teléfono.** El backend crea un `Usuario` con
   `Rol = Ciudadano` la primera vez que ese número escribe, sin contraseña. Si después esa
   persona se registra en la web con el mismo teléfono, se vinculan.

> **Por qué una ruta `/api/ingesta/` aparte y no reusar `POST /api/reportes`:** son dos
> contratos distintos. El de la web recibe `latitud`/`longitud` de un GPS y exige token de
> usuario; el del bot recibe una ubicación escrita a mano (*"Soacha, Villa Mercedes, frente
> a la cancha"*) y se autentica como servicio. Mezclarlos obliga a que todos los campos
> sean opcionales y se pierde la validación de ambos.

---

## 3. Lo que el bot necesita del backend

Son cuatro rutas. Ni una más para que el bot funcione de punta a punta.

### 3.1 `POST /api/ingesta/reportes` 🔑 clave de servicio

Lo que hoy hace `ms-bot-api`. Crea el reporte y devuelve el código.

```json
{
  "telefono": "573001234567",
  "nombreContacto": "María R.",
  "clase": "afectacion_propia",
  "tipo": "Inundacion",
  "descripcion": "Se inundó la casa por la creciente del río",
  "ubicacionTexto": "Soacha, Villa Mercedes, frente a la cancha",
  "nivelDano": "Averiada — NO habitable",
  "necesidad": "AHE alimentaria",
  "urlFoto": null
}
```

**Respuesta `201`**
```json
{ "codigo": "RPT-2026-08-16-0001", "estado": "Reportado" }
```

> **Ojo con los errores.** El nodo HTTP de wabots **solo detecta fallos de red**: si esta
> ruta devuelve 500, el flujo sigue por la rama de éxito y el bot responde *«Reporte
> recibido»* con el código vacío. Frente al jurado. La ruta debe devolver 201 con código,
> o fallar de forma que el bot lo note.

### 3.2 `GET /api/ingesta/reportes/{codigo}` — público

**Ruta propia, no la de la web.** El bot necesita una forma de respuesta incompatible con
la que consume el frontend: el flujo de WhatsApp **no puede recorrer arreglos ni aplicar
formato**, solo interpolar variables planas.

> Es el mismo razonamiento que aplica al `POST`: dos consumidores con contratos distintos
> bajo la misma URL obligan a que todos los campos sean opcionales, y el día que alguien
> ajuste uno rompe al otro sin enterarse. `GET /api/reportes/{codigo}` sigue devolviendo el
> objeto completo para la web —`tipo`, `cronologia` como arreglo, `verificacionSatelital`,
> `transparencia`— y esta ruta devuelve el texto ya armado.

```json
{
  "codigo": "RPT-2026-08-16-0001",
  "estado": "EnAtencion",
  "actualizado": "15:30 del 16/8",
  "detalle": "📍 Soacha, Villa Mercedes\n🏠 Averiada — NO habitable\n\n*Cronología:*\n• Reportado — 14:30\n• Verificado — 14:40\n  Confirmado por datos satelitales"
}
```

**Si el código no existe, responder 200** con `estado: "No encontrado"` y el mensaje en
`detalle`. Un 404 haría que el bot muestre campos vacíos, por lo mismo del punto anterior.

### 3.3 `POST /api/ingesta/censo` 🔑 clave de servicio

El registro del brigadista. Con dos validaciones que **no son opcionales**:

- **Sin `consentimiento: true` se rechaza y no se persiste nada** (Ley 1581 de 2012).
- El teléfono del brigadista debe estar **acreditado**. Si no lo está, se rechaza:
  preguntarle a alguien si es brigadista es una invitación al fraude censal.

### 3.4 `PATCH /api/reportes/{codigo}/estado` 🔒 Gestor

Ya está previsto en el issue #22. **Es el momento del pitch**: la autoridad cambia el estado
desde el panel web y el ciudadano lo ve en su WhatsApp al consultar su código.

---

## 4. Persistencia: qué falta guardar

### 4.1 Las fotos — hace falta almacenamiento en la nube

Hoy las fotos que llegan por WhatsApp **se pierden**. El bot las recibe, las pasa por OCR
para leer el texto, y descarta la imagen.

Guardar imágenes en la base de datos o en el disco del contenedor no sirve: Azure Container
Apps **no tiene disco persistente**, se borra en cada despliegue.

**Recomendación: Azure Blob Storage.** Ya están en Azure, se factura en la misma
suscripción, y el SDK de .NET lo resuelve en pocas líneas.

| Contenedor | Qué guarda | Acceso |
|:---|:---|:---|
| `evidencias` | Fotos de reportes ciudadanos | Privado, con URL firmada temporal |
| `censo` | Evidencias del brigadista | **Privado siempre** |

> ⚠️ **Nunca público.** Una foto de una vivienda destruida con su ubicación es un dato
> personal. Y en el censo pueden aparecer documentos de identidad y rostros: datos
> sensibles bajo la Ley 1581, con la protección más alta que existe.

El flujo debería ser: el bot recibe la imagen de WhatsApp → la sube al Blob → guarda la URL
en el reporte. Nunca la imagen dentro del JSON.

### 4.2 Las conversaciones — decidir qué se guarda y qué no

Hoy el historial completo vive en la base de datos de **wabots**, en el servidor de Bizz,
mezclado con los datos de otros clientes. Eso sirve para depurar, pero no es donde debe
estar la información de una emergencia.

Hay que tomar una decisión explícita, y la investigación es clara al respecto:

| Opción | Qué implica |
|:---|:---|
| **Guardar solo el dato extraído** (recomendado) | Tipo, ubicación, nivel de daño, necesidad. Mínima recolección. El texto crudo se queda en wabots y se borra al terminar |
| Guardar la conversación completa | Sirve para auditar y mejorar el agente, pero **son datos personales** y multiplica la superficie de riesgo |

**Recomendación:** guardar el dato extraído más una referencia al mensaje original
(identificador, no contenido). Es lo que exige el principio de mínima recolección y lo que
ya está escrito en `CLAUDE.md`: *«los logs llevan identificadores, no contenido»*.

### 4.3 La base de datos ya está lista

Azure Database for PostgreSQL Flexible Server, en `conectariesgoai-rg`, región
`brazilsouth`. Las migraciones de EF Core corren solas al desplegar. **No hace falta tocar
nada aquí.**

---

## 5. Lo que hay que agregar al modelo de datos

Con lo que ya existe no alcanza. Tres cambios:

**En `Usuario`:**

| Campo | Para qué |
|:---|:---|
| `Telefono` | Es la identidad en WhatsApp. Único, indexado |
| `EsAcreditadoCenso` | Si puede registrar damnificados. **No se pregunta: se acredita** |
| `OrigenRegistro` | `Web` o `WhatsApp`, para saber de dónde vino |

**En `Reporte`:**

| Campo | Para qué |
|:---|:---|
| `Clase` | `aviso_evento` o `afectacion_propia` — la investigación insiste en no mezclarlos |
| `Confianza` | `autorreportado` · `verificado` · `censado` · `avalado` |
| `UbicacionTexto` | El bot no siempre tiene coordenadas: recibe *"Soacha, Villa Mercedes"* |
| `Canal` | `Web` o `WhatsApp` |

> `Latitud` y `Longitud` deben poder quedar en `null` cuando el reporte entra por WhatsApp.
> Hoy son obligatorias, y eso rompería la ingesta.

**Para el censo del brigadista: reutilizar el modelo que ya está documentado.**

[`MODELO-DATOS.md`](MODELO-DATOS.md) ya modela este caso con `PersonaAfectada` +
`MiembroNucleoFamiliar` + `DanoRegistrado`, con sus campos de vulnerabilidad,
consentimiento y validaciones. **No hay que construir un modelo paralelo.**

Lo único que falta es la capa de arriba: una entidad **`OperacionCenso`** que agrupe los
registros de una misma jornada —municipio, vereda, brigadista, fecha— y de la que cuelguen
varias `PersonaAfectada`. Eso completa la jerarquía del RUD sin duplicar nada:

```
OperacionCenso        ← NUEVA: la jornada (municipio, vereda, brigadista)
  └─ PersonaAfectada  ← YA EXISTE en MODELO-DATOS.md
      ├─ MiembroNucleoFamiliar  ← YA EXISTE
      └─ DanoRegistrado         ← YA EXISTE
```

Las tres validaciones del RUD —un solo jefe de hogar por familia, cédula no repetida en el
mismo evento, número de jefes igual al número de familias— se implementan sobre esas
tablas, no sobre unas nuevas.

> El flujo de WhatsApp captura hoy una versión reducida (jefe de hogar, número de personas,
> nivel de daño, necesidad). Eso llena `PersonaAfectada` parcialmente y deja
> `Estado = Borrador`: el brigadista completa el resto después, o queda como captura previa
> para que la alcaldía la exporte.

---

## 6. En qué orden construirlo

```
1. Auth (#7)           ─── ya tiene PR abierto, el #42
2. Reportes (#8)       ─── crear, listar, ver detalle
3. Ingesta del bot     ─── NUEVO: el bot deja ms-bot-api y escribe en la BD real
4. Cambio de estado    ─── #22, cierra el ciclo de la demo
5. Blob Storage        ─── NUEVO: las fotos dejan de perderse
6. Censo del brigadista ── NUEVO: solo si sobra tiempo
```

Los tres primeros son los que desbloquean el bot. **Del 4 en adelante ya hay demo.**

---

## 7. Lo que no hay que hacer

**No apagar `ms-bot-api` hasta que el backend funcione de verdad.** Hoy el bot está
completo y probado de punta a punta; si se le quita la API de paso antes de tiempo, se
queda sin nada.

**No exponer los endpoints de ingesta sin clave.** Un `POST /api/ingesta/reportes` abierto
permite inundar la base con reportes falsos a nombre de cualquier teléfono.

**No prometer inscripción en el censo.** Ni el bot ni el backend pueden decir que alguien
quedó registrado como damnificado: el RUD solo lo alimentan alcaldes, gobernadores y sus
consejos territoriales (Resolución 1110 de 2022). Detalle en
[`SISTEMA-REPORTES-COLOMBIA.md`](SISTEMA-REPORTES-COLOMBIA.md).

**No guardar fotos de documentos de identidad.** El formato oficial pide el *número*, no la
imagen. Pedir la foto agrega riesgo sin agregar valor.
