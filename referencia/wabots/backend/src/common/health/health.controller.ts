import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { Public } from '../decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Salud del servicio para el healthcheck de Docker (y monitoreo).
 * Público y barato: responde 200 solo si el proceso vive Y la BD contesta.
 * Si la BD no responde, devuelve 503 → el contenedor se marca unhealthy.
 */
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ ok: true }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('BD no disponible');
    }
    return { ok: true };
  }
}
