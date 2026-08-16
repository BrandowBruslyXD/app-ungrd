/**
 * Política de fuerza de contraseña para cuentas de administrador.
 * Requiere: 8+ caracteres y al menos 3 de las 4 clases (minúscula, mayúscula,
 * dígito, símbolo). No hay registro público: solo los superadmin crean cuentas,
 * pero igual se exige robustez para reducir el riesgo de fuerza bruta.
 */
export function passwordStrength(password: string): { ok: boolean; reason?: string } {
  const p = password ?? '';
  if (p.length < 8) return { ok: false, reason: 'debe tener al menos 8 caracteres' };
  if (p.length > 128) return { ok: false, reason: 'demasiado larga' };
  const classes =
    (/[a-z]/.test(p) ? 1 : 0) +
    (/[A-Z]/.test(p) ? 1 : 0) +
    (/[0-9]/.test(p) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(p) ? 1 : 0);
  if (classes < 3) {
    return { ok: false, reason: 'debe combinar mayúsculas, minúsculas, dígitos y/o símbolos' };
  }
  return { ok: true };
}
