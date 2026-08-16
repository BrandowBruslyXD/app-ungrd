/**
 * CATÁLOGO DE PLANTILLAS POR RUBRO (estilo Dapta).
 *
 * Cada plantilla NO es un grafo rígido: es una "semilla" (instrucción rica) que
 * el agente constructor convierte en un flujo completo y adaptado. Así son
 * mantenibles, siempre válidas (las arma el agente verificado) y personalizables
 * por cliente. El admin elige un rubro → se envía su `seed` a /flow-agent/build.
 */

export interface RubroTemplate {
  id: string;
  emoji: string;
  name: string;
  /** Descripción corta para el UI. */
  summary: string;
  /** Indica si requiere LLM (afecta costo/plan). */
  usesAI: boolean;
  /** Instrucción que se envía al agente para construir el flujo. */
  seed: string;
}

export const RUBRO_TEMPLATES: RubroTemplate[] = [
  {
    id: 'barberia',
    emoji: '💈',
    name: 'Barbería / Peluquería',
    summary: 'Menú de servicios, precios y agendamiento de turno.',
    usesAI: false,
    seed: 'Crea un bot interactivo (sin IA) para una barbería. Saluda con calidez, muestra un menú con botones: "Ver servicios y precios", "Agendar turno", "Ubicación y horario", "Hablar con alguien". "Ver servicios" muestra los servicios (corte, barba, combo, tinte) con precios y vuelve al menú. "Agendar turno" pide el nombre, el servicio deseado y la fecha/hora, crea la cita en el calendario y confirma. "Ubicación y horario" envía dirección y horario y vuelve al menú. "Hablar con alguien" transfiere a un humano.',
  },
  {
    id: 'clinica',
    emoji: '🦷',
    name: 'Clínica / Consultorio',
    summary: 'Asistente con IA que resuelve dudas y agenda citas.',
    usesAI: true,
    seed: 'Crea un bot con IA para una clínica/consultorio. Un agente IA en modo chat atiende dudas sobre servicios, precios y horarios con tono profesional y cálido, y responde en el idioma del paciente. En el systemPrompt del agente deja indicado el horario y los días de atención del consultorio, y que rechace cordialmente horas/días fuera de servicio proponiendo alternativas. Cuando el paciente quiera agendar (palabras como agendar, cita, reservar), pasa a un sub-flujo que captura nombre, motivo de consulta y fecha/hora, crea la cita en el calendario e invita al paciente por correo si es posible. Tras confirmar la cita, agrega un nodo de recordatorio que avise al paciente unas 2 horas antes (reutilizando el mismo LLM del agente); el recordatorio releerá la conversación y decidirá si enviarlo. Si falla el calendario, muestra un mensaje amable (el recordatorio funciona igual). Deja la API key del nodo de IA vacía para que el admin la asigne.',
  },
  {
    id: 'restaurante',
    emoji: '🍽️',
    name: 'Restaurante',
    summary: 'Carta, reservas de mesa y pedidos.',
    usesAI: false,
    seed: 'Crea un bot interactivo (sin IA) para un restaurante. Saluda y muestra un menú con botones: "Ver carta", "Reservar mesa", "Hacer pedido", "Hablar con alguien". "Ver carta" envía la carta (archivo) y vuelve al menú. "Reservar mesa" pide nombre, número de personas y fecha/hora, crea la reserva en el calendario y confirma. "Hacer pedido" pide el nombre, el platillo deseado y la dirección de entrega, y confirma el pedido. "Hablar con alguien" transfiere a un humano.',
  },
  {
    id: 'soporte',
    emoji: '🛟',
    name: 'Soporte / Atención al cliente',
    summary: 'Menú de FAQ con escalado a humano.',
    usesAI: false,
    seed: 'Crea un bot interactivo (sin IA) de soporte/atención al cliente. Saluda y muestra un menú con las preguntas frecuentes más comunes (estado de mi pedido, horarios, métodos de pago, devoluciones) y una opción de "Hablar con un agente". Cada opción de FAQ responde con información clara y ofrece volver al menú. "Hablar con un agente" captura el motivo de la consulta y transfiere a un humano.',
  },
  {
    id: 'ventas',
    emoji: '🛒',
    name: 'Ventas / Catálogo',
    summary: 'Presenta productos, captura el lead y agenda demo.',
    usesAI: true,
    seed: 'Crea un bot de ventas con IA. Un agente IA en modo chat presenta los productos/servicios, responde objeciones y dudas en el idioma del cliente con tono comercial y cercano. En el systemPrompt deja indicado el horario y los días de atención para agendar demos. Cuando el cliente muestre interés en comprar o quiera una demo/cotización (palabras como comprar, cotizar, demo, precio), pasa a un sub-flujo que captura nombre, empresa, correo y necesidad, y agenda una demo en el calendario invitando al cliente por correo. Tras confirmar la demo, agrega un nodo de recordatorio que avise al cliente unas 2 horas antes (reutilizando el mismo LLM del agente); el recordatorio releerá la conversación y decidirá si enviarlo. Deja la API key del nodo de IA vacía para que el admin la asigne.',
  },
  {
    id: 'inmobiliaria',
    emoji: '🏠',
    name: 'Inmobiliaria',
    summary: 'Filtra interés y agenda visitas a inmuebles.',
    usesAI: false,
    seed: 'Crea un bot interactivo (sin IA) para una inmobiliaria. Saluda y muestra un menú con botones: "Comprar", "Arrendar", "Vender mi inmueble", "Hablar con un asesor". "Comprar" y "Arrendar" capturan la zona de interés, el presupuesto y el tipo de inmueble, y luego ofrecen agendar una visita capturando fecha/hora y creándola en el calendario. "Vender mi inmueble" captura los datos del inmueble y del propietario y transfiere a un asesor. "Hablar con un asesor" transfiere a un humano.',
  },
];
