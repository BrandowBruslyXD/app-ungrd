/**
 * Tipos del contrato de API (docs/CONTRATO-API.md).
 *
 * Todo lo que el contrato marca como opcional se escribe aquí como `| null` en vez de `?`:
 * así el compilador obliga a decidir qué se muestra cuando el dato no llega, en vez de dejar
 * que la pantalla se caiga en la demo.
 */

/** Roles que viajan en el JWT. */
export type Rol = 'Ciudadano' | 'Gestor' | 'Admin';

/** Tipos de emergencia admitidos por la API. Se envían como texto, nunca como número. */
export type TipoEmergencia =
  | 'Incendio'
  | 'Inundacion'
  | 'Deslizamiento'
  | 'ViaAfectada'
  | 'ColapsoEstructural'
  | 'Otro';

/** Estados del reporte. El flujo solo avanza: Reportado → … → Cerrado. */
export type EstadoReporte =
  | 'Reportado'
  | 'Verificado'
  | 'Asignado'
  | 'EnAtencion'
  | 'Atendido'
  | 'Cerrado';

/** Prioridad asignada al reporte. */
export type Prioridad = 'Baja' | 'Media' | 'Alta';

/** Catálogos listos para recorrer en filtros y selectores. */
export const TIPOS_EMERGENCIA: readonly TipoEmergencia[] = [
  'Incendio',
  'Inundacion',
  'Deslizamiento',
  'ViaAfectada',
  'ColapsoEstructural',
  'Otro',
];

/** Orden oficial del flujo de estados, útil para pintar la cronología. */
export const ESTADOS_REPORTE: readonly EstadoReporte[] = [
  'Reportado',
  'Verificado',
  'Asignado',
  'EnAtencion',
  'Atendido',
  'Cerrado',
];

/** Usuario autenticado tal como lo devuelve `/api/auth/*`. */
export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  municipio: string;
}

/** Respuesta de registro e inicio de sesión. */
export interface SesionAutenticada {
  token: string;
  usuario: Usuario;
}

/**
 * Reporte tal como llega en el listado (`GET /api/reportes`).
 *
 * `distanciaKm` solo viene cuando la consulta mandó `lat` y `lng`; en cualquier otro caso es `null`.
 */
export interface ReporteResumen {
  codigo: string;
  tipo: TipoEmergencia;
  descripcion: string;
  latitud: number;
  longitud: number;
  direccion: string | null;
  municipio: string;
  urlFoto: string | null;
  estado: EstadoReporte;
  prioridad: Prioridad;
  distanciaKm: number | null;
  creadoEn: string;
}

/** Un paso de la cronología del reporte. */
export interface EventoCronologia {
  estado: EstadoReporte;
  nota: string;
  fecha: string;
  responsable: string;
}

/**
 * Verificación contra NASA FIRMS.
 *
 * NASA solo detecta focos de calor: en inundaciones y deslizamientos el detalle llega en `null`
 * y la pantalla oculta el bloque entero, sin mostrar error ni un hueco.
 */
export interface VerificacionSatelital {
  fuente: string;
  confirmado: boolean;
  detalle: string;
  consultadoEn: string;
}

/** Contrato de prevención publicado en SECOP asociado al municipio del reporte. */
export interface ContratoTransparencia {
  objeto: string;
  valor: number;
  anio: number;
  entidad: string;
}

/**
 * Detalle completo (`GET /api/reportes/{codigo}`).
 *
 * `transparencia` puede llegar vacía si SECOP no respondió o no hay contratos: es un caso normal,
 * no un error.
 */
export interface ReporteDetalle {
  codigo: string;
  tipo: TipoEmergencia;
  descripcion: string;
  latitud: number;
  longitud: number;
  direccion: string | null;
  municipio: string;
  urlFoto: string | null;
  estado: EstadoReporte;
  prioridad: Prioridad;
  creadoEn: string;
  reportadoPor: string;
  cronologia: EventoCronologia[];
  verificacionSatelital: VerificacionSatelital | null;
  transparencia: ContratoTransparencia[];
}

/** Conteo de reportes por tipo. El backend siempre manda las seis llaves, aunque valgan cero. */
export type ConteoPorTipo = Record<TipoEmergencia, number>;

/** Resumen para el tablero (`GET /api/estadisticas/resumen`). Sin datos devuelve ceros, no error. */
export interface ResumenEstadisticas {
  porTipo: ConteoPorTipo;
  totalHoy: number;
  atendidos: number;
  porcentajeAtendidos: number;
  tiempoPromedioMinutos: number;
}

/** Filtros admitidos por el listado de reportes. Todos opcionales. */
export interface FiltrosReportes {
  tipo?: TipoEmergencia;
  estado?: EstadoReporte;
  municipio?: string;
  lat?: number;
  lng?: number;
  radioKm?: number;
  limite?: number;
}

/** Cuerpo de `POST /api/reportes`. La foto se sube antes y aquí solo viaja su URL. */
export interface NuevoReporte {
  tipo: TipoEmergencia;
  descripcion: string;
  latitud: number;
  longitud: number;
  direccion?: string;
  municipio: string;
  urlFoto?: string;
}

/** Respuesta de creación: el código es lo único que el ciudadano necesita guardar. */
export interface ReporteCreado {
  codigo: string;
  estado: EstadoReporte;
  creadoEn: string;
}

/** Cuerpo de `PATCH /api/reportes/{codigo}/estado`. */
export interface CambioEstado {
  estado: EstadoReporte;
  nota: string;
}

/** Respuesta del cambio de estado. */
export interface EstadoActualizado {
  codigo: string;
  estado: EstadoReporte;
  actualizadoEn: string;
}
