import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { IntegrationsService } from './integrations.service';
import { SavePlatformLlmDto } from './dto/save-platform-llm.dto';

/**
 * Endpoints de administración del LLM de plataforma (multi-proveedor).
 * Todos protegidos con JwtAuthGuard (los consume el panel de administración).
 * Los endpoints del LLM GLOBAL exigen además rol SUPERADMIN (RolesGuard).
 *
 *  - POST /integrations/ai/platform   → guarda/actualiza el LLM global de plataforma.
 *  - GET  /integrations/ai/platform   → estado actual (provider/model/baseUrl, SIN apiKey).
 *  - POST /integrations/ai/tenant/:tenantId → guarda/actualiza el LLM de una empresa.
 *  - GET  /integrations/ai/tenant/:tenantId → estado del LLM de la empresa (SIN apiKey).
 */
@Controller('integrations/ai')
export class AiAdminController {
  constructor(private readonly integrations: IntegrationsService) {}

  // POST /integrations/ai/platform — guarda el LLM de plataforma. No expone la apiKey.
  // Solo SUPERADMIN: afecta a toda la plataforma.
  @Roles(AdminRole.SUPERADMIN)
  @Post('platform')
  async savePlatform(@Body() dto: SavePlatformLlmDto) {
    await this.integrations.savePlatformLlm({
      provider: dto.provider,
      model: dto.model,
      apiKey: dto.apiKey,
      baseUrl: dto.baseUrl,
    });
    return { data: { ok: true } };
  }

  // GET /integrations/ai/platform — estado actual (provider/model/baseUrl) o null.
  // Solo SUPERADMIN: configuración global de plataforma.
  @Roles(AdminRole.SUPERADMIN)
  @Get('platform')
  async getPlatform() {
    const data = await this.integrations.getPlatformLlm();
    return { data };
  }

  // POST /integrations/ai/tenant/:tenantId — guarda el LLM de una empresa. No expone la apiKey.
  // Solo SUPERADMIN: escribe credenciales de una empresa arbitraria por id.
  @Roles(AdminRole.SUPERADMIN)
  @Post('tenant/:tenantId')
  async saveTenant(
    @Param('tenantId') tenantId: string,
    @Body() dto: SavePlatformLlmDto,
  ) {
    await this.integrations.saveTenantLlm(tenantId, {
      provider: dto.provider,
      model: dto.model,
      apiKey: dto.apiKey,
      baseUrl: dto.baseUrl,
    });
    return { data: { ok: true } };
  }

  // GET /integrations/ai/tenant/:tenantId — estado del LLM de la empresa o null.
  // Solo SUPERADMIN: lee configuración de una empresa arbitraria por id.
  @Roles(AdminRole.SUPERADMIN)
  @Get('tenant/:tenantId')
  async getTenant(@Param('tenantId') tenantId: string) {
    const data = await this.integrations.getTenantLlm(tenantId);
    return { data };
  }
}
