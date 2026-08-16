// Datos estáticos de la landing: secciones, conectores, confianza y contacto.
import {
  IconBell,
  IconBolt,
  IconCal,
  IconChart,
  IconChat,
  IconChip,
  IconFlow,
  IconLayers,
  IconLock,
  IconMail,
  IconShield,
  IconSpark,
  IconWhatsapp,
} from '../icons';

export const TINT = {
  emerald: 'bg-emerald-100 text-emerald-600', indigo: 'bg-indigo-100 text-indigo-600',
  teal: 'bg-teal-100 text-teal-600', violet: 'bg-violet-100 text-violet-600',
  sky: 'bg-sky-100 text-sky-600', amber: 'bg-amber-100 text-amber-600',
};

export const FEATURES = [
  { icon: IconBolt, tint: 'emerald', title: 'IA conversacional', desc: 'Respuestas naturales con reconocimiento de intención. Nunca revela que es un sistema automatizado.' },
  { icon: IconFlow, tint: 'indigo', title: 'Editor visual de flujos', desc: 'Diseñe rutas conversacionales arrastrando nodos, sin escribir una sola línea de código.' },
  { icon: IconCal, tint: 'teal', title: 'Agenda automática', desc: 'Programación y confirmación de citas integradas con el calendario de cada empresa.' },
  { icon: IconBell, tint: 'amber', title: 'Recordatorios inteligentes', desc: 'Antes de cada cita, el asistente relee la conversación y decide si escribirle al cliente para recordarle. Menos ausencias, más confianza.' },
  { icon: IconLayers, tint: 'violet', title: 'Arquitectura multi-empresa', desc: 'Cada cliente opera de forma independiente, con sus datos completamente aislados.' },
  { icon: IconShield, tint: 'sky', title: 'Seguridad empresarial', desc: 'Cifrado de credenciales en reposo y sesión única por dispositivo.' },
  { icon: IconChart, tint: 'amber', title: 'Métricas de consumo', desc: 'Medición del uso de inteligencia artificial y actividad por cliente, en tiempo real.' },
];

// Flujo real de una conversación (para la demo interactiva "Así trabaja").
export const FLOW = [
  {
    icon: IconChat,
    title: 'Llega el mensaje',
    desc: 'El cliente escribe por WhatsApp. El bot recibe, detecta el idioma y la intención.',
    add: [{ from: 'user', text: 'Hola, quiero agendar una cita' }],
  },
  {
    icon: IconSpark,
    title: 'La IA responde',
    desc: 'Contesta con lenguaje natural y profesional —sin sonar a robot— y guía la conversación.',
    add: [{ from: 'bot', text: 'Buenas, con gusto le ayudo a agendar. ¿Me confirma su nombre completo?' }],
  },
  {
    icon: IconChip,
    title: 'Captura y valida datos',
    desc: 'Pide nombre, fecha y hora; entiende “mañana 3pm” y rechaza bromas o fechas pasadas.',
    add: [
      { from: 'user', text: 'Carlos Pérez' },
      { from: 'bot', text: 'Gracias, Carlos. ¿Qué día y hora le viene bien?' },
      { from: 'user', text: 'mañana a las 3 de la tarde' },
    ],
  },
  {
    icon: IconCal,
    title: 'Agenda y confirma',
    desc: 'Crea la cita en el calendario de la empresa, invita al cliente y confirma.',
    add: [{ from: 'bot', text: 'Listo, Carlos. Su cita quedó para mañana 3:00 p. m. Nos vemos.' }],
  },
  {
    icon: IconBell,
    title: 'Recuerda a tiempo (solo si conviene)',
    desc: 'Horas antes, el asistente relee la conversación y decide si recordarle al cliente. Si el cliente hubiera cancelado, no lo molesta. Funciona con o sin calendario.',
    add: [{ from: 'bot', text: 'Hola Carlos, le recuerdo su cita de hoy a las 3:00 p. m. Aquí lo esperamos.' }],
  },
];

export const CASES = [
  { icon: IconCal, tint: 'teal', title: 'Salud y clínicas', desc: 'Agendamiento de citas, recordatorios y resolución de consultas frecuentes.' },
  { icon: IconChart, tint: 'emerald', title: 'Comercio y ventas', desc: 'Catálogo, cotizaciones y seguimiento de pedidos de forma automática.' },
  { icon: IconChat, tint: 'sky', title: 'Servicios y reservas', desc: 'Reservas, confirmaciones y atención de primera línea sin esperas.' },
  { icon: IconShield, tint: 'violet', title: 'Soporte y postventa', desc: 'Respuestas inmediatas, derivación inteligente y registro de cada conversación.' },
];

/* Conectores/integraciones disponibles (para el carrusel). */
export const CONNECTORS = [
  { icon: IconWhatsapp, tint: 'emerald', name: 'WhatsApp · Evolution', desc: 'Conexión por QR, sin cuenta de proveedor.' },
  { icon: IconWhatsapp, tint: 'sky', name: 'WhatsApp Cloud API · Meta', desc: 'Número oficial vía Meta Business.' },
  { icon: IconChat, tint: 'violet', name: 'Twilio', desc: 'WhatsApp Business a través de Twilio.' },
  { icon: IconMail, tint: 'amber', name: 'Gmail', desc: 'Envío de correos con la cuenta de cada empresa.' },
  { icon: IconCal, tint: 'teal', name: 'Google Calendar', desc: 'Agenda e invitaciones automáticas.' },
  { icon: IconChip, tint: 'indigo', name: 'IA / LLM', desc: 'DeepSeek, OpenAI, Gemini y compatibles.' },
  { icon: IconSpark, tint: 'emerald', name: 'Transcripción de audio', desc: 'Notas de voz a texto, 100% offline.' },
  { icon: IconLayers, tint: 'sky', name: 'OCR de imágenes', desc: 'Lee texto de fotos, recibos y documentos.' },
];

/* Banda de confianza / seguridad. */
export const TRUST = [
  { icon: IconShield, t: 'Cifrado de grado bancario', d: 'Credenciales protegidas en reposo con estándares de la industria.' },
  { icon: IconLock, t: 'Sesión única', d: 'Un dispositivo activo + cierre por inactividad.' },
  { icon: IconLayers, t: 'Datos aislados', d: 'Cada empresa, su propio carril privado.' },
  { icon: IconChip, t: 'Anti-abuso', d: 'Rate-limit, anti-SSRF y validación de webhooks.' },
];

/* Contacto por WhatsApp del botón flotante: redirige (pestaña nueva) al
   WhatsApp de la dueña del negocio con un mensaje ya preparado.
   wa.me abre la app de escritorio si existe, o WhatsApp Web/móvil según equipo. */
export const WA_NUMBER = '573232279940'; // Solo dígitos + indicativo
export const WA_MESSAGE =
  'Hola, vengo desde la página de WA Bots y me interesan sus agentes automatizados de WhatsApp para mi negocio. ¿Me cuentan cómo funciona?';
