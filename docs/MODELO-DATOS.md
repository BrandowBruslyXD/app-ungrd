# Modelo de datos — RespondeYA

> Todo lo que el sistema guarda. Es la referencia para el backend (.NET + EF Core) y para saber qué campos pedir en cada pantalla.
>
> **Regla:** si un campo no está aquí, no existe. Antes de agregar uno, se anota en este documento y se avisa al grupo — un campo nuevo que aparece solo en el código rompe el contrato con el frontend.

---

## Vista general

```
Usuario ──< Reporte ──< EventoReporte          (quién reporta y cómo avanza)
                │
                ├──< Evidencia                  (fotos)
                ├──── VerificacionSatelital     (NASA FIRMS)
                │
                └──── PersonaAfectada ──< MiembroNucleoFamiliar
                              │
                              └──< DanoRegistrado
```

Hay **dos niveles de captura** y conviene no confundirlos:

| Nivel | Quién lo hace | Qué captura | Cuándo |
|:---|:---|:---|:---|
| **Reporte rápido** | Ciudadano | Qué pasa, dónde, una foto | En el momento de la emergencia |
| **Registro de damnificado** | Brigadista certificado | Quién está afectado, cuánto perdió, con documentos | Después, en terreno |

El reporte rápido es la puerta de entrada. El registro de damnificado es el censo que viene detrás.

---

## 1. Usuario

Quien entra al sistema.

| Campo | Tipo | Obligatorio | Notas |
|:---|:---|:---:|:---|
| `Id` | int | ✅ | Clave primaria |
| `Nombre` | string(120) | ✅ | |
| `Email` | string(160) | ✅ | Único |
| `PasswordHash` | string | ✅ | BCrypt. **Nunca en texto plano** |
| `Rol` | enum | ✅ | Ver abajo |
| `Municipio` | string(80) | ❌ | Su zona por defecto |
| `Telefono` | string(20) | ❌ | |
| `CodigoBrigadista` | string(20) | ❌ | Solo si `Rol = Brigadista`. Ej: `BR-2024-0156` |
| `EntidadId` | int? | ❌ | A qué alcaldía o entidad pertenece |
| `Activo` | bool | ✅ | Por defecto `true` |
| `CreadoEn` | datetime | ✅ | UTC |

**Rol:** `Ciudadano` · `Brigadista` · `Gestor` · `Admin`

> `Brigadista` es un rol nuevo respecto al plan original. Es quien hace el registro de damnificados en terreno: puede crear registros a nombre de otras personas, cosa que un ciudadano no puede.

---

## 2. Reporte

La emergencia. Es el centro del sistema.

| Campo | Tipo | Obligatorio | Notas |
|:---|:---|:---:|:---|
| `Id` | int | ✅ | |
| `Codigo` | string(24) | ✅ | Lo que ve el ciudadano: `RPT-2026-08-15-0047` |
| `UsuarioId` | int | ✅ | Quién lo reportó |
| `Tipo` | enum | ✅ | Ver abajo |
| `Descripcion` | string(1000) | ✅ | |
| `Latitud` | double | ✅ | |
| `Longitud` | double | ✅ | |
| `Direccion` | string(200) | ❌ | Texto libre |
| `Departamento` | string(80) | ❌ | |
| `Municipio` | string(80) | ✅ | Se usa para consultar SECOP |
| `Comuna` | string(80) | ❌ | |
| `Estado` | enum | ✅ | Arranca en `Reportado` |
| `Prioridad` | enum | ✅ | `Baja` · `Media` · `Alta` |
| `PersonasAfectadas` | int | ❌ | Estimado rápido |
| `CreadoEn` | datetime | ✅ | UTC |
| `ActualizadoEn` | datetime | ✅ | UTC |
| `SincronizadoEn` | datetime? | ❌ | Cuándo subió, si se capturó sin señal |

**Tipo:** `Incendio` · `Inundacion` · `Deslizamiento` · `ViaAfectada` · `ColapsoEstructural` · `Otro`

**Estado:** `Reportado` → `Verificado` → `Asignado` → `EnAtencion` → `Atendido` → `Cerrado`

> Se puede saltar hacia adelante, **nunca hacia atrás**. Sin tildes ni eñes en los valores de enum, para que viajen igual entre C# y JavaScript.

---

## 3. EventoReporte — la cronología

Cada cambio de estado deja un registro. **De aquí sale la línea de tiempo que ve el ciudadano**, que es el diferenciador del producto.

| Campo | Tipo | Obligatorio |
|:---|:---|:---:|
| `Id` | int | ✅ |
| `ReporteId` | int | ✅ |
| `Estado` | enum | ✅ |
| `Nota` | string(500) | ❌ |
| `UsuarioId` | int? | ❌ | `null` si lo hizo el sistema |
| `CreadoEn` | datetime | ✅ |

---

## 4. PersonaAfectada — el registro de damnificado

Lo que captura el brigadista. **Contiene datos personales sensibles: leer la sección de privacidad al final antes de tocar esta tabla.**

### Identificación

| Campo | Tipo | Obligatorio | Notas |
|:---|:---|:---:|:---|
| `Id` | int | ✅ | |
| `Codigo` | string(24) | ✅ | `DMN-2026-08-15-0031` |
| `ReporteId` | int? | ❌ | A qué emergencia pertenece |
| `RegistradoPorId` | int | ✅ | El brigadista |
| `Nombres` | string(120) | ✅ | |
| `Apellidos` | string(120) | ✅ | |
| `TipoDocumento` | enum | ✅ | `CC` · `TI` · `CE` · `Pasaporte` · `RC` · `SinDocumento` |
| `NumeroDocumento` | string(30) | ❌ | Opcional: en una emergencia se pierden los documentos |
| `Edad` | int | ✅ | |
| `Genero` | enum | ✅ | `Femenino` · `Masculino` · `Otro` · `PrefiereNoDecir` |
| `Telefono` | string(20) | ❌ | |
| `TelefonoAlterno` | string(20) | ❌ | Un vecino o familiar |
| `Email` | string(160) | ❌ | |

> **`SinDocumento` no es un detalle menor.** Una persona que perdió la cédula en la inundación es exactamente quien más necesita la ayuda. Si el formulario exige documento, el sistema deja por fuera a los más afectados.

### Ubicación

| Campo | Tipo | Obligatorio |
|:---|:---|:---:|
| `Departamento` | string(80) | ✅ |
| `Ciudad` | string(80) | ✅ |
| `Comuna` | string(80) | ❌ |
| `DireccionResidencia` | string(200) | ✅ |
| `Latitud` / `Longitud` | double? | ❌ | GPS del punto de registro |
| `EsResidenteDelMunicipio` | bool | ✅ | Distingue damnificado local de población flotante |

### Condiciones de vulnerabilidad

No estaban en el boceto original y **son de las más importantes**: definen a quién se atiende primero.

| Campo | Tipo | Notas |
|:---|:---|:---|
| `EsCabezaDeHogar` | bool | |
| `TieneDiscapacidad` | bool | |
| `EsAdultoMayor` | bool | 60 años o más |
| `EstaEmbarazada` | bool | |
| `PerteneceGrupoEtnico` | enum? | `Indigena` · `Afrocolombiano` · `Rrom` · `Raizal` · `Palenquero` · `Ninguno` |
| `EsVictimaConflicto` | bool | |
| `RequiereAtencionMedica` | bool | |
| `ObservacionesSalud` | string(500) | Dato sensible: solo lo indispensable |

### Cierre del registro

| Campo | Tipo | Notas |
|:---|:---|:---|
| `DeclaracionVeracidad` | bool | La persona declara que la información es cierta |
| `FechaDeclaracion` | datetime? | |
| `ConsentimientoDatos` | bool | **Obligatorio por Ley 1581.** Autoriza el tratamiento de sus datos |
| `Estado` | enum | `Borrador` · `Completo` · `Verificado` · `Rechazado` |
| `CreadoEn` / `SincronizadoEn` | datetime | Se separan para saber si se capturó sin señal |

---

## 5. MiembroNucleoFamiliar

Cada persona que depende del damnificado principal.

| Campo | Tipo | Obligatorio |
|:---|:---|:---:|
| `Id` | int | ✅ |
| `PersonaAfectadaId` | int | ✅ |
| `Nombres` / `Apellidos` | string(120) | ✅ |
| `Parentesco` | enum | ✅ | `Conyuge` · `Hijo` · `Padre` · `Hermano` · `Abuelo` · `Otro` |
| `Edad` | int | ✅ |
| `TipoDocumento` / `NumeroDocumento` | | ❌ |
| `TieneDiscapacidad` | bool | ✅ |
| `EstudiaActualmente` | bool | ❌ | Sirve para gestionar cupos escolares |

> **Cuidado con los menores de edad.** Sus datos tienen protección reforzada bajo la Ley 1581. En la demo, usar siempre datos inventados.

---

## 6. DanoRegistrado

Qué perdió la persona. Un registro por categoría afectada.

| Campo | Tipo | Obligatorio | Notas |
|:---|:---|:---:|:---|
| `Id` | int | ✅ | |
| `PersonaAfectadaId` | int | ✅ | |
| `Categoria` | enum | ✅ | Ver abajo |
| `Nivel` | enum | ✅ | `Leve` · `Moderado` · `Grave` · `DestruccionTotal` |
| `TipoInmueble` | enum? | ❌ | Solo si `Categoria = Vivienda` |
| `EsPropietario` | bool? | ❌ | Propietario o arrendatario |
| `Descripcion` | string(1000) | ❌ | |
| `ValorEstimado` | decimal? | ❌ | En pesos, si se puede estimar |
| `HectareasAfectadas` | decimal? | ❌ | Solo agricultura |
| `AnimalesPerdidos` | int? | ❌ | Solo agricultura |

**Categoria:** `Vivienda` · `Salud` · `Agricultura` · `Vial` · `Educacion` · `MediosDeVida` · `ServiciosPublicos`

**Nivel:** `Leve` (puede habitarse) · `Moderado` (requiere reparaciones) · `Grave` (inhabitable) · `DestruccionTotal`

**TipoInmueble:** `Casa` · `Apartamento` · `Rancho` · `Local` · `Finca` · `Otro`

> `Educacion`, `MediosDeVida` y `ServiciosPublicos` son categorías agregadas al boceto original. Perder las herramientas de trabajo o quedarse sin agua potable son afectaciones reales que el boceto no contemplaba.

---

## 7. Evidencia

Todas las fotos, de reportes y de registros.

| Campo | Tipo | Obligatorio | Notas |
|:---|:---|:---:|:---|
| `Id` | int | ✅ | |
| `ReporteId` | int? | ❌ | Uno de los dos debe venir |
| `PersonaAfectadaId` | int? | ❌ | |
| `Tipo` | enum | ✅ | Ver abajo |
| `Url` | string(500) | ✅ | Cloudinary |
| `NombreArchivo` | string(200) | ❌ | |
| `TamanoBytes` | long | ❌ | Máximo 5 MB |
| `Latitud` / `Longitud` | double? | ❌ | Dónde se tomó |
| `CapturadaEn` | datetime? | ❌ | |
| `SubidaEn` | datetime | ✅ | |

**Tipo:** `DanoMaterial` · `DocumentoFrontal` · `DocumentoPosterior` · `Rostro` · `NucleoFamiliar` · `Otro`

> ⚠️ `DocumentoFrontal`, `DocumentoPosterior` y `Rostro` son **datos biométricos y de identificación**. Ver privacidad abajo.

---

## 8. VerificacionSatelital

Resultado de consultar NASA FIRMS. Lo llena el microservicio `ms-satelital`.

| Campo | Tipo | Notas |
|:---|:---|:---|
| `Id` | int | |
| `ReporteId` | int | |
| `Fuente` | string(60) | `NASA FIRMS` |
| `Confirmado` | bool | |
| `FocosDetectados` | int | |
| `DistanciaMasCercanaKm` | double? | |
| `Detalle` | string(300) | Texto listo para mostrar |
| `ConsultadoEn` | datetime | |

> **Solo aplica a incendios.** FIRMS detecta calor: en inundaciones y deslizamientos siempre vendrá vacío, y está bien. Decirlo en el pitch suma credibilidad.

---

## 9. Entidad

Alcaldías y organismos que atienden.

| Campo | Tipo |
|:---|:---|
| `Id` | int |
| `Nombre` | string(160) |
| `Tipo` | enum — `Alcaldia` · `Gobernacion` · `UNGRD` · `DefensaCivil` · `Bomberos` · `CruzRoja` · `Otra` |
| `Municipio` / `Departamento` | string(80) |
| `Telefono` / `Email` | string |

---

## Privacidad — léase antes de tocar los datos personales

Este sistema captura **cédulas por ambas caras, fotos de rostro, datos de salud y datos de menores**. En Colombia eso cae bajo la **Ley 1581 de 2012** y son datos sensibles y de menores, las dos categorías con protección más alta.

**Reglas que no se negocian:**

1. **El repositorio es público.** Nunca subir una foto de un documento real, ni siquiera "de prueba". Queda expuesta y sigue siendo recuperable del historial de Git aunque después se borre.
2. **Toda la demo con datos inventados.** Nombres, cédulas y rostros falsos, siempre.
3. **`ConsentimientoDatos` es obligatorio.** No se guarda una `PersonaAfectada` sin ese campo en `true`. No es burocracia: es lo que hace legal el registro.
4. **Solo el brigadista que registró y los gestores** de la entidad correspondiente pueden ver los datos completos. Un ciudadano nunca ve los datos de otro.
5. **Las fotos de documentos no se muestran en listados.** Solo en el detalle, y solo a quien tiene permiso.

**Y para el pitch:** si el jurado pregunta por tratamiento de datos personales, tener esta respuesta lista los deja muy por encima del resto. La mayoría de equipos no va a haberlo pensado.

---

## Qué se construye ahora y qué no

| Entidad | ¿Entra en el hackathon? |
|:---|:---|
| `Usuario`, `Reporte`, `EventoReporte`, `Evidencia` | ✅ Sí — es el núcleo de la demo |
| `VerificacionSatelital` | ✅ Sí — ya está el microservicio |
| `PersonaAfectada`, `MiembroNucleoFamiliar`, `DanoRegistrado` | ⚠️ Ver `FASES.md` — depende del tiempo que quede |
| `Entidad` | ❌ No — se puede dejar como texto en `Municipio` |

**Regla de oro para no perder la demo:** si a la hora 16 el registro de damnificado no está terminado, se corta y se presenta el reporte ciudadano funcionando de punta a punta. **Una cosa completa vale más que dos a medias.**
