import { Module } from '@nestjs/common';

import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';

/**
 * Módulo de tenants (empresas cliente): CRUD + control ON/OFF del servicio.
 * Depende de WhatsappModule para conectar/desconectar las instancias.
 */
@Module({
  imports: [WhatsappModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
