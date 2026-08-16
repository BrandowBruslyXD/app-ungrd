import { Prisma } from '@prisma/client';

/** Convierte un Decimal de Prisma (o number) a number plano. */
export function toNumber(
  value: Prisma.Decimal | number | null | undefined,
): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  return Number(value.toString());
}
