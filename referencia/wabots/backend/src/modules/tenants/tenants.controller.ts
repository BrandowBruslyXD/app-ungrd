import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';

import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TwilioChannelDto } from './dto/twilio-channel.dto';
import { MetaChannelDto } from './dto/meta-channel.dto';

/**
 * API REST de tenants. Todo protegido con JWT.
 * Respuestas siempre envueltas en { data }.
 */
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  // Lista todos los tenants.
  @Get()
  async findAll() {
    return { data: await this.tenants.findAll() };
  }

  // Crea un tenant.
  @Post()
  async create(@Body() dto: CreateTenantDto) {
    return { data: await this.tenants.create(dto) };
  }

  // Obtiene un tenant por id.
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { data: await this.tenants.findOne(id) };
  }

  // Actualiza un tenant.
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return { data: await this.tenants.update(id, dto) };
  }

  // Elimina un tenant.
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return { data: await this.tenants.remove(id) };
  }

  // Enciende el servicio (ACTIVE) y conecta WhatsApp.
  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    return { data: await this.tenants.activate(id) };
  }

  // Apaga el servicio (SUSPENDED) y desconecta WhatsApp.
  @Post(':id/suspend')
  async suspend(@Param('id') id: string) {
    return { data: await this.tenants.suspend(id) };
  }

  // Solicita conexión de WhatsApp y devuelve el QR si aplica.
  @Post(':id/whatsapp/connect')
  async connectWhatsapp(@Param('id') id: string) {
    return { data: await this.tenants.connectWhatsapp(id) };
  }

  // Consulta el estado de conexión de WhatsApp.
  @Get(':id/whatsapp/state')
  async whatsappState(@Param('id') id: string) {
    return { data: await this.tenants.whatsappState(id) };
  }

  // Configura el canal Twilio del tenant (cifra secretos). No expone secretos.
  @Post(':id/channel/twilio')
  async configureTwilio(@Param('id') id: string, @Body() dto: TwilioChannelDto) {
    return { data: await this.tenants.configureTwilio(id, dto) };
  }

  // Configura el canal Meta / WhatsApp Cloud API (cifra secretos).
  @Post(':id/channel/meta')
  async configureMeta(@Param('id') id: string, @Body() dto: MetaChannelDto) {
    return { data: await this.tenants.configureMeta(id, dto) };
  }

  // Desvincula el canal actual y vuelve a Evolution (QR).
  @Post(':id/channel/reset')
  async resetChannel(@Param('id') id: string) {
    return { data: await this.tenants.resetChannel(id) };
  }
}
