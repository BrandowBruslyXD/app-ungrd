import { IsString, IsOptional } from 'class-validator';

/**
 * Datos para crear un tenant (empresa cliente).
 */
export class CreateTenantDto {
  // Nombre comercial de la empresa.
  @IsString()
  name: string;

  // Notas internas opcionales.
  @IsOptional()
  @IsString()
  notes?: string;

  // Correo del cliente-empresa para invitaciones de calendario ({{clienteEmail}}).
  @IsOptional()
  @IsString()
  clientEmail?: string;
}
