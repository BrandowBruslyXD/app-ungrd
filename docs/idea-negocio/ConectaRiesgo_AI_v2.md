> **Documento de exploración inicial, no vigente.** Describe el producto como un asistente por
> WhatsApp exclusivamente. Hoy **ConectaRiesgo es una app web** con WhatsApp como un canal más
> — ver [`CLAUDE.md`](../../CLAUDE.md) en la raíz del repo. Se conserva como contexto histórico.

# ConectaRiesgo AI

## Nombre

**ConectaRiesgo AI**

Asistente de **resiliencia climática comunitaria** por WhatsApp: anticipa, acompaña y deja datos.

## Problema

El riesgo climático en Colombia es rural, recurrente y mal medido.

Los eventos hidrometeorológicos —inundaciones, deslizamientos, vendavales, sequías— concentran la mayor parte de los desastres registrados en el país, y su frecuencia está ligada a ciclos ENSO que ya no se comportan como el promedio histórico. *[Verificar cifra exacta en UNGRD / DesInventar antes de presentar. No usar número sin fuente.]*

Las comunidades rurales enfrentan tres brechas simultáneas:

**Brecha de anticipación.** Las alertas técnicas existen (IDEAM, SGC) pero llegan en formato institucional, sin territorializar a nivel vereda y sin traducirse en acciones concretas. Un pequeño productor no sabe qué hacer con un aviso de alerta naranja.

**Brecha de acceso.** Ocurrido el evento, reportar la afectación, saber a qué ayuda se puede acceder, ante qué entidad y con qué requisitos exige aplicaciones, dispositivos modernos y trámites que no están diseñados para una situación de emergencia —menos aún para quien perdió sus documentos.

**Brecha de datos.** Nadie sabe, con resolución de vereda, qué se perdió, dónde y con qué frecuencia. Sin ese registro no hay focalización de inversión, no hay planeación de adaptación municipal y no hay forma de verificar si la ayuda llegó.

La adaptación climática se planea con datos que no existen para el territorio donde más se necesitan.

## Solución

**ConectaRiesgo AI** acompaña el ciclo completo del riesgo climático desde WhatsApp, sin instalar aplicaciones, mediante texto, audio, fotografías y ubicación.

`Prevención → Alerta → Reporte → Orientación → Atención → Entrega → Confirmación → Aprendizaje`

### 1. Alertar y prevenir (antes del evento)

- Alertas territorializadas por geocerca municipal o veredal, construidas sobre fuentes oficiales (IDEAM, SGC).
- Traducción del aviso técnico a acción concreta y verificable: qué proteger, qué mover, a dónde ir.
- Recomendaciones de adaptación diferenciadas para pequeños productores: protección de semilla y almacenamiento, traslado de animales, cosecha anticipada, drenaje, aseguramiento de infraestructura básica.
- La IA adapta el mensaje al cultivo, al piso térmico y al historial de afectación de la vereda.

### 2. Reportar y categorizar afectaciones

Vivienda y albergue · alimentos y agua · ayudas económicas · vías, puentes y servicios públicos · pérdida de cultivos, animales o medios de subsistencia · personas vulnerables o desaparecidas.

La IA transforma mensajes informales —incluidos audios en lenguaje local— en reportes estructurados y geolocalizados, identifica duplicados y prioriza según severidad, población afectada y ubicación.

### 3. Orientar al ciudadano

Responde a qué ayuda puede acceder, dónde solicitarla, qué entidad es responsable, qué requisitos necesita, y qué alternativas existen si perdió sus documentos. Para pequeños productores incluye la ruta de recuperación productiva: seguro agropecuario, líneas de crédito y reposición de insumos.

### 4. Asistir en los trámites

El ciudadano envía fotografías o documentos por WhatsApp. La IA identifica la documentación disponible, detecta faltantes y orienta paso a paso, **sin inventar información ni decidir sobre la elegibilidad del ciudadano**. La decisión sigue siendo institucional y humana.

### 5. Hacer seguimiento y garantizar trazabilidad

Cada necesidad recibe un identificador y avanza por estados hasta la confirmación de entrega por parte de la propia comunidad, relacionando necesidad reportada, entidad responsable, ayuda asignada y evidencia.

### 6. Generar el dato que hoy no existe

Cada reporte alimenta un **registro comunitario de afectación climática** con resolución de vereda: qué evento, qué se perdió, dónde, cuándo y con qué recurrencia.

Ese registro es el producto de largo plazo:

- Mapas de vulnerabilidad construidos desde abajo, no desde el promedio departamental.
- Insumo directo para planes municipales de gestión del riesgo y adaptación.
- Identificación de puntos críticos recurrentes que justifican obra de mitigación en lugar de ayuda repetida.
- Cierre del ciclo: la afectación de este año calibra la alerta preventiva del próximo.

La comunidad deja de ser solo receptora de ayuda y se convierte en la red de sensores del territorio.

## Contribución a la adaptación climática

| Dimensión | Aporte |
|---|---|
| **Capacidad anticipatoria** | Convierte alertas técnicas en acción preventiva a nivel vereda |
| **Reducción de pérdida** | Recomendaciones específicas a pequeños productores antes del evento |
| **Capacidad adaptativa** | Ruta de recuperación de medios de subsistencia, no solo ayuda humanitaria |
| **Información para decidir** | Datos de afectación georreferenciados para planeación municipal de adaptación |
| **Equidad en la adaptación** | Accesible desde WhatsApp, sin app, sin dispositivo moderno, con audio y en lenguaje cotidiano |

## Principio central

> **El ciudadano no debería adaptarse a la tecnología durante una emergencia. La tecnología debería adaptarse al ciudadano.**

## Alineación normativa

- **Ley 1523 de 2012**, que define la gestión del riesgo de desastres como proceso asociado a la adaptación al cambio climático y establece los principios de participación e información.
- **Plan Nacional de Adaptación al Cambio Climático**, en su énfasis de gestión de información y adaptación basada en comunidades.
- **Ley 2169 de 2021** de acción climática y sus metas de resiliencia territorial.

*[Confirmar el artículo exacto de la Ley 1523 que vincula gestión del riesgo y adaptación antes de citarlo en la presentación.]*

## Alcance del prototipo (24 horas)

Lo que se demuestra funcionando, no lo que se promete:

1. Flujo de alerta preventiva enviada por geocerca a un municipio de prueba, con recomendación diferenciada para productor agropecuario.
2. Reporte ciudadano por audio y foto, estructurado y geolocalizado por IA.
3. Orientación conversacional sobre ruta de ayuda y documentos faltantes.
4. Vista agregada de reportes: mapa de calor de afectación por vereda.

Los datos de alerta se usan desde un conjunto cacheado de fuente oficial, no por integración en vivo: la integración en producción es trabajo posterior y se declara como tal.

## Métricas propuestas

- Tiempo entre evento y primer reporte estructurado.
- Porcentaje de reportes con geolocalización y evidencia utilizable.
- Porcentaje de alertas preventivas seguidas de acción reportada por la comunidad.
- Porcentaje de ayudas con confirmación de entrega por parte del beneficiario.
- Cobertura de veredas con al menos un reporte, como proxy de alcance del registro de vulnerabilidad.
