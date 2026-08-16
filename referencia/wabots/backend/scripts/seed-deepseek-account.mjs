// Siembra/actualiza una cuenta DeepSeek-web en la BD, cifrando el bearer+cookies
// con la ENCRYPTION_KEY del ENTORNO donde corre (así la cuenta queda SOLO en la
// base de datos del servidor, nunca en el repo). Las credenciales se pasan por
// VARIABLES DE ENTORNO — este archivo NO contiene ninguna.
//
// Uso (dentro del contenedor backend, que ya tiene ENCRYPTION_KEY y DATABASE_URL):
//   DS_LABEL=lldikayll DS_BEARER='<bearer>' [DS_COOKIE='<cookie>'] \
//     node scripts/seed-deepseek-account.mjs
//
// La captura del bearer se hace en LOCAL (el AWS WAF del login no se resuelve
// headless). Aquí solo se re-cifra con la clave del servidor y se guarda.
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const label = process.env.DS_LABEL;
const bearer = process.env.DS_BEARER;
const cookie = process.env.DS_COOKIE || null;
const keyHex = process.env.ENCRYPTION_KEY || '';

if (!label || !bearer) {
  console.error('Faltan DS_LABEL y/o DS_BEARER en el entorno.');
  process.exit(1);
}
if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
  console.error('ENCRYPTION_KEY inválida (deben ser 64 hex).');
  process.exit(1);
}
const KEY = Buffer.from(keyHex, 'hex');

// Mismo formato que CryptoService: base64(iv[12] | authTag[16] | ciphertext).
function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}

const prisma = new PrismaClient();
try {
  const bearerEnc = encrypt(bearer);
  const cookieEnc = cookie ? encrypt(cookie) : null;
  const existing = await prisma.deepseekAccount.findFirst({ where: { label } });
  const row = existing
    ? await prisma.deepseekAccount.update({
        where: { id: existing.id },
        data: { bearerEnc, cookieEnc, status: 'active', failCount: 0, lastError: null },
      })
    : await prisma.deepseekAccount.create({
        data: { label, bearerEnc, cookieEnc, status: 'active' },
      });
  console.log(`Cuenta "${row.label}" sembrada/actualizada (id ${row.id}, status ${row.status}).`);
} catch (e) {
  console.error('Error al sembrar la cuenta:', e?.message || e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
