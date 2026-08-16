/**
 * Puente entre la forma del contrato y la forma antigua que todavía usan las pantallas de terreno.
 *
 * Existe por una sola razón: que el cambio de estado que hace el gestor se vea en el seguimiento
 * del ciudadano hoy, sin obligar a migrar de golpe todas las pantallas. El día que terreno
 * consuma `ReporteDetalle` directamente, este archivo se borra.
 */
import type { TFunction } from 'i18next';
import type { EstadoReporte, EventoCronologia, ReporteDetalle } from '@/shared/types/contrato';
import type { Report, TimelineEvent, TrustLevel } from '@/shared/types';
import type { ExtrasCiudadano } from './useReportesDemo';

/** El contrato solo trae el estado; la cronología antigua además pide un tipo de icono. */
const TIPO_EVENTO_POR_ESTADO: Record<EstadoReporte, TimelineEvent['type']> = {
  Reportado: 'report',
  Verificado: 'verification',
  Asignado: 'action',
  EnAtencion: 'action',
  Atendido: 'resolved',
  Cerrado: 'resolved',
};

function aEventoLegado(evento: EventoCronologia, indice: number, t: TFunction): TimelineEvent {
  return {
    id: `${indice + 1}-${evento.fecha}`,
    date: evento.fecha,
    title: t(`status.${evento.estado}`),
    description: evento.nota,
    type: TIPO_EVENTO_POR_ESTADO[evento.estado],
  };
}

function nivelDeConfianza(detalle: ReporteDetalle): TrustLevel {
  return detalle.verificacionSatelital?.confirmado === true ? 'verificado' : 'autorreportado';
}

/**
 * El gasto público que ve el ciudadano es la suma de los contratos de prevención del municipio.
 * Sin contratos se devuelve `undefined` para que la pantalla oculte el bloque, no muestre un cero
 * que nadie pidió.
 */
function gastoPublico(detalle: ReporteDetalle): number | undefined {
  if (detalle.transparencia.length === 0) {
    return undefined;
  }
  return detalle.transparencia.reduce((suma, contrato) => suma + contrato.valor, 0);
}

/**
 * Convierte un reporte del contrato a la forma antigua.
 *
 * Lo que el contrato no tiene no se inventa: el título es el tipo de emergencia traducido y la
 * última actualización es la fecha del último evento de la cronología.
 *
 * `extras` son los datos que el ciudadano declaró al reportar y que el contrato todavía no
 * transporta. Sin ellos el reporte se asume de testigo, que es lo que el contrato permite afirmar.
 */
export function aReporteLegado(
  detalle: ReporteDetalle,
  t: TFunction,
  extras?: ExtrasCiudadano,
): Report {
  const ultimoEvento = detalle.cronologia[detalle.cronologia.length - 1];

  return {
    id: detalle.codigo,
    type: detalle.tipo,
    reportType: extras?.reportType ?? 'testigo',
    title: t(`emergencyType.${detalle.tipo}`),
    description: detalle.descripcion,
    status: detalle.estado,
    prioridad: detalle.prioridad,
    trustLevel: nivelDeConfianza(detalle),
    location: detalle.direccion ?? detalle.municipio,
    coordinates: { lat: detalle.latitud, lng: detalle.longitud },
    createdAt: detalle.creadoEn,
    updatedAt: ultimoEvento?.fecha ?? detalle.creadoEn,
    imageUrl: detalle.urlFoto ?? undefined,
    satelliteVerified: detalle.verificacionSatelital?.confirmado === true,
    publicSpending: gastoPublico(detalle),
    timeline: detalle.cronologia.map((evento, indice) => aEventoLegado(evento, indice, t)),
    contactPhone: extras?.contactPhone,
    householdSize: extras?.householdSize,
    isHabitable: extras?.isHabitable,
    urgentNeed: extras?.urgentNeed,
  };
}
