# Documentación — ConectaRiesgo

Catorce documentos, cada uno responde una pregunta distinta.

| Documento | Responde | Quién lo usa |
|:---|:---|:---|
| **[CONTROL.md](CONTROL.md)** | ¿En qué vamos? ¿Qué está trabado? | **PMO — se mira primero** |
| **[FASES.md](FASES.md)** | ¿Qué se construye, en qué orden, qué se corta? | Todos |
| **[ARQUITECTURA.md](ARQUITECTURA.md)** | ¿Dónde va cada archivo y por qué? | **Backend y frontend — antes de escribir código** |
| **[MODELO-DATOS.md](MODELO-DATOS.md)** | ¿Qué datos guarda el sistema? | Backend |
| **[CANALES-CONVERSACIONALES.md](CANALES-CONVERSACIONALES.md)** | ¿Qué plataformas reciben WhatsApp y las llamadas, y dónde escriben? | **Quien toque el bot o el agente de voz** |
| **[AGENTE-WHATSAPP.md](AGENTE-WHATSAPP.md)** | ¿Cómo debe comportarse el bot de WhatsApp y qué nunca hace? | Quien opere el bot |
| **[agente-llamadas.md](agente-llamadas.md)** | El prompt del agente telefónico | Quien opere Dapta |
| **[INTEGRACION-BOT-BACKEND.md](INTEGRACION-BOT-BACKEND.md)** | ¿Cómo se conectan los bots con el backend? | Backend |
| **[SISTEMA-REPORTES-COLOMBIA.md](SISTEMA-REPORTES-COLOMBIA.md)** | ¿Cómo funciona hoy el reporte oficial en Colombia? | Todos — es el porqué del producto |
| **[CONTRATO-API.md](CONTRATO-API.md)** | ¿Qué endpoints hay y qué devuelven? | Backend y frontend |
| **[REPARTO-SECTORIAL.md](REPARTO-SECTORIAL.md)** | ¿Cómo llega a cada ministerio lo que le toca? | Quien construya el panel de la UNGRD |
| **[EXPERIENCIAS-FRONTEND.md](EXPERIENCIAS-FRONTEND.md)** | ¿Una app o dos? ¿Dónde vive cada pantalla y cada rol? | **Frontend — antes de mover un archivo** |
| **[DATOS-SATELITALES.md](DATOS-SATELITALES.md)** | ¿Qué datos satelitales se pueden consumir de verdad, y qué no prometer? | Quien construya o explique la verificación satelital |
| **[GESTION-RIESGO-DESASTRES.md](GESTION-RIESGO-DESASTRES.md)** | Transcripción de las entrevistas con la UNGRD: cómo funciona hoy la gestión de riesgo en Colombia | Contexto para `REPARTO-SECTORIAL.md` y el agente de WhatsApp |

Y sobre cómo trabajamos, todo está en **[`CLAUDE.md`](../CLAUDE.md)** en la raíz: convenciones de
código, arquitectura del backend, reglas de seguridad y flujo de Pull Requests.

**[CODERABBIT.md](CODERABBIT.md)** — el revisor automático de PRs. Léelo antes de abrir tu primer
PR: hay que **dispararlo a mano** escribiendo `@coderabbitai review` en el PR.

También hay **skills y agentes** en [`.claude/`](../.claude/) para auditar código, crear épicas y
consultar issues.

Y en [`idea-negocio/`](idea-negocio/) queda la exploración inicial del problema. **Ojo:** esos
documentos son de cuando el producto se pensaba como asistente por WhatsApp y con otro nombre.
Sirven como contexto, no como especificación.

---

## Si acabas de llegar al proyecto

1. **[FASES.md](FASES.md)** — para entender qué estamos construyendo y en qué orden
2. **[CONTROL.md](CONTROL.md)** — para saber qué está trabado ahora mismo
3. Tu tarea → [issues del repositorio](https://github.com/jasonfabian8/app-ungrd/issues), filtra por tu nombre
4. **[CONTRATO-API.md](CONTRATO-API.md)** si tocas backend o frontend

---

## Las cuatro reglas que sostienen el proyecto

**Nadie espera a nadie.** El frontend construye contra datos falsos con la forma exacta del contrato de API. Esperar al backend convierte 20 horas de trabajo paralelo en 20 horas en fila.

**Nada se rompe por un servicio ajeno.** NASA, SECOP y Bluesky pueden caerse. Cuando pasa, el bloque desaparece y el resto de la pantalla sigue funcionando.

**Ninguna credencial en el código.** El repositorio es público: lo que se sube queda expuesto y sigue siendo recuperable del historial aunque después se borre.

**A la hora 16 se congela.** Lo que no esté empezado no entra. Meter "una cosita rápida" al final es la forma más común de llegar sin demo.
