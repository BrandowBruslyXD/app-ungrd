/**
 * Seed: crea el usuario admin inicial a partir de variables de entorno.
 * Ejecutar con: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const email = process.env.ADMIN_EMAIL ?? null;
  const password = process.env.ADMIN_PASSWORD ?? 'changeme';
  const name = process.env.ADMIN_NAME ?? 'Administrador';

  const passwordHash = await argon2.hash(password);

  const admin = await prisma.adminUser.upsert({
    where: { username },
    update: { name, email, passwordHash },
    create: { username, email, name, passwordHash, role: 'SUPERADMIN' },
  });

  console.log(`Admin listo: ${admin.username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
