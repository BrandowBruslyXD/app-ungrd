/**
 * Tipos compartidos del motor de ejecución de flujos.
 * Fuente de verdad para engine, whatsapp e integrations. Ver CONTRACTS.md §2–§5.
 */

export type NodeType =
  | 'trigger'
  | 'sendText'
  | 'interactiveMenu'
  | 'captureInput'
  | 'condition'
  | 'aiAgent'
  | 'httpRequest'
  | 'gmail'
  | 'calendar'
  | 'sendFile'
  | 'receiveFile'
  | 'transcribeAudio'
  | 'ocrImage'
  | 'translateText'
  | 'delay'
  | 'handover'
  | 'reminder'
  | 'end';

export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: Record<string, any>;
  style?: { width?: number; height?: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface IncomingMessage {
  from: string;
  text?: string;
  type: string;
  /** URL del adjunto (si lo hay). Para Twilio requiere auth Basic; para Evolution apikey. */
  mediaUrl?: string;
  /** Familia del adjunto, para que los nodos sepan qué procesar. */
  mediaType?: 'audio' | 'image' | 'video' | 'document';
  /** MIME del adjunto, ej. 'audio/ogg; codecs=opus', 'image/jpeg'. */
  mediaMimeType?: string;
  /**
   * Adjunto embebido en base64 (Evolution a veces lo entrega así en
   * data.message.*.jpegThumbnail o base64), evita una segunda descarga.
   */
  mediaBase64?: string;
  /**
   * Id del mensaje en el canal. Lo usa el motor para vincular a la conversación el
   * MessageLog que el webhook ya había registrado: en un contacto nuevo la
   * conversación aún no existe cuando llega el mensaje, así que el PRIMER mensaje
   * quedaba huérfano y el visor mostraba la conversación empezando por la respuesta
   * del bot, sin la pregunta que la abrió.
   */
  externalId?: string;
  raw: any;
}

export interface OutgoingMessage {
  type: 'text' | 'media' | 'interactive';
  text?: string;
  mediaUrl?: string;
  caption?: string;
  options?: { id: string; label: string; description?: string }[];
  // Cómo renderizar un menú interactivo: 'text' (numerado, default), 'buttons'
  // (botones de respuesta rápida ≤3) o 'list' (lista desplegable ≤10).
  menuType?: 'text' | 'buttons' | 'list';
  // Texto del botón que abre la lista (solo menuType 'list').
  listButtonText?: string;
  // Vía del LLM que generó este mensaje (solo para la vista previa/chat en vivo;
  // el envío real por WhatsApp lo ignora): 'web' = sesión DeepSeek, 'fallback' =
  // API key de respaldo tras fallar el web, 'api' = proveedor de API normal.
  via?: 'web' | 'fallback' | 'api';
}

/** Servicios que el motor expone a los ejecutores de nodo. */
export interface EngineServices {
  sendMessage(tenantId: string, to: string, msg: OutgoingMessage): Promise<void>;
  callIntegration(integrationId: string, payload: any): Promise<any>;
}

export interface ExecutionContext {
  tenantId: string;
  conversationId: string;
  /** Flujo en ejecución (para métricas/trazabilidad por flujo). */
  flowId?: string;
  contactPhone: string;
  variables: Record<string, any>;
  incoming?: IncomingMessage;
  /** true cuando el motor reanuda en un nodo que estaba esperando respuesta del usuario. */
  resuming?: boolean;
  /** true en modo ENSAYO (editor/preview): los nodos con efecto de red no se ejecutan de verdad. */
  dryRun?: boolean;
  /**
   * Caché TRANSITORIO del texto derivado del adjunto (transcripción/OCR) para
   * este turno. Evita re-transcribir el mismo audio si varios nodos aiAgent lo
   * procesan. No se persiste (vive solo mientras dura el procesamiento).
   */
  mediaText?: string;
  services: EngineServices;
}

export interface NodeResult {
  nextHandle?: string;
  waitForInput?: boolean;
  setVariables?: Record<string, any>;
  outgoing?: OutgoingMessage[];
  end?: boolean;
}

export interface NodeExecutor {
  type: NodeType;
  execute(node: FlowNode, ctx: ExecutionContext): Promise<NodeResult>;
}
