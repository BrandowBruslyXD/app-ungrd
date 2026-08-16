import { IsOptional, IsString } from 'class-validator';

/**
 * Datos para configurar el canal Meta / WhatsApp Cloud API de una empresa.
 * accessToken y appSecret se cifran antes de persistir; phoneNumberId y
 * verifyToken se guardan en claro (se usan para rutear/verificar el webhook).
 */
export class MetaChannelDto {
  // ID del número de teléfono en la Cloud API (graph.facebook.com/{id}/messages).
  @IsString()
  phoneNumberId: string;

  // Token permanente de la WABA / system user. Se cifra.
  @IsString()
  accessToken: string;

  // Verify token del webhook (lo eliges tú y lo pones también en la App de Meta).
  @IsString()
  verifyToken: string;

  // App Secret de la App de Meta (para validar la firma del webhook). Se cifra.
  @IsOptional()
  @IsString()
  appSecret?: string;

  // Versión del Graph API (opcional, p. ej. 'v20.0').
  @IsOptional()
  @IsString()
  graphVersion?: string;
}
