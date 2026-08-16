import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { FlowsService } from './flows.service';

/**
 * API REST de flujos. Prefijo /flows, todo bajo JwtAuthGuard.
 * Respuestas envueltas en { data } (ver CONTRACTS.md §6).
 */
@Controller('flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  // GET /flows?tenantId= — lista flujos (filtrados por tenant si se indica).
  @Get()
  async findAll(@Query('tenantId') tenantId?: string) {
    const data = await this.flowsService.findAll(tenantId);
    return { data };
  }

  // GET /flows/templates — lista plantillas. DEBE ir antes de /flows/:id.
  @Get('templates')
  async findTemplates() {
    const data = await this.flowsService.findTemplates();
    return { data };
  }

  // POST /flows — crea un flujo.
  @Post()
  async create(@Body() dto: CreateFlowDto) {
    const data = await this.flowsService.create(dto);
    return { data };
  }

  // GET /flows/:id — obtiene un flujo con su grafo tipado (secretos enmascarados).
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.flowsService.findOneForClient(id);
    return { data };
  }

  // PATCH /flows/:id — actualiza un flujo.
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFlowDto) {
    const data = await this.flowsService.update(id, dto);
    return { data };
  }

  // DELETE /flows/:id — elimina un flujo.
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.flowsService.remove(id);
    return { data };
  }
}
