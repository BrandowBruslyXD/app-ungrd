/**
 * Comprueba si la persona pidió menos movimiento en su sistema.
 *
 * Con guarda porque `matchMedia` no existe en todos los entornos —jsdom no lo
 * trae, y algunos navegadores embebidos tampoco—. Si no se puede consultar, se
 * asume que sí quiere menos movimiento: es la opción que nunca molesta.
 */
export function prefiereMenosMovimiento(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
