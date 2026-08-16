// Catálogo declarativo de nodos disponibles en el editor.
// Cada entrada define el tipo, etiqueta en español, categoría visual,
// una descripción breve y los `data` por defecto que espera el motor.

export const PALETTE = [
  // --- Disparador ---
  {
    type: 'trigger',
    label: 'Disparador',
    group: 'Disparador',
    description: 'Punto de entrada del flujo. Se activa con un mensaje del cliente.',
    defaults: { match: 'any', keywords: [] },
  },

  // --- Mensajes ---
  {
    type: 'sendText',
    label: 'Enviar texto',
    group: 'Mensajes',
    description: 'Envía un mensaje de texto. Soporta {{variables}}.',
    defaults: { text: '' },
  },
  {
    type: 'interactiveMenu',
    label: 'Menú interactivo',
    group: 'Mensajes',
    description: 'Muestra un menú con opciones seleccionables.',
    defaults: {
      header: '',
      body: '',
      menuType: 'text',
      options: [{ id: '1', label: '' }],
    },
  },
  {
    type: 'sendFile',
    label: 'Enviar archivo',
    group: 'Mensajes',
    description: 'Envía un archivo o medio por URL/referencia.',
    defaults: { mediaUrl: '', caption: '' },
  },

  // --- Lógica ---
  {
    type: 'captureInput',
    label: 'Capturar entrada',
    group: 'Lógica',
    description: 'Pregunta al usuario y guarda su respuesta en una variable.',
    defaults: { variable: '', prompt: '', validate: 'none', invalidPrompt: '' },
  },
  {
    type: 'condition',
    label: 'Condición',
    group: 'Lógica',
    description: 'Bifurca el flujo según una comparación.',
    defaults: { left: '', op: '==', right: '' },
  },
  {
    type: 'delay',
    label: 'Espera',
    group: 'Lógica',
    description: 'Pausa el flujo durante un tiempo determinado.',
    defaults: { ms: 1000 },
  },
  {
    type: 'translateText',
    label: 'Traducir texto',
    group: 'Lógica',
    description: 'Traduce un texto a otro idioma (offline, detecta el idioma origen). Sin IA/API externa.',
    defaults: { fromVar: '', targetLang: 'es', sourceLang: 'auto', saveTo: 'traduccion' },
  },

  // --- Integraciones ---
  {
    type: 'aiAgent',
    label: 'Agente IA',
    group: 'Integraciones',
    description: 'Genera una respuesta con un modelo de IA (LLM definible en el nodo).',
    // llmMode 'node' = el LLM (proveedor/modelo/API key) se define en este nodo.
    // mode: 'chat' conversacional con memoria; 'single' una sola respuesta.
    defaults: { llmMode: 'node', provider: 'deepseek', model: 'deepseek-chat', apiKey: '', baseUrl: '', mode: 'chat', systemPrompt: '', saveTo: 'aiReply', exitKeywords: [], exitMarker: '[[AGENDAR]]' },
  },
  {
    type: 'httpRequest',
    label: 'Petición HTTP',
    group: 'Integraciones',
    description: 'Realiza una llamada HTTP y guarda la respuesta.',
    defaults: { method: 'GET', url: '', headers: {}, body: '', saveTo: 'httpResult' },
  },
  {
    type: 'gmail',
    label: 'Gmail',
    group: 'Integraciones',
    description: 'Acciones sobre Gmail (enviar, leer...).',
    defaults: { action: 'send' },
  },
  {
    type: 'calendar',
    label: 'Calendario',
    group: 'Integraciones',
    description: 'Acciones sobre Google Calendar (crear, listar...).',
    defaults: {
      action: 'createEvent',
      // Modelo A = calendario de la empresa; Modelo B = cuenta de plataforma + invitar.
      calendarSource: 'tenant',
      attendees: '',
      calendarId: '',
      summary: '',
      description: '',
      start: '',
      durationMin: 60,
      timezone: 'America/Bogota',
      saveTo: 'cita',
    },
  },
  {
    type: 'reminder',
    label: 'Recordatorio',
    group: 'Integraciones',
    description: 'Evalúa con IA y envía un recordatorio antes de la cita.',
    // llmMode 'node' = el LLM (proveedor/modelo/API key) se define en este nodo.
    defaults: {
      appointment: '',
      to: '{{contacto}}',
      leadMinutes: 120,
      timezone: 'America/Bogota',
      instructions: '',
      llmMode: 'node',
      provider: 'deepseek',
      model: 'deepseek-chat',
      apiKey: '',
      baseUrl: '',
    },
  },

  // --- Archivos ---
  {
    type: 'receiveFile',
    label: 'Recibir archivo',
    group: 'Archivos',
    description: 'Espera un archivo del usuario y lo guarda en una variable.',
    defaults: { saveTo: 'file' },
  },
  {
    type: 'transcribeAudio',
    label: 'Audio a texto',
    group: 'Archivos',
    description: 'Transcribe el audio entrante a texto (offline, Whisper multilingüe con auto-idioma).',
    defaults: { saveTo: 'transcripcion' },
  },
  {
    type: 'ocrImage',
    label: 'Imagen a texto (OCR)',
    group: 'Archivos',
    description: 'Extrae el texto de la imagen entrante (offline, tesseract.js).',
    defaults: { saveTo: 'textoImagen', lang: 'spa+eng' },
  },

  // --- Fin ---
  {
    type: 'handover',
    label: 'Transferir a humano',
    group: 'Fin',
    description: 'Entrega la conversación a un agente humano.',
    defaults: { note: '', message: '' },
  },
  {
    type: 'end',
    label: 'Fin',
    group: 'Fin',
    description: 'Finaliza la conversación.',
    defaults: {},
  },
];

// Orden de las categorías en la paleta.
export const GROUPS = ['Disparador', 'Mensajes', 'Lógica', 'Integraciones', 'Archivos', 'Fin'];

// Metadatos visuales por categoría (emoji + color de borde por nodo).
export const GROUP_META = {
  Disparador: { emoji: '⚡', color: '#f59e0b' },
  Mensajes: { emoji: '💬', color: '#25d366' },
  Lógica: { emoji: '🔀', color: '#6366f1' },
  Integraciones: { emoji: '🔌', color: '#0ea5e9' },
  Archivos: { emoji: '📎', color: '#a855f7' },
  Fin: { emoji: '🏁', color: '#ef4444' },
};

// Mapa rápido type -> definición de la paleta.
export const PALETTE_BY_TYPE = PALETTE.reduce((acc, item) => {
  acc[item.type] = item;
  return acc;
}, {});

// Devuelve la definición de un tipo (o undefined).
export function getPaletteItem(type) {
  return PALETTE_BY_TYPE[type];
}
