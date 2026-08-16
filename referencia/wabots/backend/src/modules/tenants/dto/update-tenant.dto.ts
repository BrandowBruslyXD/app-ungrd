import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional } from 'class-validator';
import { CreateTenantDto } from './create-tenant.dto';

/**
 * Datos para actualizar un tenant. Todos los campos de creación son opcionales,
 * más el flujo activo que atiende los mensajes.
 */
export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  // Id del flujo que responderá los mensajes de esta empresa.
  @IsOptional()
  @IsString()
  activeFlowId?: string;
}
