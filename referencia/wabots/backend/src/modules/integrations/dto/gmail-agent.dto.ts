import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * DTO para habilitar/configurar el AGENTE DE CORREO de un tenant.
 * Se guarda en la Integration GMAIL del tenant (campos en claro, no secretos).
 */
export class GmailAgentDto {
  // Activa/desactiva el agente de correo para el tenant.
  @IsBoolean()
  enabled: boolean;

  // Prompt de sistema con el que el LLM clasifica/redacta (opcional).
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  // Calendario destino al agendar (correo del calendario o 'primary').
  @IsOptional()
  @IsString()
  calendarId?: string;

  // Permite responder correos automáticamente.
  @IsOptional()
  @IsBoolean()
  autoReply?: boolean;
}
