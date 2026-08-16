import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../../common/prisma/prisma.service';
import { SESSION_IDLE_MS } from './auth.service';

/**
 * Cierra las sesiones INACTIVAS aunque el navegador esté cerrado (nadie hace
 * requests que disparen la validación). Cada pocos minutos limpia el sessionId
 * de las cuentas cuya última actividad superó la ventana de inactividad → el
 * "semáforo" en la base queda cerrado de forma fiable.
 */
@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async closeIdleSessions(): Promise<void> {
    const cutoff = new Date(Date.now() - SESSION_IDLE_MS);
    try {
      const res = await this.prisma.adminUser.updateMany({
        where: { sessionId: { not: null }, sessionLastSeenAt: { lt: cutoff } },
        data: {
          sessionId: null,
          sessionRefreshId: null,
          sessionRefreshPrevId: null,
          sessionRefreshRotatedAt: null,
          sessionUa: null,
          sessionIp: null,
          sessionCreatedAt: null,
          sessionLastSeenAt: null,
        },
      });
      if (res.count > 0) {
        this.logger.log(`Sesiones cerradas por inactividad: ${res.count}`);
      }
    } catch (err) {
      this.logger.error(
        `closeIdleSessions falló: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
