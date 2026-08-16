import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Datos mutables del estado de una conversación. */
interface UpdateStateData {
  currentFlowId?: string;
  currentNodeId?: string | null;
  variables?: Record<string, any>;
  status?: ConversationStatus;
  contactName?: string;
}

/**
 * Estado e historial de conversaciones. Consumido por el engine (stateful).
 */
@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene o crea la conversación de un contacto (upsert por la unique
   * (tenantId, contactPhone)). Si se conoce el nombre de perfil y aún no hay uno
   * guardado, lo registra para reconocer al contacto en futuras conversaciones.
   */
  async getOrCreate(tenantId: string, contactPhone: string, contactName?: string) {
    const name = contactName?.trim();
    return this.prisma.conversation.upsert({
      where: {
        tenantId_contactPhone: { tenantId, contactPhone },
      },
      // Refresca el nombre de perfil cuando llega; si no viene, no toca nada.
      update: name ? { contactName: name } : {},
      create: { tenantId, contactPhone, ...(name ? { contactName: name } : {}) },
    });
  }

  /**
   * Actualiza el estado de la conversación y refresca lastMessageAt = now.
   */
  async updateState(id: string, data: UpdateStateData) {
    const updateData: Prisma.ConversationUpdateInput = {
      lastMessageAt: new Date(),
      ...(data.currentFlowId !== undefined
        ? { currentFlowId: data.currentFlowId }
        : {}),
      ...(data.currentNodeId !== undefined
        ? { currentNodeId: data.currentNodeId }
        : {}),
      ...(data.variables !== undefined
        ? { variables: data.variables as unknown as Prisma.InputJsonValue }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.contactName ? { contactName: data.contactName } : {}),
    };

    return this.prisma.conversation.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Lista las conversaciones de un tenant, más recientes primero (paginado).
   * EXCLUYE `variables` (JSON con la memoria/historial de cada conversación):
   * el listado del dashboard no lo usa y cargarlo para todas era el mayor
   * coste de memoria del endpoint. `take` default 100 (tope 500) y `cursor`
   * opcional (id de la última conversación de la página anterior).
   */
  async findByTenant(
    tenantId: string,
    opts: { take?: number; cursor?: string } = {},
  ) {
    const take = Math.min(Math.max(Math.floor(opts.take ?? 100) || 100, 1), 500);
    return this.prisma.conversation.findMany({
      where: { tenantId },
      select: {
        id: true,
        contactPhone: true,
        contactName: true,
        status: true,
        lastMessageAt: true,
        currentFlowId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { lastMessageAt: 'desc' },
      take,
      // Paginación por cursor: se salta el propio registro del cursor.
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
  }

  /**
   * Devuelve una conversación con sus mensajes en orden cronológico (más
   * antiguo primero). `take` controla cuántos mensajes recientes traer
   * (default 100, tope 2000 — permite revisar el historial completo desde el
   * dashboard sin cargas ilimitadas). Lanza 404 si no existe.
   */
  async findOne(id: string, take = 100) {
    const limit = Math.min(Math.max(Math.floor(take) || 100, 1), 2000);
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          // Tomamos los N más recientes...
          orderBy: { createdAt: 'desc' },
          take: limit,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversación ${id} no encontrada`);
    }

    // ...y los devolvemos en orden cronológico ascendente.
    return {
      ...conversation,
      messages: [...conversation.messages].reverse(),
    };
  }
}
