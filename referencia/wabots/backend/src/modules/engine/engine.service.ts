import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
  EngineServices,
  ExecutionContext,
  FlowEdge,
  FlowGraph,
  FlowNode,
  IncomingMessage,
  NodeResult,
  OutgoingMessage,
} from '../../common/types/engine.types';
import { ConversationsService } from '../conversations/conversations.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { NodeRegistry } from './node-registry.service';
import { ConversationSetupService } from './services/conversation-setup.service';
import {
  detectCancelIntent,
  detectGlobalCommand,
  GENERIC_ERROR_TEXT,
  GOODBYE_TEXT,
  navBack,
  navPush,
} from './services/global-commands';

/** Guard anti-bucle: máximo de saltos entre nodos por mensaje. */
const MAX_HOPS = 50;

/**
 * Motor de ejecución de flujos. Implementa EngineServices (puente hacia
 * whatsapp e integraciones) y orquesta el recorrido del grafo por conversación.
 */
@Injectable()
export class EngineService implements EngineServices {
  private readonly logger = new Logger(EngineService.name);

  /**
   * Mutex en memoria por clave `${tenantId}:${from}`: encadena promesas para
   * que dos mensajes del MISMO contacto no se pisen. Contactos/tenants
   * distintos corren en paralelo sin bloquearse.
   */
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly whatsapp: WhatsappService,
    private readonly integrations: IntegrationsService,
    private readonly conversations: ConversationsService,
    private readonly conversationSetup: ConversationSetupService,
    private readonly prisma: PrismaService,
    private readonly registry: NodeRegistry,
  ) {}

  // ── EngineServices ──────────────────────────────────────────────

  /** Despacha un mensaje saliente por WhatsApp. */
  async sendMessage(tenantId: string, to: string, msg: OutgoingMessage): Promise<void> {
    await this.whatsapp.sendMessage(tenantId, to, msg);
  }

  /** Invoca una integración externa (IA, gmail, calendar, http...). */
  async callIntegration(integrationId: string, payload: any): Promise<any> {
    return this.integrations.runForEngine(integrationId, payload);
  }

  // ── Simulador (pruebas locales sin Evolution ni BD) ─────────────

  /**
   * Ejecuta un flujo en seco: recorre el grafo con un emisor en memoria que
   * recolecta los mensajes salientes en vez de mandarlos por WhatsApp.
   * Ideal para probar bots localmente sin Evolution conectado.
   *
   * `state` permite reanudar una conversación simulada (variables + nodo actual),
   * tal como lo haría el motor real entre mensajes.
   */
  async simulate(
    graph: FlowGraph,
    incomingText: string,
    state?: { variables?: Record<string, any>; currentNodeId?: string | null },
    opts?: {
      dryRun?: boolean;
      tenantId?: string;
      /** Adjunto de prueba (nota de voz/imagen) en base64, para probar transcripción/OCR. */
      media?: { base64: string; mimeType: string; kind: 'audio' | 'image' };
    },
  ): Promise<{
    outgoing: OutgoingMessage[];
    variables: Record<string, any>;
    currentNodeId: string | null;
    waiting: boolean;
    ended: boolean;
    trace: string[];
  }> {
    const outgoing: OutgoingMessage[] = [];
    // Modo ensayo: las integraciones con EFECTO SECUNDARIO (crear cita, enviar
    // correo, HTTP que escribe) se SIMULAN — no se ejecutan de verdad — para que
    // probar el flujo no genere citas ni correos reales. La IA y las lecturas
    // (calendar listEvents, HTTP GET) sí se ejecutan, para una vista fiel.
    const dryRun = opts?.dryRun ?? false;

    // Servicios falsos: el envío solo acumula; las integraciones son reales,
    // salvo las de efecto secundario cuando dryRun está activo.
    const fakeServices: EngineServices = {
      sendMessage: async (_t, _to, msg) => {
        outgoing.push(msg);
      },
      callIntegration: (integrationId, payload) => {
        if (dryRun && this.hasSideEffect(payload)) {
          return Promise.resolve(this.mockIntegration(payload));
        }
        return this.callIntegration(integrationId, payload);
      },
    };

    // Mensaje simulado: texto plano o adjunto (audio/imagen) embebido en base64,
    // para probar transcripción y OCR desde el editor igual que en producción.
    const media = opts?.media;
    const message: IncomingMessage = media
      ? {
          from: 'sim',
          text: incomingText,
          type: 'media',
          mediaType: media.kind,
          mediaMimeType: media.mimeType,
          mediaBase64: media.base64,
          raw: {},
        }
      : { from: 'sim', text: incomingText, type: 'text', raw: {} };

    // Nodo inicial: reanudar si viene currentNodeId, si no arrancar en el trigger.
    let current: FlowNode | undefined;
    let resuming: boolean;
    if (state?.currentNodeId) {
      current = this.findNode(graph, state.currentNodeId);
      resuming = true;
    } else {
      current = this.triggerNode(graph);
      resuming = false;
    }

    // Camino recorrido en este turno (para resaltar en el editor).
    const trace: string[] = [];

    // Comandos globales (atrás/menú/salir/ayuda), ANTES de reanudar/avanzar.
    const variables: Record<string, any> = { ...(state?.variables ?? {}) };
    const command = detectGlobalCommand(incomingText);
    if (command === 'exit') {
      outgoing.push({ type: 'text', text: GOODBYE_TEXT });
      return { outgoing, variables, currentNodeId: null, waiting: false, ended: true, trace };
    }
    if (command === 'restart') {
      // Reinicia: arranca desde el trigger limpiando variables transitorias.
      current = this.triggerNode(graph);
      resuming = false;
      for (const key of Object.keys(variables)) delete variables[key];
    } else if (command === 'help') {
      // Repite/explica el paso actual: re-ejecuta el nodo donde se esperaba.
      if (state?.currentNodeId) {
        current = this.findNode(graph, state.currentNodeId) ?? current;
      }
      resuming = false;
    } else if (command === 'back') {
      // Retrocede un paso con la pila de navegación (__nav).
      const target = navBack(variables);
      current = target ? this.findNode(graph, target) : this.triggerNode(graph);
      resuming = false;
    } else if (resuming && current?.type !== 'aiAgent' && detectCancelIntent(incomingText)) {
      // CANCELACIÓN (misma regla que en process): rescata al usuario del paso
      // determinista y vuelve al inicio conservando el historial de la IA.
      current = this.triggerNode(graph);
      resuming = false;
      const history = variables.__aiHistory;
      for (const key of Object.keys(variables)) delete variables[key];
      if (history) variables.__aiHistory = history;
    }

    // tenantId REAL cuando el flujo pertenece a una empresa: así las pruebas
    // del editor miden consumo/crédito como uso de esa empresa. Sin tenant
    // (plantillas), el consumo se registra como plataforma (tenant null).
    const simTenantId = opts?.tenantId || 'sim';

    const ctx: ExecutionContext = {
      tenantId: simTenantId,
      conversationId: 'sim',
      contactPhone: 'sim',
      variables,
      incoming: message,
      resuming,
      dryRun,
      services: fakeServices,
    };

    if (!current) {
      return { outgoing, variables: ctx.variables, currentNodeId: null, waiting: false, ended: true, trace };
    }

    let hops = 0;
    while (current && hops < MAX_HOPS) {
      hops++;
      const active = current;
      trace.push(active.id);

      let result: NodeResult;
      try {
        result = await this.registry.get(active.type).execute(active, ctx);
      } catch (err) {
        const onError = this.resolveOnError(graph, active.id);
        if (onError.handled) {
          ctx.resuming = false;
          current = onError.next;
          continue;
        }
        // Sin onError: mensaje amable y terminar.
        outgoing.push({ type: 'text', text: GENERIC_ERROR_TEXT });
        return { outgoing, variables: ctx.variables, currentNodeId: null, waiting: false, ended: true, trace };
      }

      if (result.setVariables) Object.assign(ctx.variables, result.setVariables);
      if (result.outgoing?.length) outgoing.push(...result.outgoing);

      if (result.end) {
        return { outgoing, variables: ctx.variables, currentNodeId: null, waiting: false, ended: true, trace };
      }
      if (result.waitForInput) {
        navPush(ctx.variables, active.id);
        return { outgoing, variables: ctx.variables, currentNodeId: active.id, waiting: true, ended: false, trace };
      }

      const targets = this.nextFrom(graph, active.id, result.nextHandle ?? 'out');
      ctx.resuming = false;
      current = targets.length ? this.findNode(graph, targets[0]) : undefined;
    }

    return { outgoing, variables: ctx.variables, currentNodeId: null, waiting: false, ended: true, trace };
  }

  // ── Entrada de eventos ──────────────────────────────────────────

  /**
   * Maneja un mensaje entrante. Serializa el procesamiento por contacto con
   * un mutex en memoria; distintos contactos corren en paralelo.
   */
  @OnEvent('whatsapp.incoming')
  async handleIncoming(payload: { tenantId: string; message: IncomingMessage }): Promise<void> {
    const { tenantId, message } = payload;
    const key = `${tenantId}:${message.from}`;

    // Encadena la tarea a la última del mismo contacto (ignora su resultado/errores).
    const previous = this.locks.get(key) ?? Promise.resolve();
    const task = previous
      .catch(() => undefined)
      .then(() => this.process(tenantId, message));

    this.locks.set(key, task);

    try {
      await task;
    } catch (err) {
      // Un fallo procesando un mensaje no debe romper el manejador de eventos
      // ni descartar el error en silencio: se registra para diagnóstico.
      const detail = err instanceof Error ? err.message : String(err);
      // Con contacto en el log se puede correlacionar directo con la
      // conversación en el visor, sin grep manual por tenant.
      this.logger.error(`process(${tenantId}, contacto ${message.from}) falló: ${detail}`);
    } finally {
      // Limpia el lock si nadie más se encoló detrás.
      if (this.locks.get(key) === task) {
        this.locks.delete(key);
      }
    }
  }

  // ── Núcleo del recorrido ────────────────────────────────────────

  /** Procesa un mensaje contra el flujo activo del tenant. */
  private async process(tenantId: string, message: IncomingMessage): Promise<void> {
    const setup = await this.conversationSetup.resolveConversationAndFlow(tenantId, message);
    if (!setup) return;

    const { tenant, flow, graph, conversation, baseVariables } = setup;
    let node = setup.node;
    let resuming = setup.resuming;

    // Comandos globales (volver/menú/salir), ANTES de reanudar/avanzar.
    const command = detectGlobalCommand(message.text);
    if (command === 'exit') {
      // Despedida y fin de conversación.
      await this.sendMessage(tenantId, message.from, { type: 'text', text: GOODBYE_TEXT });
      await this.conversations.updateState(conversation.id, {
        status: 'ENDED',
        currentNodeId: null,
        variables: baseVariables,
      });
      return;
    }
    if (command === 'restart') {
      // Reinicia: arranca desde el trigger limpiando variables transitorias.
      const trigger = this.triggerNode(graph);
      if (trigger) {
        node = trigger;
        resuming = false;
        for (const key of Object.keys(baseVariables)) delete baseVariables[key];
      }
    } else if (command === 'help') {
      // Repite/explica el paso actual: re-emite el prompt del nodo donde se esperaba.
      resuming = false;
    } else if (command === 'back') {
      // Retrocede un paso con la pila de navegación (__nav).
      const target = navBack(baseVariables);
      const tn = target ? this.findNode(graph, target) : this.triggerNode(graph);
      if (tn) {
        node = tn;
        resuming = false;
      }
    } else if (resuming && node.type !== 'aiAgent' && detectCancelIntent(message.text)) {
      // CANCELACIÓN: el usuario está atrapado en un paso determinista (captura
      // de datos/menú) y expresa que ya no quiere continuar ("ya no quiero",
      // "quita la cita"...). Vuelve al inicio (agente IA) CONSERVANDO el
      // historial de la IA: así responde con contexto ("entendido, queda
      // cancelada") y el recordatorio, al releer la conversación, verá la
      // cancelación y no enviará el aviso.
      const trigger = this.triggerNode(graph);
      if (trigger) {
        node = trigger;
        resuming = false;
        const history = baseVariables.__aiHistory;
        for (const key of Object.keys(baseVariables)) delete baseVariables[key];
        if (history) baseVariables.__aiHistory = history;
      }
    }

    // Contexto de ejecución.
    const ctx: ExecutionContext = {
      tenantId,
      conversationId: conversation.id,
      flowId: flow.id,
      contactPhone: message.from,
      variables: baseVariables,
      incoming: message,
      resuming,
      services: this,
    };

    // Variables siempre disponibles del tenant (atributos de la empresa).
    // {{clienteEmail}} = correo del cliente-empresa para invitarlo a sus citas.
    // {{contacto}} = teléfono del contacto que escribe.
    ctx.variables.clienteEmail = (tenant as any).clientEmail || '';
    ctx.variables.contacto = message.from;
    // {{contactoNombre}} = nombre del contacto (perfil de WhatsApp), si se conoce.
    ctx.variables.contactoNombre = conversation.contactName || '';

    await this.runNodes(tenantId, message, flow, graph, conversation, ctx, node);
  }

  /**
   * Bucle de recorrido del grafo (con guard anti-bucle): ejecuta nodos, fusiona
   * variables, despacha salientes y persiste el estado de la conversación en
   * fin / espera de input / error.
   */
  private async runNodes(
    tenantId: string,
    message: IncomingMessage,
    flow: { id: string },
    graph: FlowGraph,
    conversation: any,
    ctx: ExecutionContext,
    startNode: FlowNode,
  ): Promise<void> {
    let hops = 0;
    let current: FlowNode | undefined = startNode;

    while (current && hops < MAX_HOPS) {
      hops++;
      const active = current;

      let result: NodeResult;
      try {
        result = await this.registry.get(active.type).execute(active, ctx);
      } catch (err) {
        // Error de nodo: derivar por 'onError' si hay edge; si no, registrar y terminar.
        const onError = this.resolveOnError(graph, active.id);
        if (onError.handled) {
          await this.logError(tenantId, active, err, 'onError disponible');
          current = onError.next;
          ctx.resuming = false;
          continue;
        }
        await this.logError(tenantId, active, err, 'sin onError, termina');
        // Mensaje amable al usuario (sin exponer el error técnico).
        await this.sendMessage(tenantId, message.from, {
          type: 'text',
          text: GENERIC_ERROR_TEXT,
        });
        await this.conversations.updateState(conversation.id, {
          status: 'ENDED',
          currentNodeId: null,
          variables: ctx.variables,
        });
        return;
      }

      // Fusiona variables y despacha mensajes salientes.
      if (result.setVariables) Object.assign(ctx.variables, result.setVariables);
      if (result.outgoing?.length) {
        for (const out of result.outgoing) {
          await this.sendMessage(tenantId, message.from, out);
        }
      }

      // Fin de conversación.
      if (result.end) {
        const handedOver = ctx.variables.__handover === true;
        if (handedOver) {
          // ATÓMICO: el estado HANDED_OVER y su rastro de auditoría se
          // escriben juntos (o ninguno) — sin estados a medias si el proceso
          // cae entre ambos. Si la transacción falla, cae al camino de abajo:
          // el estado SIEMPRE se persiste, la auditoría nunca tumba el motor.
          try {
            await this.prisma.$transaction([
              this.prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                  lastMessageAt: new Date(),
                  status: 'HANDED_OVER',
                  currentNodeId: null,
                  variables: ctx.variables as any,
                },
              }),
              this.prisma.eventLog.create({
                data: {
                  tenantId,
                  level: 'WARN',
                  source: 'engine',
                  message: `Conversación transferida a humano: ${message.from}${
                    conversation.contactName ? ` (${conversation.contactName})` : ''
                  }. El bot queda en silencio.${
                    ctx.variables.__handoverNote ? ` Nota: ${ctx.variables.__handoverNote}` : ''
                  }`,
                  meta: {
                    contactPhone: message.from,
                    nodeId: active.id,
                    note: ctx.variables.__handoverNote || undefined,
                  } as any,
                },
              }),
            ]);
            return;
          } catch {
            /* transacción fallida: persiste al menos el estado (abajo) */
          }
        }
        await this.conversations.updateState(conversation.id, {
          status: handedOver ? 'HANDED_OVER' : 'ENDED',
          currentNodeId: null,
          variables: ctx.variables,
        });
        return;
      }

      // Pausa esperando el próximo mensaje del usuario.
      if (result.waitForInput) {
        navPush(ctx.variables, active.id); // breadcrumb para "atrás"
        await this.conversations.updateState(conversation.id, {
          currentFlowId: flow.id,
          currentNodeId: active.id,
          variables: ctx.variables,
        });
        return;
      }

      // Avanza al siguiente nodo por el handle indicado (por defecto 'out').
      const targets = this.nextFrom(graph, active.id, result.nextHandle ?? 'out');
      ctx.resuming = false;
      current = targets.length ? this.findNode(graph, targets[0]) : undefined;
    }

    // Fin de rama (sin siguiente nodo) o guard alcanzado: limpia el nodo actual.
    await this.conversations.updateState(conversation.id, {
      currentNodeId: null,
      variables: ctx.variables,
    });

    if (hops >= MAX_HOPS) {
      this.logger.warn(
        `Guard anti-bucle alcanzado (${MAX_HOPS} saltos) en tenant ${tenantId}, flujo ${flow.id}, contacto ${message.from}`,
      );
    }
  }

  /**
   * ¿La integración tiene EFECTO SECUNDARIO real? (crear cita, enviar correo,
   * HTTP que escribe). En modo ensayo estas NO se ejecutan. La IA y las lecturas
   * (calendar listEvents, HTTP GET/HEAD) no se consideran efecto secundario.
   */
  private hasSideEffect(payload: any): boolean {
    const kind = payload?.kind;
    if (kind === 'calendar') return (payload.action ?? 'createEvent') === 'createEvent';
    if (kind === 'gmail') return (payload.action ?? 'send') === 'send';
    if (kind === 'http') {
      const m = String(payload.method ?? 'GET').toUpperCase();
      return m !== 'GET' && m !== 'HEAD';
    }
    return false;
  }

  /** Resultado simulado para integraciones de efecto secundario en modo ensayo. */
  private mockIntegration(payload: any): any {
    const kind = payload?.kind;
    if (kind === 'calendar') {
      return { ok: true, ensayo: true, id: 'ensayo', htmlLink: '(ensayo)', invitados: [] };
    }
    if (kind === 'gmail') {
      return { ok: true, ensayo: true, id: 'ensayo' };
    }
    if (kind === 'http') {
      return { ok: true, ensayo: true, status: 200, data: {} };
    }
    return { ok: true, ensayo: true };
  }

  /** Busca un nodo del grafo por id. */
  private findNode(graph: FlowGraph, nodeId: string): FlowNode | undefined {
    return graph.nodes.find((n) => n.id === nodeId);
  }

  /** Nodo de arranque del grafo (tipo 'trigger'). */
  private triggerNode(graph: FlowGraph): FlowNode | undefined {
    return graph.nodes.find((n) => n.type === 'trigger');
  }

  /**
   * Resolución del handle 'onError' de un nodo: `handled` indica si existe un
   * edge onError; `next` es el nodo destino (puede ser undefined si el edge
   * apunta a un nodo inexistente — el recorrido termina en silencio, igual que
   * con cualquier edge colgante).
   */
  private resolveOnError(
    graph: FlowGraph,
    nodeId: string,
  ): { handled: boolean; next?: FlowNode } {
    const targets = this.nextFrom(graph, nodeId, 'onError');
    if (targets.length === 0) return { handled: false };
    return { handled: true, next: this.findNode(graph, targets[0]) };
  }

  /**
   * Devuelve los ids destino de los edges que salen de `nodeId` por `handle`.
   * El handle por defecto de un edge sin sourceHandle es 'out'.
   */
  private nextFrom(graph: FlowGraph, nodeId: string, handle: string): string[] {
    return graph.edges
      .filter((e: FlowEdge) => e.source === nodeId && (e.sourceHandle || 'out') === handle)
      .map((e) => e.target);
  }

  /** Registra un EventLog de error originado en el motor. */
  private async logError(
    tenantId: string,
    node: FlowNode,
    err: unknown,
    detail: string,
  ): Promise<void> {
    const messageText = err instanceof Error ? err.message : String(err);
    this.logger.error(`Error en nodo ${node.id} (${node.type}): ${messageText}`);
    try {
      await this.prisma.eventLog.create({
        data: {
          tenantId,
          level: 'ERROR',
          source: 'engine',
          message: `Error en nodo ${node.type} (${node.id}): ${messageText}`,
          meta: { nodeId: node.id, nodeType: node.type, detail } as any,
        },
      });
    } catch {
      // El log de auditoría nunca debe tumbar el motor.
    }
  }
}
