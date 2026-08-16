import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Cifrado simétrico AES-256-GCM para secretos en reposo (API keys, tokens, etc.).
 * Formato de salida: base64( iv[12] | authTag[16] | ciphertext ).
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;
  private readonly ALGO = 'aes-256-gcm';

  constructor(private readonly config: ConfigService) {
    const hex = this.config.get<string>('ENCRYPTION_KEY') ?? '';
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
      // Fail-fast: sin una clave válida, los secretos en reposo quedarían
      // cifrados con una clave predecible. Genera una con: openssl rand -hex 32
      throw new Error('ENCRYPTION_KEY debe ser exactamente 64 caracteres hexadecimales (32 bytes).');
    }
    this.key = Buffer.from(hex, 'hex');
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.ALGO, this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
  }

  decrypt(payload: string): string {
    const buf = Buffer.from(payload, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv(this.ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }

  /** Cifra selectivamente los campos secretos de un objeto de config. */
  encryptFields<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
    const out: Record<string, any> = { ...obj };
    for (const f of fields) {
      if (typeof out[f as string] === 'string' && out[f as string]) {
        out[f as string] = this.encrypt(out[f as string]);
      }
    }
    return out as T;
  }

  /** Descifra los campos indicados (inverso de encryptFields). */
  decryptFields<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
    const out: Record<string, any> = { ...obj };
    for (const f of fields) {
      if (typeof out[f as string] === 'string' && out[f as string]) {
        try {
          out[f as string] = this.decrypt(out[f as string]);
        } catch {
          /* valor no cifrado o corrupto: se deja tal cual */
        }
      }
    }
    return out as T;
  }
}
