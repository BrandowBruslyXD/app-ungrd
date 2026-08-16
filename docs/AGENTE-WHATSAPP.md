# Agente de WhatsApp — reglas de funcionamiento

> Qué hace el agente, qué **nunca** hace, y cómo se construye.
> Este documento manda sobre cualquier prompt suelto. Si el comportamiento del agente
> contradice algo de aquí, el error está en el agente.

---

## 1. La tesis, en una frase

La experta de la UNGRD que asesoró al equipo lo dijo mejor de lo que podríamos decirlo nosotros, describiendo un grupo de WhatsApp con 700 personas reportando daños:

> *«Este chat es una herramienta que cualquier persona maneja, pero la información que hay en este chat **requiere un procesamiento que no cualquier persona maneja**.»*

Ahí está todo el producto:

| Lo que ya existe | Lo que falta |
|:---|:---|
| Gente reportando por WhatsApp con foto y coordenadas | Que eso se convierta en datos estructurados |
| 700 mensajes en un grupo | Clasificación, ubicación y prioridad |
| Voluntarios llenando formularios | Que alguien los lea sin morir en el intento |

**El agente no inventa un canal nuevo: ordena el que la gente ya usa.**

Y hay un dato que lo vuelve urgente. De 1.120 municipios, unos 400 están afectados y **solo 5 ciudades principales tienen información**. Los otros 395 son un hueco negro. Esos municipios no van a instalar una app: **ya tienen WhatsApp**.

---

## 2. Qué es y qué no es

### Es

- Un **asistente conversacional** por WhatsApp que acompaña a una persona a reportar una emergencia, registrar su afectación y consultar en qué va su caso.
- Un **traductor**: convierte lenguaje natural, audios y fotos en registros estructurados que entran en la cadena real de atención.
- Un **primer filtro**: clasifica, ubica, detecta duplicados y prioriza antes de que un humano lo mire.

### No es

- **No es una autoridad.** No aprueba ayudas, no decide elegibilidad, no promete plazos.
- **No es un motor de búsqueda.** No responde de memoria: responde con datos del sistema o dice que no sabe.
- **No reemplaza a los organismos de socorro.** Ante riesgo de vida, entrega números de emergencia y se aparta.

> **La regla que resume todas:** en una emergencia, una respuesta inventada es peor que ninguna respuesta.

---

## 3. Los tres trabajos del agente

Todo lo que hace cae en uno de estos tres. Si una funcionalidad no encaja en ninguno, probablemente no va aquí.

```
┌─ REPORTAR ──────┐   ┌─ REGISTRAR ─────┐   ┌─ CONSULTAR ─────┐
│ «se cayó un     │   │ Datos de la      │   │ «¿en qué va mi  │
│  puente»        │   │ persona afectada │   │  reporte?»      │
│                 │   │ y sus daños      │   │                 │
│ Ciudadano       │   │ Brigadista       │   │ Cualquiera      │
│ 30 segundos     │   │ 5 a 10 minutos   │   │ 5 segundos      │
└─────────────────┘   └──────────────────┘   └─────────────────┘
```

---

## 4. Catálogo de funcionalidades

Prioridad: **P0** = sin esto no hay agente · **P1** = suma mucho · **P2** = si sobra tiempo

### Reportar una emergencia

| # | Funcionalidad | Prioridad |
|:---|:---|:---:|
| R1 | Recibir un reporte en **lenguaje natural** («se está inundando la vía a Quimbaya») y extraer tipo, descripción y lugar | **P0** |
| R2 | Pedir **ubicación** con el botón nativo de WhatsApp, y aceptar dirección escrita si la persona no puede compartirla | **P0** |
| R3 | Recibir **fotos** y asociarlas al reporte | **P0** |
| R4 | Devolver un **código de seguimiento** (`RPT-2026-08-15-0047`) y explicar qué sigue | **P0** |
| R5 | Entender **notas de voz** — mucha gente no escribe, y menos en una emergencia | **P1** |
| R6 | Detectar **duplicados**: si tres vecinos reportan el mismo incendio, agruparlos en vez de crear tres casos | **P1** |
| R7 | Clasificar por **sector y entidad responsable** (hospital→MinSalud, colegio→MinEducación, vía→MinTransporte) | **P1** |
| R8 | Sugerir **prioridad** según tipo, personas afectadas y vulnerabilidad | **P2** |

> **R7 no es un adorno.** La experta fue explícita: *«esa información que ustedes piensan recolectar tiene que ser etiquetada para que vaya a la entidad correspondiente»*. Un reporte sin sector no entra en la cadena real de decisión: se queda en un mapa bonito.

### Registrar una persona damnificada (EDAN)

Este es el trabajo del **brigadista**, no del ciudadano. Es el formulario oficial de Evaluación de Daños y Necesidades, conversacional.

| # | Funcionalidad | Prioridad |
|:---|:---|:---:|
| G1 | Guiar el registro **paso a paso**, una pregunta a la vez, sin abrumar | **P0** |
| G2 | Capturar identificación, y **aceptar que no haya documento** | **P0** |
| G3 | Registrar **núcleo familiar** | **P1** |
| G4 | Registrar **daños por categoría y nivel** (leve → destrucción total) | **P1** |
| G5 | Capturar **condiciones de vulnerabilidad**: cabeza de hogar, discapacidad, adulto mayor, embarazo, grupo étnico | **P1** |
| G6 | Pedir y registrar el **consentimiento de datos** antes de guardar nada | **P0** |
| G7 | Permitir **retomar** un registro a medias («sigamos con la familia Rodríguez») | **P2** |

> **G2 es una decisión de fondo, no un detalle técnico.** Quien perdió la cédula en la inundación es exactamente quien más necesita la ayuda. Si el agente exige documento, el sistema deja fuera a los más afectados.

### Consultar

| # | Funcionalidad | Prioridad |
|:---|:---|:---:|
| C1 | **Estado de un reporte** por su código, con la cronología en lenguaje claro | **P0** |
| C2 | **Mis reportes**: todo lo que ha reportado este número | **P1** |
| C3 | **Emergencias cerca de mí** | **P1** |
| C4 | **Orientación sobre trámites**: qué ayudas existen, ante qué entidad, qué requisitos | **P1** |
| C5 | **Transparencia**: qué ha contratado la alcaldía en prevención en ese municipio (SECOP) | **P2** |
| C6 | **Proyección de necesidades**: cuántos kits y albergues hace falta según los daños registrados | **P2** |

### Control y gestión

| # | Funcionalidad | Prioridad |
|:---|:---|:---:|
| A1 | Identificar a la persona **por su número de teléfono** y saber su rol | **P0** |
| A2 | **Escalar a un humano** cuando el agente no puede resolver | **P1** |
| A3 | **Traza completa**: quién preguntó qué y qué respondió el agente | **P1** |
| A4 | **Difusión**: enviar avisos a quienes reportaron en una zona | **P2** |

---

## 5. Reglas de comportamiento — innegociables

Estas no se negocian por falta de tiempo. Son las que evitan que el agente haga daño.

### 5.1 No inventar, nunca

El agente **solo afirma lo que está en el sistema**. Si no sabe, lo dice:

> ✅ *«No tengo el dato de cuándo llega la brigada. Tu reporte está en estado "Asignado" desde las 3:15 p.m.»*
> ❌ *«La brigada llega en aproximadamente 2 horas.»*

Prohibido inventar: plazos, montos de ayudas, nombres de funcionarios, requisitos de trámites que no estén en la base de conocimiento, y **si una persona es elegible o no** para una ayuda.

### 5.2 Riesgo de vida: apartarse

Si el mensaje sugiere peligro inmediato — personas atrapadas, heridos, desaparecidos, fuego activo — el agente **corta el flujo conversacional** y entrega los números de emergencia (123, Bomberos, Defensa Civil), marca el reporte como prioridad alta y notifica al gestor.

**No conversa. No pregunta cinco datos más. No espera.**

### 5.3 El consentimiento va antes del dato

No se guarda ninguna persona afectada sin `ConsentimientoDatos` en `true`, y el agente debe pedirlo **en lenguaje comprensible**, no con un párrafo legal:

> *«Para registrarte necesito guardar tu nombre, documento y datos de tu familia. Solo los verá la alcaldía y las entidades que atienden la emergencia. ¿Autorizas? Responde SÍ o NO.»*

Si la respuesta es NO, el agente **igual puede registrar el daño de forma anónima** (ubicación y tipo), porque esa información sirve para la respuesta agregada sin identificar a nadie.

### 5.4 Mínima recolección

El agente pide **solo lo que necesita para el caso concreto**. No pregunta el documento si la persona solo quiere reportar un árbol caído.

Y en los **logs va el identificador, nunca el contenido**: `reporte RPT-...-0047 creado por usuario 12`, no el texto del mensaje ni la foto.

### 5.5 Cuidado especial con menores

Los datos de menores tienen protección reforzada bajo la Ley 1581. El agente los registra **solo dentro de un núcleo familiar**, nunca como titular principal, y nunca pide foto de un menor.

### 5.6 Hablar como la gente

Español neutro, frases cortas, **sin jerga técnica ni códigos de error**. Los usuarios están en emergencia, con conexión mala y a veces con el celular casi sin batería.

> ✅ *«No pude guardar la foto, pero tu reporte sí quedó registrado con el código RPT-2026-08-15-0047.»*
> ❌ *«Error 413: payload too large.»*

### 5.7 Una pregunta a la vez

En WhatsApp no existen los formularios. Si el agente manda cinco preguntas juntas, la persona responde una y se pierden cuatro.

### 5.8 Nunca dejar a alguien sin salida

Ante cualquier duda, el agente ofrece **hablar con una persona**. Un agente que responde «no entiendo» tres veces seguidas y no escala es peor que no tener agente.

---

## 6. Cómo se construye

### 6.1 El canal

| Opción | Cuándo conviene | Costo |
|:---|:---|:---|
| **Twilio Sandbox** | Prototipo y demo. Se levanta en **20 minutos**, sin verificar empresa | Gratis para pruebas |
| **Meta Cloud API** | Producción real. Número propio | Gratis hasta cierto volumen; requiere verificación de negocio |
| **Proveedor local (BSP)** | Cuando hay que facturar en Colombia | Variable |

> **Para el hackathon: Twilio Sandbox.** La verificación de empresa de Meta tarda días y no cabe en el tiempo disponible. El usuario de la demo se une al sandbox escaneando un QR o mandando una palabra clave. **Verificar esto el primer día**, no la noche antes.

### 6.2 La arquitectura

```
WhatsApp
   │  webhook (HTTP POST)
   ▼
ms-whatsapp  ← microservicio nuevo, en servicios/
   │  1. valida la firma del webhook
   │  2. recupera el estado de la conversación
   │  3. transcribe audio / procesa imagen si viene
   │  4. decide la intención
   ▼
Motor de intenciones ──► LLM (solo para entender, no para afirmar)
   │
   ▼
API de ConectaRiesgoAI  ← el backend que ya existe
   │  POST /api/reportes · GET /api/reportes/{codigo} · …
   ▼
PostgreSQL
```

**Encaja con lo que ya está construido.** El agente **no habla con la base de datos**: consume el mismo contrato de API que el frontend web. Así, una regla de negocio se escribe una sola vez.

### 6.3 Por qué un microservicio aparte

Igual que `ms-bot-api`: si WhatsApp o el proveedor se caen, **el backend y la app web siguen funcionando**. Y quien lo construya no depende de que el backend esté terminado.

### 6.4 El estado de la conversación

WhatsApp no tiene sesión. El agente necesita recordar en qué punto va cada persona:

```
ConversacionWhatsApp
  Telefono          string   (clave — identifica a la persona)
  UsuarioId         int?     (si ya está registrado en el sistema)
  Intencion         enum     Reportar | Registrar | Consultar | Ninguna
  Paso              int      en qué punto del flujo va
  DatosParciales    jsonb    lo capturado hasta ahora
  ReporteEnCurso    string?  código del reporte que se está armando
  ActualizadoEn     datetime
```

**Regla:** una conversación sin actividad por más de 30 minutos se archiva. Si la persona vuelve, el agente pregunta si quiere continuar o empezar de nuevo — no asume.

### 6.5 Dónde entra el modelo de lenguaje, y dónde no

| Sí | No |
|:---|:---|
| Entender qué quiere la persona | Decidir si alguien recibe una ayuda |
| Extraer tipo, lugar y descripción de un texto suelto | Inventar plazos o montos |
| Transcribir notas de voz | Responder de su propio conocimiento |
| Redactar la respuesta en lenguaje claro | Cambiar el estado de un reporte |

**El modelo entiende y redacta. El sistema decide.** Todo lo que el agente afirma sobre un caso sale de una llamada a la API, no del modelo.

Y una advertencia que aplica al elegir proveedor: **este sistema maneja documentos de identidad, fotos de rostro y datos de salud**. Hay que revisar qué se manda a un servicio de IA de terceros y minimizarlo. Enviar el texto de un reporte está bien; enviar la foto de una cédula, no.

### 6.6 Reglas técnicas que evitan desastres

1. **Idempotencia.** WhatsApp reintenta los webhooks. Si llega dos veces el mismo `messageId`, se procesa una sola vez, o el ciudadano acabará con tres reportes idénticos.
2. **Responder en menos de 5 segundos.** Si el proceso va a tardar, se manda primero un «dame un segundo» y luego el resultado.
3. **Validar la firma del webhook.** Sin eso, cualquiera puede inyectar mensajes falsos en el sistema.
4. **Límite por número.** Un número que manda 100 mensajes en un minuto se limita: protege contra abuso y contra bucles.
5. **Timeout en toda llamada externa**, igual que en los otros microservicios.
6. **Si el modelo falla, hay plan B.** El agente cae a un menú numerado (`1. Reportar · 2. Consultar · 3. Hablar con alguien`). Un agente que no responde porque se acabó la cuota es un agente inútil justo cuando más importa.

---

## 7. Qué se construye ahora

### Alcance mínimo demostrable

Con esto ya hay algo que se presenta y funciona de punta a punta:

- **R1, R2, R3, R4** — reportar en lenguaje natural con ubicación y foto, y recibir el código
- **C1** — consultar el estado por código
- **A1** — identificar a la persona por su número
- **Reglas 5.1, 5.2, 5.6, 5.7** — no inventar, riesgo de vida, lenguaje claro, una pregunta a la vez

### Lo que sigue

**R5** (notas de voz) y **R7** (etiquetado por entidad) son los que más suman al pitch después del mínimo. El registro EDAN completo (**G1–G7**) es una fase aparte: son cinco pasos con validación, mucho más trabajo que reportar.

### El momento que hay que ensayar

Mandar un audio por WhatsApp diciendo *«se está inundando la vía principal en Quimbaya»*, que el agente responda con el código de seguimiento, y **que ese reporte aparezca en vivo en el mapa de la app web**.

Ese salto entre canales es lo que demuestra que hay un sistema detrás y no un chatbot suelto.

---

## 8. Riesgos

| # | Riesgo | Qué hacer |
|:---|:---|:---|
| A1 | **El agente inventa un dato en la demo** | Prohibido responder sin consultar la API. Probar antes con preguntas capciosas |
| A2 | **El sandbox de WhatsApp no funciona en el evento** | Verificarlo el primer día y grabar el video de respaldo |
| A3 | **Se acaba la cuota del modelo a mitad de demo** | Plan B con menú numerado |
| A4 | **Alguien manda datos personales reales** | Solo datos inventados en la demo, y decirlo en el pitch |
| A5 | **Suplantación**: alguien consulta el reporte de otro | El número de teléfono es la identidad. Un reporte solo lo consulta quien lo creó, o quien tenga el código |
| A6 | **Emergencia masiva satura el agente** | Límite por número y cola de procesamiento |

---

## 9. Preguntas abiertas

Cosas que hay que decidir antes de construir, no durante:

1. **¿Un solo número para todos los roles, o números distintos** para ciudadano y brigadista? Un solo número es más simple; el rol se deduce del teléfono registrado.
2. **¿Qué pasa con quien escribe desde un número no registrado?** Propuesta: puede reportar (el reporte anónimo tiene valor) pero no registrar damnificados.
3. **¿Se guardan los mensajes originales?** Sirven para auditar y mejorar, pero son datos personales. Propuesta: guardar solo el dato extraído, no el texto crudo.
4. **¿Quién atiende los escalamientos a humano** durante la demo?
