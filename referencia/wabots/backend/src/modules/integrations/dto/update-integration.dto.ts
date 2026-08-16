import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { IntegrationType } from '@prisma/client';

/**
 * DTO para actualizar una integración. Todos los campos opcionales.
 * Se define explícitamente (podría ser PartialType de CreateIntegrationDto,
 * de @nestjs/mapped-types, ya usado en tenants) para documentar cada campo.
 */
export class UpdateIntegrationDto {
  // Nombre legible de la integración.
  @IsOptional()
  @IsString()
  name?: string;

  // Tipo de integración: AI_API | GMAIL | CALENDAR | HTTP.
  @IsOptional()
  @IsEnum(IntegrationType)
  type?: IntegrationType;

  // Config específica del tipo. El servicio cifra los secretos antes de guardar.
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  // Activa/inactiva.
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
