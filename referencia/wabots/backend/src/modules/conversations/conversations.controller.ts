import { Controller, Get, Param, Query } from '@nestjs/common';
import { ConversationsService } from './conversations.service';

/**
 * Conversaciones de un tenant. El prefijo global /api lo agrega main.ts.
 * Ruta: GET /api/tenants/:tenantId/conversations
 */
@Controller('tenants/:tenantId/conversations')
export class TenantConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  // Lista las conversaciones del tenant (más recientes primero, paginado:
  // ?take default 100, máx 500; ?cursor = id de la última de la página previa).
  @Get()
  async findByTenant(
    @Param('tenantId') tenantId: string,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    const data = await this.conversationsService.findByTenant(tenantId, {
      take: Number(take) || undefined,
      ...(cursor ? { cursor } : {}),
    });
    return { data };
  }
}

/**
 * Detalle de una conversación con su historial.
 * Ruta: GET /api/conversations/:id
 */
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  // Devuelve la conversación con sus mensajes recientes (?take, máx 2000).
  @Get(':id')
  async findOne(@Param('id') id: string, @Query('take') take?: string) {
    const data = await this.conversationsService.findOne(id, Number(take) || 100);
    return { data };
  }
}
