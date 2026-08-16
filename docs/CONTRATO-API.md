# Contrato de API — ConectaRiesgo

> **Este documento es la fuente de verdad entre el backend (.NET) y el frontend (React).**
> Si algo aquí cambia, se avisa en el grupo **antes** de cambiarlo. Un campo renombrado en silencio rompe la demo y nadie sabe por qué.

**Base URL (desarrollo):** `http://localhost:5000/api`
**Base URL (producción):** `https://conectariesgoai-api.delightfulsand-f3f95f4d.brazilsouth.azurecontainerapps.io/api`

---

## Reglas generales

| Regla | Valor |
|:---|:---|
| Formato | JSON en petición y respuesta |
| Nombres de campos | `camelCase` (configurar `JsonNamingPolicy.CamelCase` en .NET) |
| Fechas | ISO 8601 en **UTC**: `2026-08-15T14:30:00Z`. El frontend convierte a hora local. |
| Enums | Se envían y reciben como **texto**, no como número: `"Incendio"`, no `0` |
| Autenticación | Cabecera `Authorization: Bearer <token>` |
| Identificador público | Los reportes se consultan por `codigo` (`RPT-2026-08-15-0047`), no por su `id` interno |

### Forma del error

Toda respuesta de error usa esta misma forma. El frontend solo tiene que saber leer una:

```json
{
  "error": "No autorizado para cambiar el estado del reporte",
  "detalles": null
}
```

En errores de validación, `detalles` trae los campos que fallaron:

```json
{
  "error": "Datos inválidos",
  "detalles": { "descripcion": "La descripción es obligatoria" }
}
```

| Código | Cuándo |
|:---|:---|
| `200` | Todo bien |
| `201` | Recurso creado |
| `400` | Datos inválidos |
| `401` | Falta el token o está vencido |
| `403` | Tiene token pero no tiene el rol necesario |
| `404` | No existe |
| `500` | Error del servidor |

---

## Valores permitidos

Estos son los únicos valores válidos. **El frontend puede confiar en ellos para pintar iconos y colores.**

```
Rol:        Ciudadano | Gestor | Admin

Tipo:       Incendio | Inundacion | Deslizamiento
            ViaAfectada | ColapsoEstructural | Otro

Estado:     Reportado | Verificado | Asignado
            EnAtencion | Atendido | Cerrado

Prioridad:  Baja | Media | Alta

Canal:      Web | WhatsApp | Telefono
```

> Sin tildes ni eñes en los valores de enum, para evitar problemas de codificación entre C# y JavaScript. Las tildes van solo en los textos que ve el usuario, que los pone el frontend.

**Flujo de estados válido:**

```
Reportado → Verificado → Asignado → EnAtencion → Atendido → Cerrado
```

Se puede saltar hacia adelante (de `Reportado` a `Asignado`), pero **nunca hacia atrás**.

---

## 1. Autenticación

### `POST /api/auth/registro`

**Petición**
```json
{
  "nombre": "María Rodríguez",
  "email": "maria@ejemplo.com",
  "password": "unaClaveSegura123",
  "municipio": "Bogotá"
}
```

**Respuesta `201`**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": { "id": 12, "nombre": "María Rodríguez", "email": "maria@ejemplo.com", "rol": "Ciudadano", "municipio": "Bogotá" }
}
```

### `POST /api/auth/login`

**Petición**
```json
{ "email": "maria@ejemplo.com", "password": "unaClaveSegura123" }
```

**Respuesta `200`** — idéntica a la de registro.
**Respuesta `401`** — `{ "error": "Correo o contraseña incorrectos", "detalles": null }`

### `GET /api/auth/yo` 🔒

Devuelve el objeto `usuario` del token. Sirve para restaurar la sesión al recargar la página.

**Respuesta `200`**
```json
{
  "id": 12,
  "nombre": "María Rodríguez",
  "email": "maria@ejemplo.com",
  "rol": "Ciudadano",
  "municipio": "Bogotá"
}
```

**Respuesta `401`** — token ausente o vencido, con la forma estándar de error.

---

## 2. Reportes

### `POST /api/reportes` 🔒 Ciudadano

Crea el reporte, genera el `codigo` y registra el primer evento de la cronología con estado `Reportado`.

**Petición**
```json
{
  "tipo": "Inundacion",
  "descripcion": "Se está inundando la vía principal, el agua ya llega a las casas",
  "latitud": null,
  "longitud": null,
  "direccion": "Calle 123 #45-67",
  "municipio": "Bogotá",
  "urlFoto": "https://res.cloudinary.com/.../foto.jpg"
}
```

> `urlFoto` y `direccion` son **opcionales**. El reporte se crea igual sin ellos.
> `urlFoto` se resuelve **antes** de este POST, con cualquiera de dos vías (sección 5): Cloudinary
> desde el frontend, o `POST /api/evidencias` (`tipo: DanoMaterial`) ya disponible en el backend.
> Si la subida falla por cualquiera de las dos vías, se manda este POST sin `urlFoto` — nunca se
> pierde el reporte por culpa de la foto (issue #9).

**Respuesta `201`**
```json
{
  "codigo": "RPT-2026-08-15-0047",
  "estado": "Reportado",
  "creadoEn": "2026-08-15T14:30:00Z"
}
```

---

### `GET /api/reportes` — público

Alimenta el mapa y el dashboard.

**Parámetros de consulta** (todos opcionales)

| Parámetro | Ejemplo | Qué hace |
|:---|:---|:---|
| `tipo` | `Incendio` | Filtra por tipo |
| `estado` | `EnAtencion` | Filtra por estado |
| `canal` | `WhatsApp` | Filtra por canal de origen (`Web` · `WhatsApp` · `Telefono`) |
| `lat` `lng` `radioKm` | `4.71` `-74.07` `10` | Solo reportes dentro del radio |
| `municipio` | `Bogotá` | Filtra por municipio |
| `limite` | `50` | Máximo de resultados (por defecto 100) |

**Respuesta `200`**
```json
[
  {
    "codigo": "RPT-2026-08-15-0047",
    "tipo": "Inundacion",
    "descripcion": "Se está inundando la vía principal",
    "latitud": 4.710989,
    "longitud": -74.072092,
    "direccion": "Calle 123 #45-67",
    "municipio": "Bogotá",
    "urlFoto": "https://res.cloudinary.com/.../foto.jpg",
    "estado": "EnAtencion",
    "prioridad": "Alta",
    "canal": "Web",
    "distanciaKm": 2.3,
    "creadoEn": "2026-08-15T14:30:00Z"
  }
]
```

> `distanciaKm` solo viene si se mandaron `lat` y `lng` **y** el reporte tiene coordenadas GPS.
> Si el reporte entró por WhatsApp/teléfono sin GPS, `latitud`/`longitud` y `distanciaKm` llegan en
> `null` y ese reporte queda fuera de cualquier filtro por radio.

---

### `GET /api/reportes/{codigo}` — público

El detalle completo. **Alimenta la pantalla de seguimiento, que es el corazón del pitch.**

**Respuesta `200`**
```json
{
  "codigo": "RPT-2026-08-15-0047",
  "tipo": "Inundacion",
  "descripcion": "Se está inundando la vía principal",
  "latitud": 4.710989,
  "longitud": -74.072092,
  "direccion": "Calle 123 #45-67",
  "municipio": "Bogotá",
  "urlFoto": "https://res.cloudinary.com/.../foto.jpg",
  "estado": "EnAtencion",
  "prioridad": "Alta",
  "canal": "Web",
  "creadoEn": "2026-08-15T14:30:00Z",
  "reportadoPor": "María R.",

  "cronologia": [
    { "estado": "Reportado",  "nota": "Reporte recibido",              "fecha": "2026-08-15T14:30:00Z", "responsable": "Sistema" },
    { "estado": "Verificado", "nota": "Confirmado por datos satelitales","fecha": "2026-08-15T14:40:00Z", "responsable": "Sistema" },
    { "estado": "Asignado",   "nota": "Asignado a Alcaldía de Bogotá",  "fecha": "2026-08-15T15:00:00Z", "responsable": "Carlos M." },
    { "estado": "EnAtencion", "nota": "Brigada en camino",              "fecha": "2026-08-15T15:30:00Z", "responsable": "Carlos M." }
  ],

  "verificacionSatelital": {
    "fuente": "NASA FIRMS",
    "confirmado": true,
    "detalle": "3 focos de calor detectados a menos de 5 km",
    "consultadoEn": "2026-08-15T14:40:00Z"
  },

  "transparencia": [
    { "objeto": "Obras de canalización quebrada La Vieja", "valor": 450000000, "anio": 2024, "entidad": "Alcaldía de Bogotá" },
    { "objeto": "Mantenimiento de alcantarillado sector norte", "valor": 120000000, "anio": 2023, "entidad": "Alcaldía de Bogotá" }
  ]
}
```

> ### ⚠️ Las tres reglas que evitan que la demo se caiga
>
> 1. **`verificacionSatelital` puede llegar en `null`.** NASA FIRMS solo detecta incendios: en inundaciones y deslizamientos casi siempre será `null`. El frontend **oculta el bloque entero** si viene `null`. No muestra un error ni un hueco.
> 2. **`transparencia` puede llegar como lista vacía `[]`.** El frontend oculta el bloque.
> 3. **Si NASA o SECOP fallan o tardan, el backend devuelve `null` / `[]` y responde igual.** Un servicio externo caído **nunca** puede tumbar esta pantalla. Poner tiempo límite de 5 segundos en ambas llamadas.

---

### `GET /api/reportes/mios` 🔒

Los reportes del usuario del token. Misma forma que el listado general; `distanciaKm` siempre
llega en `null` (no se calcula distancia en esta ruta).

**Respuesta `200`**
```json
[
  {
    "codigo": "RPT-2026-08-15-0047",
    "tipo": "Inundacion",
    "descripcion": "Se está inundando la vía principal",
    "latitud": 4.710989,
    "longitud": -74.072092,
    "direccion": "Calle 123 #45-67",
    "municipio": "Bogotá",
    "urlFoto": "https://res.cloudinary.com/.../foto.jpg",
    "estado": "Reportado",
    "prioridad": "Media",
    "canal": "Web",
    "distanciaKm": null,
    "creadoEn": "2026-08-15T14:30:00Z"
  }
]
```

> `distanciaKm` llega en `null` por diseño: `/api/reportes/mios` no calcula distancia al usuario,
> aunque el reporte tenga coordenadas.

---

### `PATCH /api/reportes/{codigo}/estado` 🔒 Gestor | Admin

**Petición**
```json
{ "estado": "EnAtencion", "nota": "Brigada en camino" }
```

**Respuesta `200`**
```json
{ "codigo": "RPT-2026-08-15-0047", "estado": "EnAtencion", "actualizadoEn": "2026-08-15T15:30:00Z" }
```

**Respuesta `403`** si quien llama es un `Ciudadano`.

> Cada llamada **inserta un evento en la cronología**. Aquí es donde nace lo que el ciudadano ve en su pantalla de seguimiento: es la conexión entre las dos vistas de la demo.

---

## 3. Estadísticas

### `GET /api/estadisticas/resumen` — público

Parámetros opcionales: `municipio`, `lat`, `lng`, `radioKm`.

**Respuesta `200`**
```json
{
  "porTipo": { "Incendio": 3, "Inundacion": 2, "Deslizamiento": 1, "ViaAfectada": 0, "ColapsoEstructural": 0, "Otro": 0 },
  "porCanal": { "Web": 20, "WhatsApp": 15, "Telefono": 12 },
  "totalHoy": 47,
  "atendidos": 35,
  "porcentajeAtendidos": 74,
  "tiempoPromedioMinutos": 28
}
```

> Devuelve **ceros, no un error**, cuando no hay datos. `porTipo` siempre trae las 6 llaves aunque valgan `0`, para que el frontend no tenga que preguntar si existen. `porCanal` siempre trae `Web`, `WhatsApp` y `Telefono` con el mismo criterio.

---

## 4. Servicios de apoyo

### `GET /api/transparencia/secop?municipio=` — público

Contratos de prevención del municipio consultados en Datos Abiertos (SECOP). Máximo 5, ordenados
por valor. Tope de 30 peticiones/minuto por IP.

**Respuesta `200`**
```json
[
  {
    "objeto": "Obras de canalización quebrada La Vieja",
    "valor": 450000000,
    "anio": 2024,
    "entidad": "Alcaldía de Bogotá"
  },
  {
    "objeto": "Mantenimiento de alcantarillado sector norte",
    "valor": 120000000,
    "anio": 2023,
    "entidad": "Alcaldía de Bogotá"
  }
]
```

> Devuelve `[]` (lista vacía, no error) cuando no hay contratos o SECOP no responde a tiempo.

### `GET /api/verificacion/satelital` — **no implementado en v1**

La verificación satelital solo llega embebida en `GET /api/reportes/{codigo}` cuando ya fue
persistida en base de datos. Este endpoint standalone queda para una fase posterior.

---

## 5. Evidencias

### `POST /api/evidencias` 🔒

Sube un archivo a Azure Blob Storage y devuelve su URL firmada (temporal). **No crea ni asocia
nada en la base de datos** — el llamador guarda la URL donde le corresponda (p. ej. como
`urlFoto` al crear un reporte), igual que hoy se hace con la URL que devuelve Cloudinary. Es un
endpoint independiente del flujo descrito en la sección 2: mientras `POST /api/reportes` sigue
esperando `urlFoto` ya resuelta, este endpoint es la forma de resolverla desde el propio backend
en vez de subir directo a un proveedor de terceros desde el navegador.

**Petición** — `multipart/form-data`

| Campo | Tipo | Notas |
|:---|:---|:---|
| `archivo` | file | JPEG, PNG o WEBP. Máximo 5 MB |
| `tipo` | string | `DanoMaterial` \| `DocumentoFrontal` \| `DocumentoPosterior` \| `Rostro` \| `NucleoFamiliar` \| `Otro` — decide el contenedor: los dos primeros van a `evidencias`, el resto a `censo` |

**Respuesta `201`**
```json
{
  "urlFoto": "https://conectariesgoaist.blob.core.windows.net/evidencias/ab12....jpg?sv=...&sig=...",
  "subida": true
}
```

**Respuesta `200`** — el blob no se pudo guardar (Azure no respondió). Nunca un 500: no es un
error del servidor, es un fallo esperado de una integración externa.
```json
{
  "urlFoto": null,
  "subida": false
}
```

> `201` solo cuando de verdad se creó el blob; `200` cuando la petición se procesó bien pero no
> hubo nada que crear. Quien llama decide qué hacer (p. ej. crear el reporte sin
> foto).

**Respuesta `400`** — archivo mayor a 5 MB o tipo no permitido, con la forma estándar de error.

---

## 6. Ingesta (bot de WhatsApp)

Contrato aparte de la sección 2: el bot no tiene sesión de usuario, se autentica como servicio, y
la ubicación llega como texto libre, no como GPS. Detalle en
[docs/INTEGRACION-BOT-BACKEND.md](INTEGRACION-BOT-BACKEND.md).

### `POST /api/ingesta/reportes` 🔑 clave de servicio

Autenticado con la cabecera `X-Api-Key` (no `Authorization: Bearer`). Crea el `Usuario` por
teléfono la primera vez que ese número escribe (`Rol=Ciudadano`, sin contraseña,
`OrigenRegistro=WhatsApp`); si ya existe, lo reutiliza.

**Petición**
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

`clase` es `afectacion_propia` \| `aviso_evento` (snake_case, tal como lo habla el bot — no se
traduce a los valores de la sección "Valores permitidos"). `tipo` sí usa los valores de esa
sección. `nivelDano` y `necesidad` no tienen columna propia todavía: se anexan al texto de
`descripcion`.

**Respuesta `201`**
```json
{ "codigo": "RPT-2026-08-16-0001", "estado": "Reportado" }
```

**Respuesta `401`** — falta `X-Api-Key` o la clave no es válida, con la forma estándar de error.
No se crea ningún reporte.

### `POST /api/ingesta/censo` 🔑 clave de servicio

El registro del brigadista (issue #48). Autenticado igual que `/api/ingesta/reportes`, con
`X-Api-Key`. El `telefono` es del brigadista, no del damnificado: se verifica contra
`Usuario.EsAcreditadoCenso` — si no está acreditado, `403`. Reutiliza la `OperacionCenso` abierta
del brigadista en ese municipio, o abre una nueva.

**Petición**
```json
{
  "telefono": "573001234567",
  "municipio": "Soacha",
  "barrioVereda": "Villa Mercedes",
  "consentimiento": true,
  "declaracionVeracidad": true,
  "nombres": "María",
  "apellidos": "Ramírez",
  "tipoDocumento": "CC",
  "numeroDocumento": "1234567890",
  "edad": 34,
  "genero": "Femenino",
  "telefonoContacto": null,
  "departamento": "Cundinamarca",
  "ciudad": "Soacha",
  "direccionResidencia": "Villa Mercedes, casa 12",
  "latitud": null,
  "longitud": null,
  "esCabezaDeHogar": true,
  "tieneDiscapacidad": false,
  "esAdultoMayor": false,
  "estaEmbarazada": false,
  "perteneceGrupoEtnico": null,
  "esVictimaConflicto": false,
  "requiereAtencionMedica": false,
  "estadoVivienda": "Averiada — NO habitable",
  "necesidad": "AHE alimentaria",
  "miembrosNucleo": [
    { "nombres": "Juan", "apellidos": "Ramírez", "parentesco": "Hijo", "edad": 8, "tipoDocumento": null, "numeroDocumento": null, "tieneDiscapacidad": false, "estudiaActualmente": true }
  ]
}
```

`tipoDocumento` es `CC` \| `TI` \| `CE` \| `Pasaporte` \| `RC` \| `SinDocumento` (obligatorio;
`numeroDocumento` queda `null` cuando es `SinDocumento` — perder el documento en la emergencia no
descarta a la persona). `genero` es `Femenino` \| `Masculino` \| `Otro` \| `PrefiereNoDecir`.
`perteneceGrupoEtnico` es `Indigena` \| `Afrocolombiano` \| `Rrom` \| `Raizal` \| `Palenquero` \|
`Ninguno`, o `null`. `estadoVivienda` y `necesidad` llegan como texto libre (no tienen enum propio
todavía): el backend aproxima un nivel de daño por palabras clave para el reporte interno, pero el
texto original queda intacto. `miembrosNucleo` admite hasta 20 elementos.

**Respuesta `201`**
```json
{ "codigo": "DMN-2026-08-16-0031", "codigoOperacionCenso": "CEN-2026-08-16-0001-K7M2", "estado": "Borrador" }
```

**Respuesta `400`** — `consentimiento: false` (no se persiste nada), datos con forma inválida, o
cédula ya registrada en el mismo evento censal (mensaje genérico, sin repetir la cédula).

**Respuesta `403`** — el teléfono no tiene `EsAcreditadoCenso`. No se crea nada.

### `GET /api/ingesta/reportes/{codigo}` — público

Consulta de seguimiento para el bot. **No usa JWT ni API key:** el código funciona como número de
guía (igual que en la web). Responde `200` siempre; un código inexistente trae `estado`:
`"No encontrado"` en lugar de `404`.

**Respuesta `200`** — reporte encontrado
```json
{
  "codigo": "RPT-2026-08-16-0001",
  "estado": "EnAtencion",
  "actualizado": "15:30 del 16/8",
  "detalle": "📍 Soacha, Villa Mercedes, frente a la cancha\n\n*Cronología:*\n• Reportado — 14:20 del 16/8\n  Reporte recibido\n• EnAtencion — 15:30 del 16/8\n  Brigada en camino"
}
```

> `actualizado` es **texto legible para WhatsApp** (`"15:30 del 16/8"`), no ISO-8601. No es un
> error: el bot interpola el valor tal cual. Los demás endpoints sí usan `creadoEn`/`fecha` en UTC.

**Respuesta `200`** — código inexistente (no es `404`)
```json
{
  "codigo": "RPT-2026-08-16-9999",
  "estado": "No encontrado",
  "actualizado": "—",
  "detalle": "No encontré un reporte con ese código.\n\nRevisa que esté completo."
}
```

---

## 7. Sistema

### `GET /health` y `GET /api/health` — público

Comprobación de vida. Misma respuesta en ambas rutas (`/health` para sondas de despliegue;
`/api/health` mantiene la convención del prefijo `/api`).

**Respuesta `200`**
```json
{
  "estado": "ok",
  "servicio": "ConectaRiesgoAI",
  "fecha": "2026-08-16T04:00:00Z"
}
```

---

## Cómo trabajar con esto sin bloquearse

**Frontend:** copien los ejemplos de respuesta de este documento a `src/mocks/` **tal cual están** y construyan contra ellos. Cuando el backend avise que un endpoint está listo, solo cambian el origen de datos en `src/api/`. No esperen a nadie.

**Backend:** el orden que desbloquea más rápido al resto es:

1. `POST /api/reportes` y `GET /api/reportes` — sin esto no hay mapa ni dashboard
2. `GET /api/reportes/{codigo}` — la pantalla del pitch
3. `POST /api/auth/login`
4. `PATCH .../estado` — cierra el ciclo de la demo
5. Todo lo demás

**Avisen en el grupo cada vez que un endpoint quede funcionando en Swagger.** Un endpoint terminado del que nadie se entera es un endpoint que no existe.

---

## Estado del contrato

| Criterio | Estado |
|:---|:---|
| Endpoints implementados documentados con ejemplo JSON | ✅ |
| Nombres de campos en `camelCase` | ✅ |
| Enums como texto (no número) | ✅ |
| Forma de error unificada | ✅ |
| Modelo de datos alineado | ✅ Ver [MODELO-DATOS.md](MODELO-DATOS.md) |

**Regla:** cualquier cambio a nombres de campo o forma de respuesta se acuerda en el grupo **antes**
de mergear. Este documento cierra el issue [#2](https://github.com/jasonfabian8/app-ungrd/issues/2).
