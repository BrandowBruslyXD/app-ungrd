/**
 * Utilidades de normalización de texto compartidas por el motor y los canales.
 */

/**
 * Normaliza texto para comparaciones tolerantes: trim + minúsculas + sin
 * diacríticos (NFD). No altera el contenido semántico.
 */
export function normalizeText(text: string | undefined | null): string {
  return (text ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Normaliza un identificador telefónico de WhatsApp a solo dígitos:
 * quita el prefijo 'whatsapp:', el sufijo '@dominio' y todo carácter no
 * numérico (incluido '+'). Devuelve cadena vacía si no hay dígitos.
 */
export function digitsOnly(phone: string | undefined | null): string {
  if (!phone) return '';
  return String(phone)
    .replace(/^whatsapp:/i, '')
    .split('@')[0]
    .replace(/\D/g, '');
}
