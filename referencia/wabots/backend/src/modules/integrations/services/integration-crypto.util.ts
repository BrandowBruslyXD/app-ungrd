import { Integration } from '@prisma/client';
import { CryptoService } from '../../../common/crypto/crypto.service';

// Campos de `config` que son secretos y deben cifrarse en reposo.
export const SECRET_FIELDS = [
  'apiKey',
  'accessToken',
  'refreshToken',
  'clientSecret',
];

/** Cifra los campos secretos de un objeto de config. */
export function encryptConfig(
  crypto: CryptoService,
  config: Record<string, any>,
): Record<string, any> {
  return crypto.encryptFields({ ...config }, SECRET_FIELDS);
}

/** Descifra la config de una integración para uso interno (motor). */
export function decryptConfig(
  crypto: CryptoService,
  integration: Integration,
): Record<string, any> {
  const config = (integration.config ?? {}) as Record<string, any>;
  return crypto.decryptFields({ ...config }, SECRET_FIELDS);
}

/**
 * Devuelve la integración con los secretos de config enmascarados ('***').
 * NUNCA expone valores cifrados ni en claro hacia el controller.
 */
export function mask(integration: Integration) {
  const config = (integration.config ?? {}) as Record<string, any>;
  const masked: Record<string, any> = { ...config };
  for (const field of [...SECRET_FIELDS, 'serviceAccountEnc']) {
    if (typeof masked[field] === 'string' && masked[field]) {
      masked[field] = '***';
    }
  }
  return { ...integration, config: masked };
}
