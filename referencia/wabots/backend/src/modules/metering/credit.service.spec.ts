import { BadRequestException } from '@nestjs/common';
import { CreditService } from './credit.service';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Mock manual de PrismaService: solo los delegates que usa CreditService.
 * Los aggregates devuelven la forma { _sum: { ... } } que espera el servicio.
 */
function buildPrismaMock() {
  return {
    creditTopUp: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    aiUsageRecord: {
      aggregate: jest.fn(),
    },
  };
}

describe('CreditService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: CreditService;

  /** Configura las sumas que devolverán los aggregates de la próxima lectura. */
  function setSums(recargado: number | null, consumido: number | null) {
    prisma.creditTopUp.aggregate.mockResolvedValue({ _sum: { amountUsd: recargado } });
    prisma.aiUsageRecord.aggregate.mockResolvedValue({ _sum: { costUsd: consumido } });
  }

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new CreditService(prisma as unknown as PrismaService);
  });

  describe('hasCredit', () => {
    it('sin recargas (sum null) → true (modelo prepago no activado)', async () => {
      setSums(null, null);
      await expect(service.hasCredit('t1')).resolves.toBe(true);
    });

    it('con recargas y saldo > 0 → true', async () => {
      setSums(10, 3);
      await expect(service.hasCredit('t1')).resolves.toBe(true);
    });

    it('con recargas y saldo <= 0 → false', async () => {
      setSums(5, 5);
      await expect(service.hasCredit('t1')).resolves.toBe(false);
    });
  });

  describe('getBalance (caché)', () => {
    it('la segunda llamada NO vuelve a consultar la BD', async () => {
      setSums(10, 2);

      const primero = await service.getBalance('t1');
      const segundo = await service.getBalance('t1');

      expect(primero).toEqual({ recargadoUsd: 10, consumidoUsd: 2, restanteUsd: 8 });
      expect(segundo).toEqual(primero);
      // Solo la primera lectura pagó el aggregate; la segunda salió del caché.
      expect(prisma.creditTopUp.aggregate).toHaveBeenCalledTimes(1);
      expect(prisma.aiUsageRecord.aggregate).toHaveBeenCalledTimes(1);
    });

    it('noteUsage ajusta el consumido del caché sin tocar la BD', async () => {
      setSums(10, 2);

      await service.getBalance('t1'); // materializa el caché
      service.noteUsage('t1', 0.5); // ajuste incremental en memoria
      const balance = await service.getBalance('t1');

      expect(balance.consumidoUsd).toBeCloseTo(2.5);
      expect(balance.restanteUsd).toBeCloseTo(7.5);
      // No hubo un segundo aggregate: el ajuste fue puramente en caché.
      expect(prisma.creditTopUp.aggregate).toHaveBeenCalledTimes(1);
      expect(prisma.aiUsageRecord.aggregate).toHaveBeenCalledTimes(1);
    });
  });

  describe('topUp', () => {
    it('con monto <= 0 lanza BadRequestException', async () => {
      await expect(service.topUp('t1', 0)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.topUp('t1', -5)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.creditTopUp.create).not.toHaveBeenCalled();
    });

    it('una recarga válida invalida el caché (la siguiente lectura vuelve a agregar)', async () => {
      setSums(10, 2);
      await service.getBalance('t1'); // caché caliente
      expect(prisma.creditTopUp.aggregate).toHaveBeenCalledTimes(1);

      prisma.creditTopUp.create.mockResolvedValue({ id: 'top1' });
      await service.topUp('t1', 5, 'recarga de prueba');
      expect(prisma.creditTopUp.create).toHaveBeenCalledTimes(1);

      // La recarga cambió la base del saldo: se recalcula contra la BD.
      setSums(15, 2);
      const balance = await service.getBalance('t1');
      expect(prisma.creditTopUp.aggregate).toHaveBeenCalledTimes(2);
      expect(balance).toEqual({ recargadoUsd: 15, consumidoUsd: 2, restanteUsd: 13 });
    });
  });
});
