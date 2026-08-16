/**
 * Tipos del reparto sectorial (docs/REPARTO-SECTORIAL.md).
 *
 * Viven dentro de la experiencia de sala porque hoy solo los usa el panel de la UNGRD.
 * El día que otra experiencia los necesite, suben a `shared/types`.
 *
 * Lo opcional se escribe como `| null` y no con `?`: así el compilador obliga a decidir
 * qué se muestra cuando el dato no llega, en vez de dejar un hueco en la pantalla.
 */

/** Los trece sectores del formato oficial FR-1703-SMD-09. No inventamos taxonomía. */
export type Sector =
  | 'Salud'
  | 'Educacion'
  | 'Vivienda'
  | 'AguaYSaneamiento'
  | 'Energia'
  | 'Telecomunicaciones'
  | 'Transporte'
  | 'Agropecuario'
  | 'ComercioIndustria'
  | 'Cultura'
  | 'Deporte'
  | 'InclusionSocial'
  | 'Gobierno';

/**
 * De cuánto se puede fiar el ministerio de cada dato.
 *
 * Es la distinción que sostiene la credibilidad del módulo: mezclar un autorreporte
 * con un dato verificado sin decirlo sería el problema que venimos a resolver.
 */
export type NivelConfianza = 'Autorreportado' | 'Censado' | 'Verificado';

/** Orden de menor a mayor confianza, para pintar la barra de composición siempre igual. */
export const NIVELES_CONFIANZA: readonly NivelConfianza[] = [
  'Verificado',
  'Censado',
  'Autorreportado',
];

/** Quién generó el dato. Cada origen produce un nivel de confianza distinto. */
export type OrigenDano = 'ReporteCiudadano' | 'RegistroDamnificado' | 'CargaEdan';

/** Gravedad del daño. Un reporte ciudadano no la trae: llega en `null`. */
export type NivelDano = 'Leve' | 'Moderado' | 'Grave' | 'DestruccionTotal';

/** Estados del paquete. El envío nunca es automático: pasa por `Aprobado`. */
export type EstadoPaquete = 'Borrador' | 'EnRevision' | 'Aprobado' | 'Enviado';

/** Declaratoria que ampara el envío, según la ley 1523. */
export type Declaratoria = 'Ninguna' | 'CalamidadPublica' | 'Desastre';

/** Alcance de la declaratoria. */
export type NivelDeclaratoria = 'Municipal' | 'Departamental' | 'Nacional';

/** La emergencia declarada: es la unidad de agrupación con la que pide el ministerio. */
export interface EventoPaquete {
  codigo: string;
  nombre: string;
  declaratoria: Declaratoria;
  nivelDeclaratoria: NivelDeclaratoria | null;
  numeroDecreto: string | null;
  fechaDeclaratoria: string | null;
}

/** Un daño ya etiquetado con su sector, con la traza hasta el dato original. */
export interface DanoSectorizado {
  id: string;
  origen: OrigenDano;
  /** Código del reporte, del censo o de la carga EDAN de la que salió. */
  origenCodigo: string;
  nivelConfianza: NivelConfianza;
  municipio: string;
  departamento: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  nivel: NivelDano | null;
  /** En pesos. `null` cuando el dato de origen no permite estimarlo: no se inventa. */
  costoEstimado: number | null;
  latitud: number;
  longitud: number;
  fecha: string;
}

/** Fila de la tabla con la que cierra cada bloque sectorial del formato oficial. */
export interface NecesidadPaquete {
  id: string;
  necesidad: string;
  elementos: string;
  costoEstimado: number;
}

/** Lo que se le arma a un ministerio para un evento. */
export interface PaqueteMinisterio {
  codigo: string;
  sector: Sector;
  entidad: string;
  /** Dirección de ejemplo: jamás el correo real de un ministerio. */
  correoDestino: string;
  estado: EstadoPaquete;
  evento: EventoPaquete;
  danos: DanoSectorizado[];
  necesidades: NecesidadPaquete[];
  /** Fecha del envío simulado; `null` mientras no se haya aprobado. */
  enviadoEn: string | null;
}

/** Totales de un municipio dentro del paquete: es como el ministerio pide la información. */
export interface TotalMunicipio {
  municipio: string;
  departamento: string;
  danos: number;
  costoEstimado: number;
  porConfianza: Record<NivelConfianza, number>;
}

/** Lo primero que el funcionario necesita ver: cuánto hay y de qué confianza. */
export interface ResumenPaquete {
  totalDanos: number;
  totalMunicipios: number;
  costoEstimadoTotal: number;
  /** Cuántos daños no traen costo: el total de arriba se lee distinto si son muchos. */
  danosSinCosto: number;
  porConfianza: Record<NivelConfianza, number>;
  totalesPorMunicipio: TotalMunicipio[];
  costoNecesidades: number;
}
