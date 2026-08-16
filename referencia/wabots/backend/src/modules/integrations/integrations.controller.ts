import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { GmailAgentDto } from './dto/gmail-agent.dto';

/**
 * Rutas anidadas por tenant: listar y crear integraciones.
 * Respuestas envueltas en { data } con secretos enmascarados (CONTRACTS.md §6).
 */
@Controller('tenants/:tenantId/integrations')
export class TenantIntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  // GET /tenants/:tenantId/integrations — lista las integraciones del tenant.
  @Get()
  async list(@Param('tenantId') tenantId: string) {
    const data = await this.integrations.list(tenantId);
    return { data };
  }

  // POST /tenants/:tenantId/integrations — crea una integración.
  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateIntegrationDto,
  ) {
    const data = await this.integrations.create(tenantId, dto);
    return { data };
  }
}

/**
 * Rutas planas por id: actualizar y eliminar una integración.
 */
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  // PATCH /integrations/:id — actualiza una integración.
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationDto,
  ) {
    const data = await this.integrations.update(id, dto);
    return { data };
  }

  // DELETE /integrations/:id — elimina una integración.
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.integrations.remove(id);
    return { data };
  }

  // POST /integrations/gmail/agent/:tenantId — habilita/configura el agente de
  // correo del tenant (requiere Gmail ya conectado por OAuth).
  @Post('gmail/agent/:tenantId')
  async setGmailAgent(
    @Param('tenantId') tenantId: string,
    @Body() dto: GmailAgentDto,
  ) {
    const data = await this.integrations.setGmailAgentConfig(tenantId, dto);
    return { data };
  }
}
