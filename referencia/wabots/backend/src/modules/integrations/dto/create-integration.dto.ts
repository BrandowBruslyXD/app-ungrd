import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { IntegrationType } from '@prisma/client';

/**
 * DTO para crear una integración externa de un tenant.
 * `config` lleva los secretos en claro al entrar; el servicio los cifra
 * antes de persistir (apiKey, accessToken, refreshToken, clientSecret).
 */
export class CreateIntegrationDto {
  // Nombre legible de la integración (requerido).
  @IsString()
  name: string;

  // Tipo de integración: AI_API | GMAIL | CALENDAR | HTTP.
  @IsEnum(IntegrationType)
  type: IntegrationType;

  // Config específica del tipo (baseUrl, apiKey, accessToken, etc.).
  @IsObject()
  config: Record<string, any>;

  // Activa/inactiva. Por defecto true en el esquema.
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
