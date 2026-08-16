import { IsOptional, IsString } from 'class-validator';

/**
 * DTO para guardar el LLM de plataforma (integración global, tenantId null).
 * La apiKey llega en claro y el servicio la cifra antes de persistir.
 */
export class SavePlatformLlmDto {
  // Id de proveedor: openai | openai_compatible | custom | deepseek | anthropic | google.
  @IsString()
  provider: string;

  // Modelo a usar (id que acepta el proveedor).
  @IsString()
  model: string;

  // API key del proveedor (se persiste cifrada).
  @IsString()
  apiKey: string;

  // baseUrl propia (solo para openai_compatible/custom o para sobreescribir el default).
  @IsOptional()
  @IsString()
  baseUrl?: string;
}
