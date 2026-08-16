/**
 * Interpola plantillas con variables de la conversación.
 * Reemplaza {{var}} y rutas simples {{var.prop.sub}} usando `variables`.
 * Si la ruta no existe, deja cadena vacía.
 *
 * Las claves con prefijo `__` (estado INTERNO del motor: __aiHistory, __nav,
 * __handoverNote...) NUNCA se interpolan: si un texto las referencia, se
 * resuelven a vacío. Evita que el historial o notas internas lleguen al chat.
 */
export function interpolate(
  template: string | undefined | null,
  variables: Record<string, any>,
): string {
  if (template === undefined || template === null) return '';
  return String(template).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path: string) => {
    if (path.startsWith('__') || path.includes('.__')) return '';
    const value = resolvePath(variables, path);
    if (value === undefined || value === null) return '';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
}

/** Resuelve una ruta tipo "var.prop.sub" dentro de un objeto. */
function resolvePath(source: Record<string, any>, path: string): any {
  return path.split('.').reduce<any>((acc, key) => {
    if (acc === undefined || acc === null) return undefined;
    return acc[key];
  }, source);
}

/** Interpola recursivamente strings dentro de un objeto/array (para headers/body HTTP). */
export function interpolateDeep(value: any, variables: Record<string, any>): any {
  if (typeof value === 'string') return interpolate(value, variables);
  if (Array.isArray(value)) return value.map((v) => interpolateDeep(v, variables));
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = interpolateDeep(v, variables);
    return out;
  }
  return value;
}
