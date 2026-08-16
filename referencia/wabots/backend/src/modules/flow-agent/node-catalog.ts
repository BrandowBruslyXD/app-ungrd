/**
 * CATÁLOGO DE NODOS — fuente ÚNICA de verdad para el agente constructor de flujos.
 *
 * Espejo backend de `frontend/src/flow/palette.js` + `handles.js`. Describe cada
 * tipo de nodo con: descripción, handles de entrada/salida (reglas de conexión),
 * campos `data` válidos (con tipo/required/enum/default) y consejos de uso.
 *
 * El agente IA NUNCA debe inventar tipos, handles ni campos: consulta este
 * catálogo (vía las tools getCatalog / getNodeSpec) como verdad absoluta.
 */

import { NodeType } from '../../common/types/engine.types';

/** Descriptor de un campo `data` de un nodo. */
export interface FieldSpec {
  type: 'string' | 'number' | 'boolean' | 'string[]' | 'object' | 'options';
  required?: boolean;
  default?: any;
  enum?: string[];
  desc: string;
}

/** Un handle de salida del nodo (puerto de conexión source). */
export interface OutHandleSpec {
  id: string;
  label: string;
  /** Cuándo se sigue por este handle. */
  when: string;
}

/** Ficha completa de un tipo de nodo. */
export interface NodeSpec {
  type: NodeType;
  label: string;
  group: string;
  description: string;
  /** Handles de entrada (target). [] = no recibe entradas (p.ej. trigger). */
  inputs: string[];
  /**
   * Handles de salida (source). Para nodos dinámicos (interactiveMenu) los
   * handles `opt:<id>` se generan a partir de data.options; aquí se documenta
   * la regla en `dynamicOut`.
   */
  outputs: OutHandleSpec[];
  /** Si el nodo genera salidas dinámicas, se describe aquí. */
  dynamicOut?: string;
  data: Record<string, FieldSpec>;
  /** Reglas/consejos de conexión y uso para el agente. */
  tips: string[];
}

// Handles de salida comunes.
const OUT: OutHandleSpec = { id: 'out', label: 'Salida', when: 'siempre, tras ejecutar el nodo' };
const ON_ERROR: OutHandleSpec = { id: 'onError', label: 'Error', when: 'si la integración falla' };

export const NODE_CATALOG: NodeSpec[] = [
  {
    type: 'trigger',
    label: 'Disparador',
    group: 'Disparador',
    description:
      'Punto de ENTRADA del flujo. Todo flujo debe tener EXACTAMENTE UNO. Se activa cuando el cliente escribe al bot.',
    inputs: [],
    outputs: [OUT],
    data: {
      match: {
        type: 'options',
        enum: ['any', 'keyword'],
        default: 'any',
        desc: "'any' dispara con cualquier mensaje; 'keyword' solo si el texto coincide con alguna palabra clave.",
      },
      keywords: {
        type: 'string[]',
        default: [],
        desc: "Palabras clave que disparan el flujo (solo si match='keyword').",
      },
    },
    tips: [
      'Debe haber UN solo trigger por flujo y es la raíz del grafo.',
      'No tiene handle de entrada; su salida "out" se conecta al primer paso.',
    ],
  },
  {
    type: 'sendText',
    label: 'Enviar texto',
    group: 'Mensajes',
    description: 'Envía un mensaje de texto al cliente. Soporta {{variables}} interpoladas.',
    inputs: ['in'],
    outputs: [OUT],
    data: {
      text: { type: 'string', required: true, default: '', desc: 'Texto a enviar. Admite {{variable}}.' },
    },
    tips: ['Úsalo para saludos, confirmaciones e información. Continúa por "out".'],
  },
  {
    type: 'interactiveMenu',
    label: 'Menú interactivo',
    group: 'Mensajes',
    description:
      'Muestra un menú con opciones seleccionables. Cada opción es un camino distinto. Ideal para flujos sin IA.',
    inputs: ['in'],
    outputs: [{ id: 'out', label: 'Sin coincidencia', when: 'si la respuesta no coincide con ninguna opción' }],
    dynamicOut:
      'Genera un handle "opt:<id>" por CADA opción en data.options (p.ej. opt:1, opt:2). Conecta cada opción a su camino. El handle "out" es el fallback (respuesta no reconocida).',
    data: {
      header: { type: 'string', default: '', desc: 'Título opcional del menú.' },
      body: { type: 'string', required: true, default: '', desc: 'Texto/pregunta del menú.' },
      menuType: {
        type: 'options',
        enum: ['text', 'buttons', 'list'],
        default: 'text',
        desc: "Cómo se renderiza: 'text' (numerado), 'buttons' (≤3 botones de WhatsApp), 'list' (lista desplegable ≤10).",
      },
      options: {
        type: 'object',
        required: true,
        default: [{ id: '1', label: '' }],
        desc: 'Array de { id, label } (también admite description). El id debe ser único y se usa en el handle opt:<id>.',
      },
      listButtonText: { type: 'string', default: '', desc: "Texto del botón que abre la lista (solo menuType='list')." },
      saveTo: { type: 'string', default: '', desc: 'Variable donde se guarda la opción elegida (vacío = <idNodo>_opcion).' },
    },
    tips: [
      "Para 'botones de WhatsApp' usa menuType='buttons' (máx 3 opciones).",
      'Conecta CADA opción por su handle opt:<id>. Deja "out" para respuestas no reconocidas (reintento o ayuda).',
    ],
  },
  {
    type: 'sendFile',
    label: 'Enviar archivo',
    group: 'Mensajes',
    description: 'Envía un archivo o medio (imagen/pdf/audio) por URL.',
    inputs: ['in'],
    outputs: [OUT, ON_ERROR],
    data: {
      mediaUrl: { type: 'string', required: true, default: '', desc: 'URL del archivo a enviar.' },
      caption: { type: 'string', default: '', desc: 'Texto que acompaña al archivo.' },
    },
    tips: ['Tiene salida de error "onError" por si falla el envío.'],
  },
  {
    type: 'captureInput',
    label: 'Capturar entrada',
    group: 'Lógica',
    description: 'Hace una pregunta al cliente y guarda su respuesta en una variable para usarla después.',
    inputs: ['in'],
    outputs: [OUT],
    data: {
      prompt: { type: 'string', required: true, default: '', desc: 'Pregunta que se envía al cliente.' },
      variable: { type: 'string', required: true, default: '', desc: 'Nombre de la variable donde se guarda la respuesta (p.ej. nombre, fecha).' },
      validate: {
        type: 'options',
        enum: ['none', 'date', 'name', 'email', 'phone'],
        default: 'none',
        desc: "Validación automática con re-pregunta amable: 'date' (fecha/hora natural, rechaza pasado), 'name' (nombre real, anti-bromas), 'email', 'phone'.",
      },
      invalidPrompt: { type: 'string', default: '', desc: 'Mensaje personalizado cuando la validación falla (opcional; hay uno por defecto).' },
    },
    tips: [
      'Espera la respuesta del cliente y la guarda. Úsalo para pedir nombre, fecha, etc.',
      'USA SIEMPRE validate: "name" al pedir el nombre (rechaza bromas/apodos) y validate: "date" al pedir fecha de cita (entiende lenguaje natural: "este 25", "el viernes en la tarde", y rechaza fechas pasadas).',
      'Si pides correo o teléfono, usa validate: "email" / "phone".',
    ],
  },
  {
    type: 'condition',
    label: 'Condición',
    group: 'Lógica',
    description: 'Bifurca el flujo en dos caminos según una comparación.',
    inputs: ['in'],
    outputs: [
      { id: 'true', label: 'Sí', when: 'si la comparación es verdadera' },
      { id: 'false', label: 'No', when: 'si la comparación es falsa' },
    ],
    data: {
      left: { type: 'string', required: true, default: '', desc: 'Lado izquierdo (admite {{variable}}).' },
      op: { type: 'options', enum: ['==', '!=', '>', '<', 'contains', 'empty'], default: '==', desc: "Operador: '==','!=','>','<' comparan; 'contains' = el lado izquierdo contiene el derecho; 'empty' = el lado izquierdo está vacío." },
      right: { type: 'string', required: true, default: '', desc: 'Lado derecho (admite {{variable}}).' },
    },
    tips: ['Conecta SIEMPRE ambos handles "true" y "false".'],
  },
  {
    type: 'delay',
    label: 'Espera',
    group: 'Lógica',
    description: 'Pausa el flujo un tiempo determinado antes de continuar.',
    inputs: ['in'],
    outputs: [OUT],
    data: { ms: { type: 'number', default: 1000, desc: 'Milisegundos de pausa.' } },
    tips: ['Úsalo con moderación para simular escritura natural.'],
  },
  {
    type: 'aiAgent',
    label: 'Agente IA',
    group: 'Integraciones',
    description:
      'Responde con un modelo de IA (LLM). El proveedor/modelo/API key se definen EN ESTE NODO (llmMode="node"). Puede conversar con memoria y salir por intención (p.ej. para agendar).',
    inputs: ['in'],
    outputs: [
      { id: 'out', label: 'Salida', when: 'cuando detecta intención de avanzar (exitKeywords del usuario o exitMarker en la respuesta de la IA)' },
      { id: 'intent:<id>', label: 'Intención', when: 'Genera un handle "intent:<id>" por CADA entrada de data.exitIntents (p.ej. intent:compra, intent:rastreo). La IA clasifica lo que necesita el cliente y el motor enruta por ahí. Preferible a exitKeywords cuando hay más de una gestión posible.' },
      ON_ERROR,
    ],
    data: {
      llmMode: { type: 'options', enum: ['node', 'platform', 'tenant'], default: 'node', desc: "Origen del LLM. 'node' = definido aquí (recomendado); 'platform'/'tenant' usan integración guardada." },
      provider: { type: 'options', enum: ['deepseek', 'openai', 'anthropic', 'google', 'openai_compatible', 'custom', 'lety'], default: 'deepseek', desc: 'Proveedor del LLM (solo si llmMode="node"). \'lety\' no es un LLM: delega el turno en un agente de LETY.AI, y en ese caso \'model\' es el UUID del agente. Ese agente ya trae su propio prompt y sus herramientas, asi que el systemPrompt y las httpTools del nodo se ignoran.' },
      model: { type: 'string', default: 'deepseek-chat', desc: 'Modelo. Ej: deepseek-chat (barato), gpt-4o-mini, gemini-2.5-flash.' },
      apiKey: { type: 'string', default: '', desc: 'API key del proveedor (solo si llmMode="node"). NO la inventes; la pone el admin.' },
      baseUrl: { type: 'string', default: '', desc: 'URL base del API (solo proveedores openai_compatible; vacío = URL oficial del proveedor).' },
      mode: { type: 'options', enum: ['chat', 'single'], default: 'chat', desc: "'chat' conversa con memoria y se queda en el nodo; 'single' una sola respuesta y avanza." },
      systemPrompt: { type: 'string', required: true, default: '', desc: 'Instrucciones/personalidad y reglas de negocio. Aquí defines el dominio del cliente.' },
      saveTo: { type: 'string', default: 'aiReply', desc: 'Variable donde se guarda la respuesta de la IA.' },
      exitKeywords: { type: 'string[]', default: [], desc: 'Palabras del USUARIO que hacen salir por "out" (p.ej. ["agendar","cita"]) para enganchar un sub-flujo determinístico.' },
      exitMarker: { type: 'string', default: '[[AGENDAR]]', desc: 'Marcador que la IA incluye para indicar que hay que avanzar; se retira del texto visible.' },
      httpTools: { type: 'object', default: [], desc: 'Herramientas HTTP que el agente puede invocar por sí mismo (solo con mode="agent"): array de { name, description, method, url, params, required }. Los {param} de la url se sustituyen por los argumentos. Úsalo para que consulte catálogo, stock, precios o envíos en vivo EN LUGAR de escribir esos datos en el systemPrompt: un catálogo dentro del prompt viaja en cada mensaje, hay que reeditarlo cuando cambia un precio y no escala.' },
      exitIntents: { type: 'object', default: [], desc: 'Intenciones de salida: array de { id, when, pattern? }. "pattern" es una regex opcional sobre el mensaje del cliente: si coincide se sale por esa intención SIN llamar al LLM (útil cuando el mensaje es reconocible por su forma, p.ej. un bloque con nombre+cédula+dirección; da el mismo resultado en todas las corridas y ahorra tokens). Cada una genera el handle intent:<id> y debe conectarse. "resolvedBy" (array de nombres de httpTools) descarta la intencion si en ese turno el agente ya la resolvio con esa herramienta: evita que el sub-flujo pida lo que el cliente acaba de dar (p.ej. rastreo con resolvedBy ["consultar_envio_pedido"]). Usalo solo en intenciones de CONSULTA, nunca en compra. La IA elige según lo que el cliente necesita, no por palabras exactas: usa esto en vez de exitKeywords cuando el flujo tiene varias gestiones (compra, rastreo, garantía, mayoreo, asesor).' },
    },
    tips: [
      'En modo "chat" el nodo se queda conversando hasta detectar intención de avanzar; entonces sale por "out".',
      'Para agendar: define exitKeywords (["agendar","cita"]) y/o instruye en el systemPrompt que añada [[AGENDAR]]. Conecta "out" al sub-flujo de agendamiento (captureInput → calendar).',
      'En el systemPrompt incluye SIEMPRE la regla de responder en el idioma del cliente si se quiere multi-idioma.',
      'NO inventes la apiKey: déjala vacía si el admin no la dio; él la asigna en el editor.',
      'CONSULTAR es del agente, GESTIONAR es del flujo: un precio, un stock o un costo de envío se resuelven con httpTools en el mismo nodo; captura de datos y escalado a un humano van en sub-flujos por intent:<id>. Un sub-flujo que solo consulta acaba repreguntando lo que el cliente ya escribió.',
    ],
  },
  {
    type: 'httpRequest',
    label: 'Petición HTTP',
    group: 'Integraciones',
    description: 'Hace una llamada HTTP a una API externa y guarda la respuesta en una variable.',
    inputs: ['in'],
    outputs: [OUT, ON_ERROR],
    data: {
      method: { type: 'options', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], default: 'GET', desc: 'Método HTTP.' },
      url: { type: 'string', required: true, default: '', desc: 'URL del endpoint (admite {{variable}}).' },
      headers: { type: 'object', default: {}, desc: 'Cabeceras como objeto clave/valor.' },
      body: { type: 'string', default: '', desc: 'Cuerpo de la petición (para POST/PUT/PATCH).' },
      saveTo: { type: 'string', default: 'httpResult', desc: 'Variable donde se guarda la respuesta.' },
    },
    tips: ['Tiene salida "onError" para manejar fallos de red/API.'],
  },
  {
    type: 'gmail',
    label: 'Gmail',
    group: 'Integraciones',
    description: 'Acciones sobre Gmail: enviar, listar, leer o modificar correos.',
    inputs: ['in'],
    outputs: [OUT, ON_ERROR],
    data: {
      action: { type: 'options', enum: ['send', 'list', 'get', 'modify'], default: 'send', desc: 'Acción de Gmail a ejecutar.' },
      to: { type: 'string', default: '', desc: 'Destinatario (action=send).' },
      subject: { type: 'string', default: '', desc: 'Asunto (action=send).' },
      body: { type: 'string', default: '', desc: 'Cuerpo del correo (action=send). Admite {{variable}}.' },
      query: { type: 'string', default: '', desc: "Búsqueda Gmail (action=list), p.ej. 'is:unread'." },
      maxResults: { type: 'number', default: 5, desc: 'Máximo de correos a listar (action=list).' },
      id: { type: 'string', default: '', desc: 'Id del correo (action=get/modify). Admite {{variable}}.' },
      gmailSource: { type: 'options', enum: ['tenant', 'platform'], default: 'tenant', desc: 'Cuenta Gmail a usar: de la empresa (tenant) o de la plataforma.' },
      saveTo: { type: 'string', default: 'gmailResult', desc: 'Variable donde se guarda el resultado (list/get).' },
    },
    tips: ['Requiere que la empresa tenga Gmail conectado por OAuth. Tiene salida "onError".'],
  },
  {
    type: 'calendar',
    label: 'Calendario',
    group: 'Integraciones',
    description: 'Acciones sobre Google Calendar: crear o listar eventos/citas. Núcleo del agendamiento.',
    inputs: ['in'],
    outputs: [OUT, ON_ERROR],
    data: {
      action: { type: 'options', enum: ['createEvent', 'listEvents'], default: 'createEvent', desc: 'Acción a ejecutar.' },
      calendarSource: { type: 'options', enum: ['tenant', 'platform', 'platformOauth'], default: 'tenant', desc: "Origen del calendario: 'tenant' (empresa), 'platform' (Service Account de la plataforma), 'platformOauth' (cuenta OAuth de la plataforma, permite invitar)." },
      calendarId: { type: 'string', default: '', desc: 'ID del calendario (vacío = principal).' },
      summary: { type: 'string', default: '', desc: 'Título del evento (admite {{variable}}).' },
      description: { type: 'string', default: '', desc: 'Descripción del evento.' },
      start: { type: 'string', default: '', desc: 'Inicio (variable con la fecha capturada, p.ej. {{fecha}}).' },
      durationMin: { type: 'number', default: 60, desc: 'Duración en minutos.' },
      attendees: { type: 'string', default: '', desc: 'Correos de invitados separados por coma (requiere OAuth para invitar).' },
      timezone: { type: 'string', default: 'America/Bogota', desc: 'Zona horaria.' },
      saveTo: { type: 'string', default: 'cita', desc: 'Variable donde se guarda el evento creado.' },
    },
    tips: [
      'Para agendar: antes captura la fecha con captureInput y pásala en "start" como {{fecha}}.',
      'Para INVITAR al cliente usa calendarSource="platformOauth" + attendees.',
      'Tiene salida "onError" por si falla la creación.',
    ],
  },
  {
    type: 'reminder',
    label: 'Recordatorio',
    group: 'Integraciones',
    description:
      'Agenda un recordatorio de la cita para el CLIENTE FINAL. NO envía nada al momento: cuando llega su hora (cita − "minutos antes"), un agente IA revisa la conversación y DECIDE si enviarlo (según cómo hayan quedado) y redacta el mensaje. Funciona con o sin Calendar conectado.',
    inputs: ['in'],
    outputs: [OUT, ON_ERROR],
    data: {
      appointment: { type: 'string', default: '', desc: 'Fecha/hora de la cita: usa la variable capturada, p.ej. {{fecha}}.' },
      to: { type: 'string', default: '{{contacto}}', desc: 'Teléfono del cliente a recordar. Por defecto el contacto actual ({{contacto}}).' },
      leadMinutes: { type: 'number', default: 120, desc: 'Minutos ANTES de la cita en que se evalúa/envía el recordatorio (p.ej. 120 = 2 horas antes).' },
      timezone: { type: 'string', default: 'America/Bogota', desc: 'Zona horaria del negocio (para calcular la hora real de la cita).' },
      instructions: { type: 'string', default: '', desc: 'Guía para el agente al decidir/redactar (p.ej. "Confirma la cita del día; si el cliente canceló o pidió reprogramar, NO envíes").' },
      llmMode: { type: 'options', enum: ['node', 'platform', 'tenant'], default: 'node', desc: "Origen del LLM que decide/redacta. 'node' = definido aquí." },
      provider: { type: 'options', enum: ['deepseek', 'openai', 'anthropic', 'google', 'openai_compatible', 'custom', 'lety'], default: 'deepseek', desc: 'Proveedor del LLM (solo llmMode="node").' },
      model: { type: 'string', default: 'deepseek-chat', desc: 'Modelo. Ej: deepseek-chat (barato).' },
      apiKey: { type: 'string', default: '', desc: 'API key del proveedor (solo llmMode="node"). NO la inventes; la pone el admin.' },
      baseUrl: { type: 'string', default: '', desc: 'URL base del API (solo proveedores openai_compatible; vacío = URL oficial del proveedor).' },
    },
    tips: [
      'Colócalo DESPUÉS de confirmar la cita (tras captureInput con validate:"date" y/o el nodo calendar).',
      'Pasa la MISMA fecha capturada en "appointment" (p.ej. {{fecha}}) y usa la misma zona horaria del negocio.',
      'El envío NO es a ciegas: al llegar la hora, la IA relee la conversación y decide si mandarlo. Deja las horas/días de atención en el systemPrompt del Agente IA.',
      'Reutiliza el mismo provider/model/apiKey que tu nodo Agente IA para mantener el tono.',
    ],
  },
  {
    type: 'receiveFile',
    label: 'Recibir archivo',
    group: 'Archivos',
    description: 'Espera a que el cliente envíe un archivo y lo guarda en una variable.',
    inputs: ['in'],
    outputs: [OUT],
    data: { saveTo: { type: 'string', default: 'file', desc: 'Variable donde se guarda el archivo recibido.' } },
    tips: ['Úsalo antes de transcribeAudio/ocrImage si necesitas el medio del cliente.'],
  },
  {
    type: 'transcribeAudio',
    label: 'Audio a texto',
    group: 'Archivos',
    description: 'Transcribe el audio entrante a texto. 100% offline (Whisper multilingüe), sin IA/API externa.',
    inputs: ['in'],
    outputs: [OUT, ON_ERROR],
    data: { saveTo: { type: 'string', default: 'transcripcion', desc: 'Variable donde se guarda el texto transcrito.' } },
    tips: ['Detecta el idioma automáticamente. No consume tokens de LLM.'],
  },
  {
    type: 'ocrImage',
    label: 'Imagen a texto (OCR)',
    group: 'Archivos',
    description: 'Extrae el texto de una imagen entrante. 100% offline (tesseract.js), sin IA/API externa.',
    inputs: ['in'],
    outputs: [OUT, ON_ERROR],
    data: {
      saveTo: { type: 'string', default: 'textoImagen', desc: 'Variable donde se guarda el texto extraído.' },
      lang: { type: 'string', default: 'spa+eng', desc: 'Idiomas OCR (códigos tesseract, p.ej. spa+eng).' },
    },
    tips: ['Útil para leer documentos, recibos o comprobantes que envía el cliente.'],
  },
  {
    type: 'translateText',
    label: 'Traducir texto',
    group: 'Lógica',
    description: 'Traduce un texto a otro idioma. 100% offline (detecta idioma origen), sin IA/API externa. Ahorra tokens en planes económicos.',
    inputs: ['in'],
    outputs: [OUT, ON_ERROR],
    data: {
      fromVar: { type: 'string', required: true, default: '', desc: 'Variable con el texto a traducir (p.ej. {{mensaje}}).' },
      targetLang: { type: 'string', default: 'es', desc: 'Idioma destino (código ISO, p.ej. es, en, fr).' },
      sourceLang: { type: 'string', default: 'auto', desc: "Idioma origen ('auto' detecta)." },
      saveTo: { type: 'string', default: 'traduccion', desc: 'Variable donde se guarda la traducción.' },
    },
    tips: ['Permite atender varios idiomas sin gastar LLM en planes baratos.'],
  },
  {
    type: 'handover',
    label: 'Transferir a humano',
    group: 'Fin',
    description:
      'Entrega la conversación a un agente humano. El bot avisa al cliente, queda EN SILENCIO para ese contacto (hasta que venza la ventana de reanudación) y registra la transferencia.',
    inputs: ['in'],
    outputs: [],
    data: {
      message: {
        type: 'string',
        default: '',
        desc: 'Mensaje amable QUE VE EL CLIENTE al transferir (si lo omites hay uno por defecto). Admite {{variable}}.',
      },
      note: {
        type: 'string',
        default: '',
        desc: 'Nota INTERNA para el equipo humano (NUNCA se envía al cliente; queda en el registro de eventos).',
      },
    },
    tips: [
      'No tiene salida: termina el tramo automatizado y el bot deja de responder a ese contacto.',
      'Usa "message" para lo que ve el cliente y "note" para el contexto interno (p.ej. "quiere cotizar un combo").',
    ],
  },
  {
    type: 'end',
    label: 'Fin',
    group: 'Fin',
    description: 'Finaliza la conversación.',
    inputs: ['in'],
    outputs: [],
    data: {},
    tips: ['No tiene salida. Marca el cierre de un camino.'],
  },
];

/** Tipos válidos (para validación de args de las tools). */
export const VALID_NODE_TYPES: NodeType[] = NODE_CATALOG.map((n) => n.type);

/** Mapa rápido type -> spec. */
export const CATALOG_BY_TYPE: Record<string, NodeSpec> = NODE_CATALOG.reduce(
  (acc, n) => {
    acc[n.type] = n;
    return acc;
  },
  {} as Record<string, NodeSpec>,
);

/** Defaults de data por tipo (fusionados con lo que pida el agente). */
export function defaultData(type: NodeType): Record<string, any> {
  const spec = CATALOG_BY_TYPE[type];
  if (!spec) return {};
  const out: Record<string, any> = {};
  for (const [field, fs] of Object.entries(spec.data)) {
    if (fs.default !== undefined) out[field] = Array.isArray(fs.default) ? [...fs.default] : fs.default;
  }
  return out;
}

/**
 * Calcula los handles de salida REALES de un nodo (incluyendo opt:<id>
 * dinámicos de interactiveMenu). Espejo de frontend/src/flow/handles.js.
 */
export function outHandleIds(type: NodeType, data: Record<string, any> = {}): string[] {
  if (type === 'end' || type === 'handover') return [];
  if (type === 'condition') return ['true', 'false'];
  if (type === 'interactiveMenu') {
    const opts = Array.isArray(data.options) ? data.options : [];
    return [...opts.map((o: any) => `opt:${o.id}`), 'out'];
  }
  const spec = CATALOG_BY_TYPE[type];
  return (spec?.outputs || []).map((o) => o.id);
}

/** Resumen compacto del catálogo (para el system prompt, sin quemar tokens). */
export function catalogSummary(): string {
  return NODE_CATALOG.map((n) => {
    const outs = n.dynamicOut ? `${n.outputs.map((o) => o.id).join(',')}+opt:<id>` : n.outputs.map((o) => o.id).join(',') || '—';
    return `- ${n.type} (${n.label}): ${n.description.split('.')[0]}. salidas: [${outs}]`;
  }).join('\n');
}
