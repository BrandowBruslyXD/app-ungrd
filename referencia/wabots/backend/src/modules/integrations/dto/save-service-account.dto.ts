import { Allow, IsOptional, IsString } from 'class-validator';

/**
 * DTO para registrar una cuenta de servicio de Google Calendar.
 * Al ser una clase con class-validator, el ValidationPipe global (whitelist)
 * descarta cualquier campo no declarado.
 */
export class SaveServiceAccountDto {
  // 'platform' → integración GLOBAL (tenantId null). Cualquier otro → por tenant.
  @IsOptional()
  @IsString()
  level?: string;

  // Requerido cuando level !== 'platform': empresa dueña de la integración.
  @IsOptional()
  @IsString()
  tenantId?: string;

  // Correo del calendario compartido con la cuenta de servicio.
  @IsOptional()
  @IsString()
  calendarId?: string;

  // JSON de la cuenta de servicio: objeto ya parseado o el string crudo del
  // archivo. Admite ambas formas, por lo que se valida en el controller.
  @Allow()
  serviceAccount?: Record<string, any> | string;
}
