/**
 * Observación externa: lo que ven otros y nosotros solo consultamos.
 *
 * Un único punto de entrada para el panel del gestor. Todas las funciones de
 * aquí cumplen el mismo contrato, y conviene leerlo una vez:
 *
 * - **Nunca lanzan.** Ante fallo, lentitud o respuesta ilegible devuelven lista
 *   vacía, y quien las llama esconde el bloque. Ningún error técnico en pantalla.
 * - **Cinco segundos de tiempo límite**, siempre.
 * - **Cada resultado trae su hora de observación y su fuente.** No decimos
 *   «tiempo real»: decimos cuándo se observó y quién lo observó. Un satélite de
 *   órbita polar pasa dos veces al día y el dato llega entre una y tres horas
 *   después; USGS es una red sísmica en tierra y sí llega en un minuto.
 */

export {
  RECUADRO_COLOMBIA,
  RECUADRO_ENTORNO_COLOMBIA,
  dentroDe,
  type Recuadro,
} from '@/lib/observacion/colombia';

export { TIEMPO_LIMITE_MS } from '@/lib/observacion/red';

export {
  FUENTE_USGS,
  URL_SISMOS_USGS,
  categoriaDeProfundidad,
  obtenerSismosCercanos,
  type CategoriaProfundidad,
  type SismoObservado,
} from '@/lib/observacion/usgs';

export {
  FUENTE_GDACS,
  RUTA_ALERTAS_GDACS,
  obtenerAlertasColombia,
  type AlertaMultiamenaza,
  type NivelAlerta,
  type TipoAmenaza,
} from '@/lib/observacion/gdacs';
