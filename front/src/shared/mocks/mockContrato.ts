/**
 * Datos falsos con la forma exacta del contrato de API (docs/CONTRATO-API.md).
 *
 * Incluye a propósito los escenarios que tumban demos: sin verificación satelital, sin contratos
 * de transparencia, lista vacía y estadísticas en ceros. Si un caso no está aquí, nadie lo prueba.
 */
import type {
  ContratoTransparencia,
  EventoCronologia,
  ReporteDetalle,
  ReporteResumen,
  ResumenEstadisticas,
} from '@/shared/types/contrato';

const CRONOLOGIA_COMPLETA: EventoCronologia[] = [
  {
    estado: 'Reportado',
    nota: 'Reporte recibido',
    fecha: '2026-08-15T14:30:00Z',
    responsable: 'Sistema',
  },
  {
    estado: 'Verificado',
    nota: 'Confirmado por datos satelitales',
    fecha: '2026-08-15T14:40:00Z',
    responsable: 'Sistema',
  },
  {
    estado: 'Asignado',
    nota: 'Asignado a Alcaldía de Bogotá',
    fecha: '2026-08-15T15:00:00Z',
    responsable: 'Carlos M.',
  },
  {
    estado: 'EnAtencion',
    nota: 'Brigada en camino',
    fecha: '2026-08-15T15:30:00Z',
    responsable: 'Carlos M.',
  },
];

const CONTRATOS_BOGOTA: ContratoTransparencia[] = [
  {
    objeto: 'Obras de canalización quebrada La Vieja',
    valor: 450000000,
    anio: 2024,
    entidad: 'Alcaldía de Bogotá',
  },
  {
    objeto: 'Mantenimiento de alcantarillado sector norte',
    valor: 120000000,
    anio: 2023,
    entidad: 'Alcaldía de Bogotá',
  },
];

/** El reporte del pitch: cronología completa, verificación satelital y contratos SECOP. */
export const reporteEstrella: ReporteDetalle = {
  codigo: 'RPT-2026-08-15-0047',
  tipo: 'Inundacion',
  descripcion: 'Se está inundando la vía principal, el agua ya llega a las casas',
  latitud: 4.710989,
  longitud: -74.072092,
  direccion: 'Calle 123 #45-67',
  municipio: 'Bogotá',
  urlFoto: 'https://res.cloudinary.com/demo/image/upload/inundacion.jpg',
  estado: 'EnAtencion',
  prioridad: 'Alta',
  creadoEn: '2026-08-15T14:30:00Z',
  reportadoPor: 'María R.',
  cronologia: CRONOLOGIA_COMPLETA,
  verificacionSatelital: {
    fuente: 'NASA FIRMS',
    confirmado: true,
    detalle: '3 focos de calor detectados a menos de 5 km',
    consultadoEn: '2026-08-15T14:40:00Z',
  },
  transparencia: CONTRATOS_BOGOTA,
};

/**
 * Deslizamiento sin verificación satelital: NASA FIRMS solo ve focos de calor.
 * La pantalla debe ocultar el bloque, no mostrar un hueco ni un error.
 */
export const reporteSinVerificacionSatelital: ReporteDetalle = {
  codigo: 'RPT-2026-08-15-0048',
  tipo: 'Deslizamiento',
  descripcion: 'La ladera se vino sobre la vía y hay dos casas en riesgo',
  latitud: 4.628,
  longitud: -74.115,
  direccion: null,
  municipio: 'Bogotá',
  urlFoto: null,
  estado: 'Asignado',
  prioridad: 'Alta',
  creadoEn: '2026-08-15T12:10:00Z',
  reportadoPor: 'María R.',
  cronologia: [
    {
      estado: 'Reportado',
      nota: 'Reporte recibido',
      fecha: '2026-08-15T12:10:00Z',
      responsable: 'Sistema',
    },
    {
      estado: 'Asignado',
      nota: 'Asignado a Alcaldía de Bogotá',
      fecha: '2026-08-15T12:45:00Z',
      responsable: 'Carlos M.',
    },
  ],
  verificacionSatelital: null,
  transparencia: CONTRATOS_BOGOTA,
};

/** Incendio verificado pero sin contratos SECOP: la lista de transparencia llega vacía. */
export const reporteSinTransparencia: ReporteDetalle = {
  codigo: 'RPT-2026-08-15-0049',
  tipo: 'Incendio',
  descripcion: 'Hay humo denso en el cerro y el fuego avanza hacia las casas',
  latitud: 4.598,
  longitud: -74.03,
  direccion: 'Cerros orientales, sector Monserrate',
  municipio: 'Bogotá',
  urlFoto: null,
  estado: 'Verificado',
  prioridad: 'Media',
  creadoEn: '2026-08-15T09:05:00Z',
  reportadoPor: 'Andrés S.',
  cronologia: [
    {
      estado: 'Reportado',
      nota: 'Reporte recibido',
      fecha: '2026-08-15T09:05:00Z',
      responsable: 'Sistema',
    },
    {
      estado: 'Verificado',
      nota: 'Foco de calor confirmado por NASA FIRMS',
      fecha: '2026-08-15T09:20:00Z',
      responsable: 'Sistema',
    },
  ],
  verificacionSatelital: {
    fuente: 'NASA FIRMS',
    confirmado: true,
    detalle: '1 foco de calor activo a 2 km',
    consultadoEn: '2026-08-15T09:20:00Z',
  },
  transparencia: [],
};

/**
 * Reporte recién creado: un solo evento, sin foto, sin verificación y sin contratos.
 * Es el peor caso para la pantalla de seguimiento y el más común al inicio.
 */
export const reporteRecienCreado: ReporteDetalle = {
  codigo: 'RPT-2026-08-15-0050',
  tipo: 'ViaAfectada',
  descripcion: 'Un árbol cayó y bloquea el carril de subida',
  latitud: 4.667,
  longitud: -74.056,
  direccion: null,
  municipio: 'Bogotá',
  urlFoto: null,
  estado: 'Reportado',
  prioridad: 'Baja',
  creadoEn: '2026-08-15T16:02:00Z',
  reportadoPor: 'María R.',
  cronologia: [
    {
      estado: 'Reportado',
      nota: 'Reporte recibido',
      fecha: '2026-08-15T16:02:00Z',
      responsable: 'Sistema',
    },
  ],
  verificacionSatelital: null,
  transparencia: [],
};

/** Todos los detalles disponibles, indexados por el código público del reporte. */
export const detallesPorCodigo: Record<string, ReporteDetalle> = {
  [reporteEstrella.codigo]: reporteEstrella,
  [reporteSinVerificacionSatelital.codigo]: reporteSinVerificacionSatelital,
  [reporteSinTransparencia.codigo]: reporteSinTransparencia,
  [reporteRecienCreado.codigo]: reporteRecienCreado,
};

/** Convierte un detalle en la forma que devuelve el listado. */
function aResumen(detalle: ReporteDetalle, distanciaKm: number | null = null): ReporteResumen {
  return {
    codigo: detalle.codigo,
    tipo: detalle.tipo,
    descripcion: detalle.descripcion,
    latitud: detalle.latitud,
    longitud: detalle.longitud,
    direccion: detalle.direccion,
    municipio: detalle.municipio,
    urlFoto: detalle.urlFoto,
    estado: detalle.estado,
    prioridad: detalle.prioridad,
    distanciaKm,
    creadoEn: detalle.creadoEn,
  };
}

/** Listado de reportes con la forma de `GET /api/reportes`. */
export const reportesResumen: ReporteResumen[] = [
  aResumen(reporteEstrella, 2.3),
  aResumen(reporteSinVerificacionSatelital, 7.1),
  aResumen(reporteSinTransparencia),
  aResumen(reporteRecienCreado),
];

/** Escenario de lista vacía: municipio sin reportes, filtro sin resultados, primer uso. */
export const reportesVacios: ReporteResumen[] = [];

/** Estadísticas del pitch: 47 reportes hoy, 35 atendidos (74 %), 28 minutos de promedio. */
export const estadisticasResumen: ResumenEstadisticas = {
  porTipo: {
    Incendio: 3,
    Inundacion: 2,
    Deslizamiento: 1,
    ViaAfectada: 0,
    ColapsoEstructural: 0,
    Otro: 0,
  },
  totalHoy: 47,
  atendidos: 35,
  porcentajeAtendidos: 74,
  tiempoPromedioMinutos: 28,
};

/** Estadísticas en ceros: municipio sin actividad. El backend devuelve esto, no un error. */
export const estadisticasEnCeros: ResumenEstadisticas = {
  porTipo: {
    Incendio: 0,
    Inundacion: 0,
    Deslizamiento: 0,
    ViaAfectada: 0,
    ColapsoEstructural: 0,
    Otro: 0,
  },
  totalHoy: 0,
  atendidos: 0,
  porcentajeAtendidos: 0,
  tiempoPromedioMinutos: 0,
};

/** Municipio sin datos, para forzar por filtro la lista vacía y las estadísticas en ceros. */
export const MUNICIPIO_SIN_DATOS = 'Leticia';
