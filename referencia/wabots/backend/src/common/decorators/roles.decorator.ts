import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Restringe una ruta a los roles indicados (los valida RolesGuard). */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
