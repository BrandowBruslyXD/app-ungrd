import { IsOptional, IsString } from 'class-validator';

/**
 * Datos para configurar el canal Twilio (WhatsApp) de un tenant.
 * Los secretos (apiKeySecret, authToken) se cifran antes de persistir.
 */
export class TwilioChannelDto {
  // SID de la cuenta de Twilio (forma parte de la URL de la API).
  @IsString()
  accountSid: string;

  // SID de la API Key (usuario para auth BASIC).
  @IsString()
  apiKeySid: string;

  // Secreto de la API Key (contraseña para auth BASIC). Se cifra.
  @IsString()
  apiKeySecret: string;

  // Remitente WhatsApp, ej. 'whatsapp:+14155238886'.
  @IsString()
  fromNumber: string;

  // Token clásico de la cuenta (opcional). Se cifra si viene.
  @IsOptional()
  @IsString()
  authToken?: string;
}
