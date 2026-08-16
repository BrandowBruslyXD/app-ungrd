/**
 * Reglas del flujo de estados del contrato de API.
 *
 * Están en su propio archivo, y no dentro del proveedor de reportes, porque las usan los dos
 * lados de la costura: la sala de crisis para ofrecer a dónde puede avanzar un reporte, y el
 * proveedor para rechazar cualquier retroceso que llegue igual.
 */
import { ESTADOS_REPORTE, type EstadoReporte } from '@/shared/types/contrato';

/**
 * Estados a los que un reporte puede avanzar desde el actual.
 *
 * Se puede saltar hacia adelante (de `Reportado` a `Asignado`) pero nunca hacia atrás, así que
 * un reporte en `Cerrado` devuelve una lista vacía.
 */
export function estadosSiguientes(actual: EstadoReporte): EstadoReporte[] {
  const posicion = ESTADOS_REPORTE.indexOf(actual);
  if (posicion === -1) {
    return [];
  }
  return [...ESTADOS_REPORTE.slice(posicion + 1)];
}

/** Un avance solo es válido si el estado destino está más adelante en el flujo. */
export function puedeAvanzar(desde: EstadoReporte, hacia: EstadoReporte): boolean {
  const origen = ESTADOS_REPORTE.indexOf(desde);
  const destino = ESTADOS_REPORTE.indexOf(hacia);
  if (origen === -1 || destino === -1) {
    return false;
  }
  return destino > origen;
}
