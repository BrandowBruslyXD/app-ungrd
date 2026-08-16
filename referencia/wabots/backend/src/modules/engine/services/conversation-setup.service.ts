import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { FlowGraph, FlowNode, IncomingMessage } from '../../../common/types/engine.types';
import { ConversationsService } from '../../conversations/conversations.service';
import { FlowsService } from '../../flows/flows.service';

/**
 * Tiempo de inactividad tras el cual una conversación a medias se reinicia
 * desde el principio (vuelve al menú/inicio y olvida el contexto previo).
 * Configurable con SESSION_TIMEOUT_MINUTES (default 360 = 6 horas; 0 = nunca).
 */
const SESSION_TIMEOUT_MS =
  Number(process.env.SESSION_TIMEOUT_MINUTES ?? 360) * 60_000;

/**
 * Conversación TRANSFERIDA A HUMANO: el bot guarda silencio mientras el humano
 * atiende. Si pasan estos minutos SIN actividad, el bot retoma desde el inicio.
 * Configurable con HANDOVER_RESUME_MINUTES (default 360 = 6 horas; 0 = nunca retoma).
 */
const HANDOVER_RESUME_MS =
  Number(process.env.HANDOVER_RESUME_MINUTES ?? 360) * 60_000;

/** Estado inicial resuelto (tenant/flujo/conversación/nodo) para procesar un mensaje. */
export interface ProcessSetup {
  tenant: any;
  flow: { id: string };
  graph: FlowGraph;
  conversation: any;
  node: FlowNode;
  resuming: boolean;
  baseVariables: Record<string, any>;
}

/**
 * Resuelve el punto de partida de cada mensaje entrante: tenant activo, flujo
 * activo, conversación (con ventana de handover y expiración por inactividad)
 * y nodo inicial. Extraído del EngineService para mantener el motor centrado
 * en el recorrido del grafo.
 */
@Injectable()
export class ConversationSetupService {
  private readonly logger = new Logger(ConversationSetupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flows: FlowsService,
    private readonly conversations: ConversationsService,
  ) {}

  /**
   * Resuelve tenant activo, flujo activo, conversación (con ventana de handover
   * y expiración por inactividad) y el nodo inicial. Devuelve null cuando no
   * hay nada que procesar (tenant inactivo, sin flujo, handover vigente, sin
   * nodo de arranque).
   */
  async resolveConversationAndFlow(
    tenantId: string,
    message: IncomingMessage,
  ): Promise<ProcessSetup | null> {
    // a. Tenant activo.
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.status !== 'ACTIVE') return null;

    // b. Flujo activo.
    if (!tenant.activeFlowId) return null;
    const flow = await this.flows.findOne(tenant.activeFlowId);
    const graph = flow.graph as FlowGraph;

    // c. Conversación (registra el nombre de perfil de WhatsApp si viene).
    const conversation = await this.conversations.getOrCreate(
      tenantId,
      message.from,
      this.extractProfileName(message),
    );

    // El webhook ya registró el MessageLog entrante, pero en un contacto NUEVO la
    // conversación no existía todavía y quedó sin vincular. Se adopta ahora: sin esto
    // el visor muestra la conversación empezando por la respuesta del bot, sin la
    // pregunta que la abrió — y es justo el primer mensaje el que dice qué quería.
    await this.adoptarMensajeEntrante(tenantId, conversation.id, message.externalId);

    // c-pre. TRANSFERIDA A HUMANO: el bot NO responde mientras el humano
    // atiende (silencio total). La ventana se mide por inactividad: cada
    // mensaje del cliente la renueva. Vencida la ventana, el bot retoma
    // limpio desde el inicio.
    if ((conversation as any).status === 'HANDED_OVER') {
      const lastAt = conversation.lastMessageAt
        ? new Date(conversation.lastMessageAt).getTime()
        : 0;
      const stillHuman =
        HANDOVER_RESUME_MS <= 0 || Date.now() - lastAt < HANDOVER_RESUME_MS;
      if (stillHuman) {
        // Solo refresca lastMessageAt (renueva la ventana) y calla.
        await this.conversations.updateState(conversation.id, {});
        return null;
      }
      // Ventana vencida: el bot retoma desde cero.
      await this.conversations.updateState(conversation.id, {
        status: 'ACTIVE',
        currentNodeId: null,
        variables: {},
      });
      (conversation as any).status = 'ACTIVE';
      conversation.currentNodeId = null;
      (conversation as any).variables = {};
    }

    // c-bis. Expiración por inactividad: si la conversación quedó a medias y el
    // último mensaje fue hace más de SESSION_TIMEOUT_MS, se reinicia desde el
    // principio (olvida el contexto previo y vuelve al menú/inicio).
    const last = conversation.lastMessageAt
      ? new Date(conversation.lastMessageAt).getTime()
      : 0;
    const expired =
      SESSION_TIMEOUT_MS > 0 &&
      !!conversation.currentNodeId &&
      last > 0 &&
      Date.now() - last > SESSION_TIMEOUT_MS;

    // d. Nodo inicial: reanudar donde quedó, o arrancar en el trigger (también
    // si la sesión expiró). Auto-sanable: si el nodo guardado ya no existe en el
    // grafo (porque el flujo cambió), se reinicia desde el trigger en vez de
    // quedarse mudo.
    let node: FlowNode | undefined;
    let resuming: boolean;
    let stale = false;
    if (conversation.currentNodeId && !expired) {
      node = this.findNode(graph, conversation.currentNodeId);
      resuming = true;
      if (!node) {
        node = this.triggerNode(graph);
        resuming = false;
        stale = true; // el nodo previo ya no existe → empezar limpio
      }
    } else {
      node = this.triggerNode(graph);
      resuming = false;
    }
    if (!node) return null; // sin nodo de arranque/reanudación válido.

    // Si la sesión expiró o el contexto quedó obsoleto, se arranca con
    // variables limpias (contexto olvidado).
    const baseVariables: Record<string, any> = expired || stale
      ? {}
      : { ...((conversation.variables as Record<string, any>) ?? {}) };

    return { tenant, flow, graph, conversation, node, resuming, baseVariables };
  }

  /**
   * Extrae el nombre de perfil del contacto del payload del proveedor:
   * Evolution lo envía como `pushName`; Twilio como `ProfileName`.
   */
  private extractProfileName(message: IncomingMessage): string | undefined {
    const raw = (message?.raw ?? {}) as Record<string, any>;
    const name = raw.pushName ?? raw.ProfileName ?? raw.notifyName;
    return typeof name === 'string' && name.trim() ? name.trim() : undefined;
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
   * Vincula a la conversación el MessageLog que el webhook dejó huérfano.
   * Nunca lanza: perder el vínculo de un log no debe impedir atender al cliente.
   */
  private async adoptarMensajeEntrante(
    tenantId: string,
    conversationId: string,
    externalId?: string,
  ): Promise<void> {
    if (!externalId) return;
    try {
      await this.prisma.messageLog.updateMany({
        where: { tenantId, externalId, conversationId: null },
        data: { conversationId },
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo vincular el mensaje ${externalId} a la conversación ${conversationId}: ` +
          `${(err as Error).message}`,
      );
    }
  }
}
