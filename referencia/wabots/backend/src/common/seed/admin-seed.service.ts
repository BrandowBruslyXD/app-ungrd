import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service';
import { passwordStrength } from '../util/password.util';

/**
 * Siembra el admin inicial al arrancar la app (idempotente).
 * Crea el usuario desde ADMIN_USERNAME/ADMIN_PASSWORD si aún no existe.
 * Así cada despliegue garantiza el acceso sin pasos manuales.
 */
@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const username = this.config.get<string>('ADMIN_USERNAME');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!username || !password) {
      this.logger.warn('ADMIN_USERNAME/ADMIN_PASSWORD no definidos; se omite el seed.');
      return;
    }

    const existing = await this.prisma.adminUser.findUnique({ where: { username } });
    if (existing) return; // si el usuario ya existe, no se sobrescribe su contraseña.

    // Avisa (no bloquea el arranque) si la contraseña del seed es débil.
    const strength = passwordStrength(password);
    if (!strength.ok) {
      this.logger.warn(`ADMIN_PASSWORD débil (${strength.reason}); usa una contraseña robusta.`);
    }

    const passwordHash = await argon2.hash(password);
    await this.prisma.adminUser.create({
      data: {
        username,
        email: this.config.get<string>('ADMIN_EMAIL') ?? null,
        name: this.config.get<string>('ADMIN_NAME') ?? username,
        passwordHash,
        role: 'SUPERADMIN',
      },
    });
    this.logger.log(`Admin inicial creado: ${username}`);
  }
}
