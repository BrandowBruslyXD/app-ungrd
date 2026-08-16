import { Injectable, Logger } from '@nestjs/common';

import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DeepseekWebCred } from './deepseek-web.service';

/**
 * Pool de cuentas DeepSeek-web. bearer/cookies viven CIFRADOS en BD
 * (CryptoService). El login se captura en local y se sincroniza aquí; el server
 * solo elige la cuenta activa, la usa y la rota si falla. Nunca guarda claves.
 */
@Injectable()
export class DeepseekAccountService {
  private readonly logger = new Logger(DeepseekAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Cuenta activa del pool (round-robin por lastUsedAt) con la cred DESCIFRADA.
   * Recorre las candidatas: si una no descifra (clave distinta/corrupta, típico
   * al mover una fila entre entornos), la marca `failed` y prueba la siguiente,
   * en vez de tumbar todo. Devuelve null solo si NINGUNA sirve.
   */
  async getActive(): Promise<{ accountId: string; cred: DeepseekWebCred } | null> {
    const accs = await this.prisma.deepseekAccount.findMany({
      where: { status: 'active', bearerEnc: { not: null } },
      orderBy: [{ lastUsedAt: 'asc' }],
      take: 10,
    });
    for (const acc of accs) {
      try {
        const bearer = this.crypto.decrypt(acc.bearerEnc as string);
        const cookieHeader = acc.cookieEnc ? this.crypto.decrypt(acc.cookieEnc) : null;
        this.prisma.deepseekAccount
          .update({ where: { id: acc.id }, data: { lastUsedAt: new Date() } })
          .catch(() => undefined);
        return { accountId: acc.id, cred: { bearer, cookieHeader } };
      } catch {
        // Cred no descifrable con la ENCRYPTION_KEY de este entorno: fuera del pool.
        this.logger.warn(`Cuenta ${acc.label}: credencial no descifrable, se saca del pool.`);
        this.prisma.deepseekAccount
          .update({ where: { id: acc.id }, data: { status: 'failed', lastError: 'cred no descifrable con la clave de este entorno' } })
          .catch(() => undefined);
      }
    }
    return null;
  }

  /**
   * Registra un fallo de la cuenta; si parece sesión muerta/ban, la saca del
   * pool. Además deja un EVENTLOG (source 'deepseek-web') para llevar registro
   * de cuándo y por qué cae al fallback — visible en el visor de logs y útil
   * para afinar. Corre en AMBOS modos (chat y builder llaman markFailure).
   */
  async markFailure(accountId: string, err: unknown): Promise<void> {
    const msg = err instanceof Error ? err.message : String(err);
    const acc = await this.prisma.deepseekAccount
      .findUnique({ where: { id: accountId } })
      .catch(() => null);
    if (!acc) return;
    const failCount = acc.failCount + 1;
    // Sesión vencida/revocada/logout/ban → fuera del pool (hay que re-loguear).
    const dead = /expirad|revocad|sesi[oó]n|session|logout|banned|40003|40001|\b401\b|\b403\b/i.test(msg);
    const status = dead || failCount >= 5 ? 'failed' : 'active';
    await this.prisma.deepseekAccount
      .update({ where: { id: accountId }, data: { failCount, lastError: msg.slice(0, 300), status } })
      .catch(() => undefined);
    // Registro persistente del fallo → fallback (best-effort, nunca rompe).
    await this.prisma.eventLog
      .create({
        data: {
          level: 'WARN',
          source: 'deepseek-web',
          message: `DeepSeek-web falló (cuenta ${acc.label}) → fallback a API key`,
          meta: { accountId, label: acc.label, failCount, status, error: msg.slice(0, 300) } as any,
        },
      })
      .catch(() => undefined);
  }

  /**
   * Siembra/actualiza una cuenta con credenciales EN CLARO (uso: sincronización
   * desde la captura local). Cifra antes de guardar.
   */
  async upsertPlaintext(label: string, bearer: string, cookieHeader?: string | null) {
    const bearerEnc = this.crypto.encrypt(bearer);
    const cookieEnc = cookieHeader ? this.crypto.encrypt(cookieHeader) : null;
    const existing = await this.prisma.deepseekAccount.findFirst({ where: { label } });
    if (existing) {
      return this.prisma.deepseekAccount.update({
        where: { id: existing.id },
        data: { bearerEnc, cookieEnc, status: 'active', failCount: 0, lastError: null },
      });
    }
    return this.prisma.deepseekAccount.create({
      data: { label, bearerEnc, cookieEnc, status: 'active' },
    });
  }
}
