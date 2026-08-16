import type {
  Report,
  ReportStatus,
  EmergencyType,
  Prioridad,
  TimelineEvent,
  TrustLevel,
} from '@/types';

/**
 * Traduce lo que responde el backend a los tipos que ya usan las pantallas.
 *
 * Existe para que conectar la API no obligue a tocar ni un componente. El
 * backend habla en español —`codigo`, `estado`, `cronologia`— y las vistas se
 * escribieron contra `Report`, con `id`, `status` y `timeline`. Traducir en un
 * solo sitio es más barato que renombrar cuarenta usos, y deja el punto exacto
 * donde mirar cuando el contrato cambie.
 *
 * Todo lo que el backend no manda todavía se rellena con un valor honesto: la
 * verificación satelital es `false` mientras no exista el campo, nunca un
 * inventado que la pantalla presente como cierto.
 */

/** Forma de un reporte en el listado (`GET /api/reportes`). */
export interface ReporteApi {
  codigo: string;
  tipo: string;
  descripcion: string;
  latitud: number | null;
  longitud: number | null;
  direccion: string | null;
  municipio: string;
  urlFoto: string | null;
  estado: string;
  prioridad: string;
  canal: string;
  distanciaKm?: number | null;
  creadoEn: string;
}

/** Un paso de la cronología, tal como lo devuelve el detalle. */
export interface EventoApi {
  estado: string;
  nota: string;
  fecha: string;
  responsable: string;
}

/** Forma del detalle (`GET /api/reportes/{codigo}`). */
export interface ReporteDetalleApi extends ReporteApi {
  reportadoPor?: string | null;
  cronologia?: EventoApi[];
}

/*
 * El backend manda los estados en PascalCase sin espacios (`EnAtencion`) y el
 * frontend los usa igual, así que la conversión es directa. Se valida de todos
 * modos: si algún día llega un estado nuevo, es mejor mostrarlo como «Reportado»
 * que dejar la pantalla en blanco por una llave que no existe.
 */
const ESTADOS: readonly ReportStatus[] = [
  'Reportado',
  'Verificado',
  'Asignado',
  'EnAtencion',
  'Atendido',
  'Cerrado',
];

const PRIORIDADES: readonly Prioridad[] = ['Baja', 'Media', 'Alta'];

function comoEstado(valor: string): ReportStatus {
  return ESTADOS.includes(valor as ReportStatus) ? (valor as ReportStatus) : 'Reportado';
}

function comoPrioridad(valor: string): Prioridad {
  return PRIORIDADES.includes(valor as Prioridad) ? (valor as Prioridad) : 'Media';
}

/**
 * Qué tan respaldado está el dato.
 *
 * Se deriva del estado porque el backend todavía no expone `Confianza`: un
 * reporte que una entidad ya verificó en terreno no puede seguir mostrándose
 * como «autorreportado», que es justo lo que la escalera de confianza le explica
 * al ciudadano.
 */
function comoConfianza(estado: ReportStatus): TrustLevel {
  return estado === 'Reportado' ? 'autorreportado' : 'verificado';
}

/** Cada estado pinta un icono distinto en la cronología. */
const TIPO_DE_EVENTO: Record<ReportStatus, TimelineEvent['type']> = {
  Reportado: 'report',
  Verificado: 'verification',
  Asignado: 'action',
  EnAtencion: 'action',
  Atendido: 'resolved',
  Cerrado: 'resolved',
};

/**
 * El título de la tarjeta.
 *
 * El backend no tiene campo de título: guarda una descripción larga, y el bot le
 * concatena cosas como «| Nivel de daño: Destruida». Se corta por esa barra y se
 * toma la primera línea, que es lo que la persona escribió de verdad.
 */
function comoTitulo(descripcion: string, tipo: EmergencyType): string {
  const primeraLinea = descripcion.split('|')[0].split('\n')[0].trim();
  return primeraLinea.slice(0, 80) || tipo;
}

/** Convierte un reporte del listado. */
export function aReporte(api: ReporteApi): Report {
  const estado = comoEstado(api.estado);
  const tipo = api.tipo as EmergencyType;

  return {
    id: api.codigo,
    type: tipo,
    /*
     * El backend sí lo sabe —`Clase` distingue afectación propia de aviso sobre
     * un evento— pero todavía no lo expone en la respuesta. Mientras tanto se
     * asume «testigo», que es lo prudente: dar por afectado a quien solo dio
     * aviso le mostraría la advertencia del censo de damnificados sin que le
     * corresponda.
     *
     * Cuando el contrato exponga `clase`, se mapea aquí y en ningún otro sitio.
     */
    reportType: 'testigo',
    title: comoTitulo(api.descripcion, tipo),
    description: api.descripcion,
    status: estado,
    prioridad: comoPrioridad(api.prioridad),
    trustLevel: comoConfianza(estado),
    location: [api.direccion, api.municipio].filter(Boolean).join(', ') || api.municipio,
    // Sin GPS —los reportes de WhatsApp y teléfono no lo traen— se deja en cero
    // y el mapa decide si lo pinta. Inventar coordenadas pondría una chincheta
    // falsa sobre un municipio que no es.
    coordinates: { lat: api.latitud ?? 0, lng: api.longitud ?? 0 },
    createdAt: api.creadoEn,
    updatedAt: api.creadoEn,
    imageUrl: api.urlFoto ?? undefined,
    satelliteVerified: false,
    timeline: [],
  };
}

/** Convierte el detalle, que sí trae la cronología. */
export function aReporteDetalle(api: ReporteDetalleApi): Report {
  const base = aReporte(api);
  const eventos = api.cronologia ?? [];

  return {
    ...base,
    // La última fecha de la cronología es cuándo se movió por última vez.
    updatedAt: eventos.length ? eventos[eventos.length - 1].fecha : base.createdAt,
    timeline: eventos.map((evento, indice) => {
      const estado = comoEstado(evento.estado);
      return {
        id: `${api.codigo}-${indice}`,
        date: evento.fecha,
        title: ETIQUETA_ESTADO[estado],
        description: evento.nota,
        type: TIPO_DE_EVENTO[estado],
      };
    }),
  };
}

/*
 * Se escriben aquí y no se traducen con i18n porque viajan dentro de `Report`,
 * que es un dato y no un componente. La pantalla que los pinta ya está en
 * español; el día que haya otro idioma, este mapa se reemplaza por una llave.
 */
const ETIQUETA_ESTADO: Record<ReportStatus, string> = {
  Reportado: 'Reporte recibido',
  Verificado: 'Verificado por la entidad',
  Asignado: 'Asignado a un equipo',
  EnAtencion: 'En atención',
  Atendido: 'Atendido',
  Cerrado: 'Caso cerrado',
};
