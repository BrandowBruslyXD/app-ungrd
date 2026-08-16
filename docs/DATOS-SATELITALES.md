# Datos satelitales — qué se puede consumir y qué se puede prometer

> Investigación de fuentes reales para alimentar el panel del gestor con observación satelital, y
> para **validar alertas tempranas** cruzando lo que reporta un ciudadano con lo que ve un satélite.
>
> Complementa [REPARTO-SECTORIAL.md](REPARTO-SECTORIAL.md) y el bloque de verificación satelital
> que ya existe en el seguimiento del reporte.

---

## Antes que nada: «tiempo real» no es exacto, y conviene no decirlo

Es la primera pregunta que va a hacer un jurado técnico, y la respuesta honesta es más fuerte que
la exagerada.

**Un satélite de órbita polar pasa sobre el mismo punto unas dos veces al día.** No hay una cámara
apuntando a Colombia permanentemente. Lo que existe es:

| Qué | Latencia real |
|:---|:---|
| NASA FIRMS — detección de calor, modo casi en tiempo real | **60 a 180 minutos** desde la observación |
| NASA FIRMS — modo ultrarrápido (URT) | ~1 minuto, pero **solo con cobertura de estaciones directas**, no global |
| NASA GIBS — imagen del día | Pocas horas tras la observación |
| Copernicus GFM — manchas de inundación | **~5 horas** tras la toma del radar |
| USGS — sismos | ~1 minuto, y esto **sí** es prácticamente tiempo real (no es satelital: es una red sísmica) |

**Qué decir en el pitch:** «el satélite pasa dos veces al día y el dato nos llega en menos de tres
horas; cuando pasa sobre una emergencia reportada, la confirmamos sola». Eso es verificable y suena
a alguien que entiende el problema.

**Qué no decir:** «vemos el desastre en vivo desde el satélite». Es falso y se cae con una
repregunta.

---

## Las fuentes, verificadas

Ordenadas por lo que cuesta montarlas.

| Fuente | Qué entrega | Clave | Costo | Latencia |
|:---|:---|:---|:---|:---|
| **NASA GIBS** | Imagen satelital diaria como capa de mapa | **No requiere** | Gratis | Horas |
| **USGS Earthquake** | Sismos con magnitud y profundidad, GeoJSON | **No requiere** | Gratis | ~1 min |
| **GDACS** (ONU + Comisión Europea) | Alertas multiamenaza con nivel de severidad | No requiere | Gratis | Minutos–horas |
| **NASA FIRMS** | Focos de calor: incendios | `MAP_KEY` por correo | Gratis | 1–3 h |
| **Copernicus GFM** | **Manchas de inundación** de radar Sentinel-1 | No para WMS | Gratis | ~5 h |
| **IDEAM** | Alertas hidrológicas y nivel de ríos en Colombia | No | Gratis | Horaria |
| **Copernicus Sentinel Hub** | Imágenes Sentinel-2 a 10 m, procesamiento a demanda | Cuenta | Gratis con cuota mensual | Días |

### 1. NASA GIBS — la que hay que montar primero

**Es la que hace visible el discurso.** Sirve capas de imagen satelital diaria como teselas de mapa
estándar, y **no pide clave ni cuenta**. Se enchufa al Leaflet que el proyecto ya tiene, como una
capa más:

```
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{capa}/default/{AAAA-MM-DD}/{conjunto}/{z}/{y}/{x}.jpg
```

Capas útiles para emergencias: reflectancia corregida de MODIS y VIIRS (lo que el satélite vio ese
día), anomalías térmicas, y cobertura de nubes. Cambiando la fecha en la URL se retrocede día a día:
**se puede mostrar el antes y el después de la emergencia**, que es una demostración de treinta
segundos y muy difícil de discutir.

Coste de montarlo: **media hora**. Es un `TileLayer` más.

### 2. Copernicus GFM — la que tapa el hueco que tenemos

Hoy la verificación satelital del producto usa FIRMS, y en `CONTRATO-API.md` está escrito que
**«NASA FIRMS solo detecta incendios: en inundaciones y deslizamientos casi siempre será `null`»**.

**GFM resuelve exactamente eso.** Procesa automáticamente todas las tomas de radar Sentinel-1 sobre
tierra y publica **mapas de extensión de inundación** en unas cinco horas. Radar, no cámara: **ve a
través de las nubes**, que es justo lo que hace inútil a una imagen óptica durante una tormenta.

Se accede por WMS con dimensión temporal, gratis y abierto. Es la pieza que le falta al bloque de
verificación satelital del seguimiento — y el evento de nuestra demo es una inundación.

Salvedad: Sentinel-1 tiene una **revisita de varios días**, no diaria. Una inundación que sube y baja
en 24 horas puede no quedar capturada. Hay que decirlo.

### 3. USGS y GDACS — corroboración sin clave

- **USGS** publica sismos en GeoJSON con actualización de aproximadamente un minuto, sin clave y con
  CORS permisivo: se puede llamar **desde el navegador** sin backend.
- **GDACS**, de Naciones Unidas y la Comisión Europea, entrega alertas de sismo, ciclón, inundación,
  volcán y sequía con un nivel de severidad. Es la corroboración institucional: si GDACS ya marcó
  el evento, el reporte ciudadano deja de ser una anécdota.

### 4. IDEAM — el dato local que ningún satélite da

IDEAM opera unas 400 estaciones hidrológicas que transmiten **nivel de río cada hora** y alimenta un
sistema de alertas por crecidas. Publica alertas hidrológicas en `datos.gov.co` y servicios
geográficos en estándares abiertos.

Para inundaciones en Colombia, el nivel del río medido en tierra **vale más que la imagen
satelital**, y además es la fuente que la autoridad ya reconoce como oficial.

---

## Cómo se usa esto para validar una alerta temprana

El valor no está en mostrar una imagen bonita: está en **cruzar dos fuentes independientes**.

```
Reporte ciudadano                 Señal satelital / institucional
«se está inundando la vía»   ✕    GFM ve lámina de agua a 2 km
        ↓                                    ↓
        └──────────── coinciden ─────────────┘
                        ↓
        El reporte pasa de «autorreportado» a «verificado»
        sin que nadie haya ido al sitio
```

Y el cruce funciona en los dos sentidos, que es lo interesante:

| Situación | Qué significa | Qué hace el sistema |
|:---|:---|:---|
| Reporte **+** señal satelital | Confirmado por dos fuentes | Sube el nivel de confianza y la prioridad |
| Señal satelital **sin** reportes | **Alerta temprana**: el satélite ve algo donde nadie ha reportado | Avisa al gestor: probablemente sea un municipio en silencio |
| Reportes **sin** señal satelital | Ni confirmado ni descartado | Se queda como autorreportado. **No se descarta**: puede ser de noche, con nubes o fuera de la pasada |

**La fila del medio es la alerta temprana de verdad**, y encaja exactamente con el subpanel de
cobertura territorial que ya construimos: trece municipios en silencio y una señal satelital sobre
uno de ellos es la llamada que hay que hacer ahora mismo.

**Y la tercera fila es la que hay que respetar:** que el satélite no vea nada **no significa que no
haya pasado nada**. Convertir esa ausencia en «reporte falso» sería un error grave en una
herramienta de emergencias.

---

## Dónde encaja en el panel del gestor

Sin inventar pantallas nuevas: se suma a lo que ya existe.

1. **Capa satelital en el mapa operativo** (GIBS). Un conmutador de capas: mapa normal / imagen del
   satélite de hoy / imagen de antes del evento. Es lo más vistoso y lo más barato.
2. **Subpanel de señales**, junto al de cobertura territorial: qué ha detectado cada fuente en el
   territorio del evento, con su hora de observación y su origen.
3. **Nivel de confianza automático**: un reporte corroborado por señal satelital sube de
   `Autorreportado` a `Verificado` — el mismo nivel de confianza que ya viaja hasta el paquete del
   ministerio.
4. **En el seguimiento del ciudadano**: el bloque de verificación satelital que ya existe, ahora
   también para inundaciones gracias a GFM.

---

## Qué haría yo, por orden

| Orden | Qué | Esfuerzo | Por qué |
|:---:|:---|:---|:---|
| 1 | Capa **GIBS** en el mapa del gestor | ~30 min | Sin clave, impacto visual inmediato, permite el antes/después |
| 2 | **USGS** + **GDACS** en un subpanel de señales | ~1 h | Sin clave, datos reales, se llaman desde el navegador |
| 3 | Tramitar la **MAP_KEY de FIRMS** | 10 min de trámite | Sigue pendiente (bloqueante B4 en `CONTROL.md`) y el microservicio ya está listo |
| 4 | **GFM** para inundaciones | 2–3 h | Tapa el hueco real del producto, pero es WMS y hay que probarlo |
| 5 | **Sentinel Hub** | Media jornada | Potente, pero pide cuenta, cuota y procesamiento. Para después del hackatón |

Con los tres primeros —**medio día de trabajo**— el discurso queda sostenido con datos reales y sin
una sola credencial de pago.

---

## Lo que no se puede prometer

- **Ver el desastre en vivo.** Dos pasadas al día, y con nubes la imagen óptica no sirve.
- **Detectar deslizamientos automáticamente.** Se detectan comparando imágenes antes y después, con
  análisis que no es automático ni inmediato. Ningún servicio gratuito lo publica en caliente.
- **Contar viviendas destruidas desde el satélite.** La ingeniera de la UNGRD lo mencionó como
  posibilidad futura; a 10 metros por píxel no se cuentan casas.
- **Sustituir el EDAN.** El satélite confirma que algo pasó y dónde; el daño, el costo y las
  personas afectadas siguen saliendo del terreno.

---

**Fuentes:** [GIBS — documentación de acceso](https://nasa-gibs.github.io/gibs-api-docs/access-basics/) ·
[GIBS en NASA Earthdata](https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api) ·
[Ejemplos de GIBS con Leaflet](https://github.com/nasa-gibs/gibs-web-examples) ·
[FIRMS y datos ultrarrápidos](https://www.earthdata.nasa.gov/news/feature-articles/firms-adds-ultra-real-time-data-from-modis-viirs) ·
[NRT frente a productos estándar](https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/near-real-time-versus-standard-products) ·
[USGS — feeds GeoJSON](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) ·
[GDACS](https://www.gdacs.org/Documents/2025/GDACS_API_quickstart_v1.pdf) ·
[Copernicus GFM](https://global-flood.emergency.copernicus.eu/news/107-global-flood-monitoring-product-launch/) ·
[GFM — manual de producto](https://extwiki.eodc.eu/gfm_assets/gfm4.0_pum_2025.pdf) ·
[Sentinel Hub en Copernicus Data Space](https://dataspace.copernicus.eu/analyse/apis/sentinel-hub) ·
[Cuotas del nivel gratuito](https://documentation.dataspace.copernicus.eu/Quotas.html) ·
[IDEAM — pronósticos y alertas](https://www.ideam.gov.co/pronosticos-y-alertas) ·
[IDEAM — alertas hidrológicas en datos.gov.co](https://www.datos.gov.co/Ambiente-y-Desarrollo-Sostenible/Alertas-Hidrol-gicas/h4gs-wsmg)
