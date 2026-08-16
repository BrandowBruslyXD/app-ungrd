# Canales conversacionales — WhatsApp y llamada telefónica

> Cómo entra un reporte cuando la persona **no usa la aplicación web**: qué plataforma lo recibe,
> qué API consumimos, dónde se guarda y qué falta para cerrar el circuito.
>
> El **comportamiento** del bot de WhatsApp está en [AGENTE-WHATSAPP.md](AGENTE-WHATSAPP.md) y el
> **guion** del agente de voz en [agente-llamadas.md](agente-llamadas.md). Este documento es la
> **infraestructura**: lo que hay debajo de esas dos conversaciones.

---

## Por qué existen estos canales

Muchos municipios de Colombia no tienen internet estable, y en una emergencia el celular que
queda encendido es el que hace llamadas y manda WhatsApp. Una aplicación que exige instalar algo
deja fuera exactamente a quien más la necesita.

Por eso el mismo reporte entra por tres puertas distintas y termina en un solo sitio:

```
   Llamada          WhatsApp         App web
  (voz, Dapta)   (Meta Cloud API)   (formulario)
       │                │                │
       └────────┬───────┘                │
                ▼                        │
          ms-bot-api  ◄──── hoy          │
                │                        │
                ▼                        ▼
        POST /api/ingesta/*      POST /api/reportes
                └────────┬───────────────┘
                         ▼
                  PostgreSQL · un solo caso, un solo código
```

**Los tres canales producen el mismo objeto**: un reporte con su código `RPT-AAAA-MM-DD-NNNN`, que
el ciudadano puede consultar después por donde quiera.

---

## Canal 1 · WhatsApp

### Las dos plataformas, y por qué hay dos

| | **Meta Cloud API** | **Evolution API** |
|:---|:---|:---|
| Rol | **Principal** | Respaldo |
| Qué es | La API oficial de WhatsApp Business, de Meta | Un puente no oficial sobre Baileys |
| Botones y listas nativas | ✅ | ❌ |
| Ubicación por pin del mapa | ✅ | ❌ |
| Estabilidad | Alta | Se cae cada pocas semanas |
| Requisitos | Verificación de negocio, número propio | Escanear un QR |
| Estado | ✅ Probado de punta a punta | ✅ Probado de punta a punta |

Es la **decisión D18** de [CONTROL.md](CONTROL.md): Baileys no soporta botones ni ubicación nativa
y se cae solo, así que el canal principal es Meta. Evolution se conserva porque **no depende de
que Meta apruebe nada**: si el día de la demo la verificación de negocio da problemas, el mismo
flujo sigue funcionando escaneando un QR.

En una emergencia el botón nativo importa más de lo que parece: escribir «1» para elegir una
opción se equivoca; tocar un botón, no.

### El bifurcador de webhooks

**Una app de Meta tiene un solo webhook**, y el número que usamos está prestado por otro cliente
que también recibe mensajes en esa misma app. Sin resolver eso, o rompíamos su producción o no
podíamos probar.

La solución (**decisión D19**) es un bifurcador que reparte por `phone_number_id`:

```
Webhook de Meta
      │
      ▼
  ¿phone_number_id es el número de prueba?
      │
      ├── sí  → flujo de ConectaRiesgoAI
      └── no  → producción del otro cliente   ◄── y ante cualquier duda, aquí
```

**El caso ambiguo se manda al cliente, no a nosotros.** Perder un mensaje de prueba cuesta una
prueba; perder uno suyo cuesta un cliente.

### Quién orquesta la conversación

El flujo conversacional vive en **wabots**, una plataforma de flujos alojada en el VPS del equipo.
Ahí están los nodos que reciben el mensaje, llaman al modelo para entender lo que dijo la persona,
y hacen las peticiones HTTP que guardan el reporte.

**Una trampa que ya nos costó un fallo real:** el nodo HTTP de wabots **solo detecta fallos de
red**. Si la API responde `500`, para el nodo eso es una respuesta válida — y el bot le decía a la
persona «su reporte quedó registrado» sin haber guardado nada. Fue lo que destapó la decisión
**D17** (faltaban los tipos `Sismo`, `Vendaval` y `AvenidaTorrencial`, y el backend devolvía 500).

> **Regla para cualquiera que toque el flujo:** después de un nodo HTTP hay que **mirar el código
> de estado**, no asumir que hubo respuesta significa que hubo éxito. Confirmarle a alguien en
> emergencia que su reporte quedó guardado cuando no es cierto es el peor fallo posible de este
> sistema.

### Dónde escribe hoy

En **`ms-bot-api`**, la API puente documentada en
[`servicios/ms-bot-api/README.md`](../servicios/ms-bot-api/README.md):

| | |
|:---|:---|
| Dónde corre | VPS del equipo, contenedor `conectariesgo-api` en la red Docker `edge` |
| Expuesto a internet | **No.** Solo lo alcanza `wabots-backend` por la red interna |
| Persistencia | Un `datos.json` en un volumen, sin base de datos |
| Endpoints | `POST /reportes` · `GET /reportes/{codigo}` · `POST /reportes/{codigo}/estado` · `POST /censo` · `GET /todo` · `GET /health` |

**Existe para desaparecer.** Nació para que el bot devolviera códigos de seguimiento reales
mientras el backend .NET no exponía sus casos de uso. Hoy esos casos de uso ya existen —la
rebanada `Features/Ingesta/`— y lo único que falta es cambiar la URL en los nodos del flujo. Es el
bloqueante **B3**.

---

## Canal 2 · Llamada telefónica

### La plataforma: Dapta

Las llamadas las atiende un agente de voz construido sobre **[Dapta](https://dapta.ai/)**, una
plataforma de agentes de voz y texto que permite montar el agente sin escribir código, conectarlo
a APIs propias y atender llamadas entrantes y salientes. Habla español latinoamericano con acento
natural, que para esta línea no es un detalle estético: una voz que suena extranjera hace que la
gente cuelgue.

**Estado: ✅ funcionando**, con transferencia por riesgo vital probada.

### Qué hace el agente en una llamada

El guion completo está en [agente-llamadas.md](agente-llamadas.md). Lo que importa de la
infraestructura:

| Paso | Qué ocurre |
|:---|:---|
| 1 | **Detección de riesgo vital** — antes que cualquier otra cosa |
| 2 | Escucha primero, pregunta después |
| 3 | Distingue **afectación propia** de **aviso de evento** |
| 4 | Ubica: municipio, vereda o barrio, referencia |
| 5 | Clasifica el tipo con **el mismo vocabulario que WhatsApp** |
| 6 | Registra el reporte y **le dicta el código a la persona** |
| 7 | Cierra con `end_call` |

**El vocabulario compartido no es casualidad.** El agente de voz usa exactamente los mismos
valores de tipo que el bot de WhatsApp —`Inundacion`, `Deslizamiento`, `Sismo`, `Vendaval`,
`Avenida torrencial`…—, sin tildes. Si el agente inventara una variante («derrumbe» en vez de
«Deslizamiento»), el reporte entraría sin clasificar y no aparecería en el tablero del gestor.

### El riesgo de vida no depende de la IA

Es la decisión más importante de este canal y merece leerse dos veces.

En pruebas, **«hay una señora atrapada» no disparó la transferencia**. El modelo no lo interpretó
como riesgo vital. Eso, en producción, es una persona esperando mientras un bot le pregunta por su
municipio.

Ahora la detección **corta antes de llamar al modelo**, con un patrón determinístico de unas veinte
palabras. Verificado en tres escenarios, incluido el de que no dispare de más.

> Un modelo de lenguaje es excelente entendiendo lenguaje libre y **no es fiable como interruptor
> de seguridad**. Lo que salva una vida no puede depender de una inferencia.

### Qué API consume

El agente llama a la misma API puente que WhatsApp: **`ms-bot-api`**, y por eso los dos canales
producen códigos del mismo formato y consultables en el mismo sitio.

Cuando se complete B3, ambos apuntarán a `POST /api/ingesta/reportes` del backend .NET.

---

## El contrato de ingesta — la puerta común

Sección 6 de [CONTRATO-API.md](CONTRATO-API.md). Es un contrato **aparte** del de la aplicación
web, por tres razones concretas:

1. **El bot no tiene sesión de usuario.** Se autentica como servicio con la cabecera `X-Api-Key`,
   no con `Authorization: Bearer`.
2. **La ubicación llega como texto libre**, no como coordenadas: *«Soacha, Villa Mercedes, frente a
   la cancha»*. Nadie dicta su latitud por teléfono.
3. **El usuario se crea solo**, por número de teléfono, la primera vez que ese número escribe o
   llama (`Rol=Ciudadano`, sin contraseña, `OrigenRegistro=WhatsApp`).

```json
POST /api/ingesta/reportes      X-Api-Key: ···
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

201  { "codigo": "RPT-2026-08-16-0001", "estado": "Reportado" }
```

`clase` distingue **afectación propia** de **aviso de evento**, y viaja en `snake_case` tal como lo
habla el bot. `tipo` usa los valores del contrato.

Hay también `POST /api/ingesta/censo` para el registro del brigadista, y
`GET /api/ingesta/reportes/{codigo}` **público**, que es lo que permite consultar por el código
sin cuenta.

---

## Estado real, sin adornos

| Pieza | Estado |
|:---|:---|
| WhatsApp por Meta Cloud API | ✅ Probado: botones nativos, listas, ubicación por pin |
| WhatsApp por Evolution | ✅ Probado, como respaldo |
| Llamada telefónica con Dapta | ✅ Funcionando, con transferencia por riesgo vital |
| Detección determinística de riesgo vital | ✅ Verificada en tres escenarios |
| Escritura en `ms-bot-api` | ✅ Los tres canales conversacionales |
| **Escritura en el backend .NET** | ⬜ **Bloqueante B3** |
| Verificación del código de estado tras el nodo HTTP | ⬜ Pendiente en el flujo |

### Lo que falta para cerrar el circuito

Dos cambios, ninguno grande:

1. **Cambiar la URL en los nodos del flujo** de wabots, de `ms-bot-api` a
   `POST /api/ingesta/reportes`.
2. **Añadir el host del backend a `HTTP_NODE_ALLOWED_HOSTS`** en la configuración de wabots — lo
   que obliga a recrear el contenedor `wabots-backend`.

Hasta entonces **el dato vive en dos sitios**: lo que entra por conversación en el `datos.json` de
la API puente, y lo que entra por la web en PostgreSQL. Para la demo funciona; como producto, no.

---

## Lo que este documento no puede decir

Por honestidad, y para que nadie lo busque en el repositorio:

- **La configuración de Dapta vive fuera del código**: el agente, su voz, el número de teléfono y
  las credenciales están en la plataforma, no aquí. Quien la opere debería anotar en `CONTROL.md`
  el identificador del agente y quién tiene acceso.
- **El flujo de wabots tampoco está versionado.** Los nodos se editan en su interfaz. Si el
  servidor se pierde, se pierde el flujo: conviene exportarlo y guardarlo en el repositorio.
- **Ninguna credencial de Meta, Evolution o Dapta está —ni puede estar— en este repositorio**, que
  es público.

Y un riesgo que conviene tener a la vista: **tres canales escribiendo por una API puente sin base
de datos, en un solo VPS, es un punto único de fallo**. Si ese contenedor se cae durante la demo,
se caen WhatsApp y las llamadas a la vez. Completar B3 no es solo higiene de arquitectura: es lo
que quita ese riesgo.

---

**Fuentes externas:** [Dapta — plataforma de agentes de voz](https://dapta.ai/) ·
[Dapta — agente de voz](https://dapta.ai/ai-voice-agent/)
