/**
 * Acceso a los reportes.
 *
 * Todas las funciones nuevas son asíncronas y devuelven exactamente la forma del contrato de API,
 * aunque hoy respondan con mocks: así conectar el backend real no obliga a tocar ninguna pantalla.
 * Con mocks se simula latencia para que los estados de carga se puedan ver y probar.
 */
import type { Alert, AidCategory, Report } from '@/shared/types';
import type {
  CambioEstado,
  EstadoActualizado,
  FiltrosReportes,
  NuevoReporte,
  ReporteCreado,
  ReporteDetalle,
  ReporteResumen,
  ResumenEstadisticas,
} from '@/shared/types/contrato';
import { mockAidCategories, mockAlerts, mockReports } from '@/shared/mocks/mock';
import {
  detallesPorCodigo,
  estadisticasEnCeros,
  estadisticasResumen,
  reportesResumen,
} from '@/shared/mocks/mockContrato';
import { apiFetch, ErrorApi } from './client';

/** Con mocks encendidos la app funciona completa sin backend. Se apaga con `VITE_USAR_MOCKS=false`. */
export const USAR_MOCKS: boolean = (import.meta.env.VITE_USAR_MOCKS ?? 'true') !== 'false';

/** Latencia simulada de los mocks: sin ella los estados de carga nunca se ven ni se prueban. */
export const LATENCIA_MOCK_MS = 400;

function conLatencia<T>(valor: T): Promise<T> {
  return new Promise((resolver) => {
    setTimeout(() => resolver(valor), LATENCIA_MOCK_MS);
  });
}

function fallarConLatencia(error: ErrorApi): Promise<never> {
  return new Promise((_resolver, rechazar) => {
    setTimeout(() => rechazar(error), LATENCIA_MOCK_MS);
  });
}

function construirConsulta(filtros: FiltrosReportes): string {
  const parametros = new URLSearchParams();
  if (filtros.tipo !== undefined) parametros.set('tipo', filtros.tipo);
  if (filtros.estado !== undefined) parametros.set('estado', filtros.estado);
  if (filtros.municipio !== undefined) parametros.set('municipio', filtros.municipio);
  if (filtros.lat !== undefined) parametros.set('lat', String(filtros.lat));
  if (filtros.lng !== undefined) parametros.set('lng', String(filtros.lng));
  if (filtros.radioKm !== undefined) parametros.set('radioKm', String(filtros.radioKm));
  if (filtros.limite !== undefined) parametros.set('limite', String(filtros.limite));
  const consulta = parametros.toString();
  return consulta === '' ? '' : `?${consulta}`;
}

function filtrarMocks(filtros: FiltrosReportes): ReporteResumen[] {
  const encontrados = reportesResumen.filter((reporte) => {
    if (filtros.tipo !== undefined && reporte.tipo !== filtros.tipo) return false;
    if (filtros.estado !== undefined && reporte.estado !== filtros.estado) return false;
    if (
      filtros.municipio !== undefined &&
      reporte.municipio.toLowerCase() !== filtros.municipio.toLowerCase()
    ) {
      return false;
    }
    return true;
  });
  return filtros.limite === undefined ? encontrados : encontrados.slice(0, filtros.limite);
}

/** `GET /api/reportes`. Devuelve lista vacía cuando ningún reporte cumple los filtros. */
export function listarReportes(filtros: FiltrosReportes = {}): Promise<ReporteResumen[]> {
  if (USAR_MOCKS) {
    return conLatencia(filtrarMocks(filtros));
  }
  return apiFetch<ReporteResumen[]>(`/reportes${construirConsulta(filtros)}`);
}

/** `GET /api/reportes/mios`. Requiere sesión iniciada. */
export function listarMisReportes(): Promise<ReporteResumen[]> {
  if (USAR_MOCKS) {
    return conLatencia(filtrarMocks({}));
  }
  return apiFetch<ReporteResumen[]>('/reportes/mios');
}

/**
 * `GET /api/reportes/{codigo}`.
 *
 * @throws {ErrorApi} con `estado` 404 cuando el código no existe.
 */
export function obtenerReporte(codigo: string): Promise<ReporteDetalle> {
  if (USAR_MOCKS) {
    const detalle = detallesPorCodigo[codigo];
    if (detalle === undefined) {
      return fallarConLatencia(new ErrorApi(404, `No existe el reporte ${codigo}`));
    }
    return conLatencia(detalle);
  }
  return apiFetch<ReporteDetalle>(`/reportes/${encodeURIComponent(codigo)}`);
}

/** `POST /api/reportes`. Devuelve el código que el ciudadano usará para hacer seguimiento. */
export function crearReporte(nuevo: NuevoReporte): Promise<ReporteCreado> {
  if (USAR_MOCKS) {
    return conLatencia<ReporteCreado>({
      codigo: `RPT-2026-08-15-${String(reportesResumen.length + 51).padStart(4, '0')}`,
      estado: 'Reportado',
      creadoEn: new Date().toISOString(),
    });
  }
  return apiFetch<ReporteCreado>('/reportes', {
    method: 'POST',
    body: JSON.stringify(nuevo),
  });
}

/**
 * `PATCH /api/reportes/{codigo}/estado`.
 *
 * Con mocks solo confirma el cambio: mantener el estado compartido entre pantallas es parte de la
 * migración de cada pantalla, no de esta capa.
 */
export function cambiarEstadoReporte(
  codigo: string,
  cambio: CambioEstado,
): Promise<EstadoActualizado> {
  if (USAR_MOCKS) {
    return conLatencia<EstadoActualizado>({
      codigo,
      estado: cambio.estado,
      actualizadoEn: new Date().toISOString(),
    });
  }
  return apiFetch<EstadoActualizado>(`/reportes/${encodeURIComponent(codigo)}/estado`, {
    method: 'PATCH',
    body: JSON.stringify(cambio),
  });
}

/** `GET /api/estadisticas/resumen`. Sin datos devuelve ceros, nunca un error. */
export function obtenerResumenEstadisticas(
  filtros: Pick<FiltrosReportes, 'municipio' | 'lat' | 'lng' | 'radioKm'> = {},
): Promise<ResumenEstadisticas> {
  if (USAR_MOCKS) {
    const hayDatos = filtrarMocks({ municipio: filtros.municipio }).length > 0;
    return conLatencia(hayDatos ? estadisticasResumen : estadisticasEnCeros);
  }
  return apiFetch<ResumenEstadisticas>(`/estadisticas/resumen${construirConsulta(filtros)}`);
}

/** @deprecated Usar `listarReportes`, que es asíncrona y devuelve `ReporteResumen[]`. */
export function listReportes(): Report[] {
  return mockReports;
}

/** @deprecated Usar `obtenerReporte`, que busca por `codigo` y devuelve `ReporteDetalle`. */
export function getReporte(id: string): Report | undefined {
  return mockReports.find((report) => report.id === id);
}

/** @deprecated Usar `listarMisReportes`. */
export function listMisReportes(): Report[] {
  return mockReports;
}

/** @deprecated Las alertas todavía no están en el contrato de API. */
export function listAlertas(): Alert[] {
  return mockAlerts;
}

/** @deprecated El directorio de ayudas todavía no está en el contrato de API. */
export function listAyudas(): AidCategory[] {
  return mockAidCategories;
}
