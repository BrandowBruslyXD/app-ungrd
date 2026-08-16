import { IsNumber, IsOptional, IsString, IsPositive } from 'class-validator';

/**
 * DTO para registrar una recarga de saldo prepago de un tenant.
 * El monto va en USD y debe ser positivo; la nota es opcional.
 */
export class TopUpDto {
  // Monto de la recarga en dólares (debe ser > 0).
  @IsNumber()
  @IsPositive()
  amountUsd: number;

  // Nota/descripción opcional (p.ej. método de pago o referencia).
  @IsOptional()
  @IsString()
  note?: string;
}
