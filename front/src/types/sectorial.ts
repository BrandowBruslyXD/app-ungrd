import type { EdanEventType } from '@/types/edan';

/**
 * Los trece sectores del formato oficial **FR-1703-SMD-09**, en el orden en que
 * aparecen sus secciones.
 *
 * La taxonomía no es nuestra: cada sector es una sección del formato que la
 * UNGRD ya usa, y cada sección tiene un ministerio detrás
 * (`docs/REPARTO-SECTORIAL.md`, decisión 8). Inventar categorías propias
 * obligaría a que alguien las tradujera a mano al mandarlas al ministerio, que
 * es justo el trabajo manual que este módulo viene a quitar.
 *
 * Es lista y no solo unión de literales porque hay que recorrerla en tiempo de
 * ejecución: la tabla del reparto muestra **los trece**, incluidos los que van
 * en cero. Agregar uno aquí rompe la compilación en todos los
 * `Record<Sector, …>` hasta completarlos, que es lo que se busca.
 */
export const SECTORES = [
  'Salud',
  'Educacion',
  'Vivienda',
  'AguaYSaneamiento',
  'Energia',
  'Telecomunicaciones',
  'Transporte',
  'Agropecuario',
  'ComercioIndustria',
  'Cultura',
  'Deporte',
  'InclusionSocial',
  'Gobierno',
] as const;

/** Un sector del formato oficial. Determina a qué ministerio le toca el daño. */
export type Sector = (typeof SECTORES)[number];

/**
 * Qué tan comprobado está un dato, según de dónde salió.
 *
 * Viaja pegado al daño hasta el reporte del ministerio y nunca se promedia: un
 * ministerio tiene que poder distinguir «12 viviendas destruidas, verificadas
 * por el CMGRD» de «37 reportes ciudadanos sin verificar». Mezclarlos sin
 * decirlo sería el problema que venimos a resolver (decisión 5).
 */
export const NIVELES_CONFIANZA = ['Autorreportado', 'Censado', 'Verificado'] as const;

/** @see NIVELES_CONFIANZA */
export type NivelConfianza = (typeof NIVELES_CONFIANZA)[number];

/** Las tres fuentes que alimentan el consolidado, de la más rápida a la más confiable. */
export const ORIGENES_DANO = ['ReporteCiudadano', 'RegistroDamnificado', 'CargaEdan'] as const;

/** @see ORIGENES_DANO */
export type OrigenDano = (typeof ORIGENES_DANO)[number];

/** Estado del paquete que se le arma a un ministerio. `Enviado` solo tras firma humana. */
export const ESTADOS_PAQUETE = ['Borrador', 'EnRevision', 'Aprobado', 'Enviado'] as const;

/** @see ESTADOS_PAQUETE */
export type EstadoPaquete = (typeof ESTADOS_PAQUETE)[number];

/**
 * Cuánto sabemos de un municipio afectado.
 *
 * `EnSilencio` no significa «sin daños»: significa que no llegó ni un dato, y
 * probablemente sea el municipio que peor está. Es la señal que hoy no existe
 * en ningún sistema.
 */
export const ESTADOS_COBERTURA = ['ConEdan', 'SoloAutorreportes', 'EnSilencio'] as const;

/** @see ESTADOS_COBERTURA */
export type EstadoCobertura = (typeof ESTADOS_COBERTURA)[number];

/** Gravedad del daño, como la clasifica el formato oficial. */
export const NIVELES_DANO = ['Leve', 'Moderado', 'Grave', 'DestruccionTotal'] as const;

/** @see NIVELES_DANO */
export type NivelDano = (typeof NIVELES_DANO)[number];

/**
 * Quién le puso el sector al daño.
 *
 * `Sugerencia` es la salida de un clasificador sobre texto libre y **nunca
 * entra sola al paquete de un ministerio**: un funcionario la confirma y el
 * daño pasa a `Funcionario` (decisión 6).
 */
export const CLASIFICADORES = ['Regla', 'Sugerencia', 'Funcionario'] as const;

/** @see CLASIFICADORES */
export type ClasificadoPor = (typeof CLASIFICADORES)[number];

/** Figura jurídica que ampara el envío. Sin declaratoria no hay decreto que citar. */
export const DECLARATORIAS = ['Ninguna', 'CalamidadPublica', 'Desastre'] as const;

/** @see DECLARATORIAS */
export type Declaratoria = (typeof DECLARATORIAS)[number];

/** Ámbito de la declaratoria, según quién la firma (ley 1523). */
export const NIVELES_DECLARATORIA = ['Municipal', 'Departamental', 'Nacional'] as const;

/** @see NIVELES_DECLARATORIA */
export type NivelDeclaratoria = (typeof NIVELES_DECLARATORIA)[number];

/** Momento del evento. El reparto sectorial solo tiene sentido mientras no esté `Cerrado`. */
export const ESTADOS_EVENTO = ['Activo', 'EnRecuperacion', 'Cerrado'] as const;

/** @see ESTADOS_EVENTO */
export type EstadoEvento = (typeof ESTADOS_EVENTO)[number];

/**
 * Cómo salió el correo.
 *
 * Hoy siempre `Simulado`, y así se marca en la interfaz: no hay proveedor de
 * correo, y presentar como real un envío que no ocurrió sería engañar
 * (decisión 1).
 */
export const MODOS_ENVIO = ['Simulado', 'Real'] as const;

/** @see MODOS_ENVIO */
export type ModoEnvio = (typeof MODOS_ENVIO)[number];

/** Punto en el mapa, con la misma forma que usa el resto del frontend. */
export interface Coordenadas {
  lat: number;
  lng: number;
}

/**
 * La emergencia declarada. **Es la unidad de agrupación** de todo el módulo:
 * un ministerio pide «lo mío de esta emergencia, desglosado por municipio», no
 * reportes sueltos (decisión 7).
 */
export interface Evento {
  id: string;
  /** Legible y dictable por teléfono: `EVT-2026-08-15-003`. */
  codigo: string;
  nombre: string;
  /** Los 16 del formato oficial; se reusa la lista del EDAN en vez de duplicarla. */
  tipoEvento: EdanEventType;
  declaratoria: Declaratoria;
  /** Solo cuando hay declaratoria. */
  nivelDeclaratoria?: NivelDeclaratoria;
  /** Lo que ampara el envío al ministerio; va citado en el oficio. */
  numeroDecreto?: string;
  /** ISO-8601 en UTC. Contra esta fecha corre el plazo del Plan de Acción Específico. */
  fechaDeclaratoria?: string;
  /** ISO-8601 en UTC. Cuándo ocurrió, que no es cuándo se declaró. */
  fechaEvento: string;
  departamentos: string[];
  estado: EstadoEvento;
  /**
   * Personas afectadas reportadas por las autoridades para el evento completo.
   *
   * No se calcula sumando los daños: un mismo hogar aparece en varios daños
   * (vivienda, agua, energía) y sumarlo lo contaría tres veces.
   */
  personasAfectadas: number;
}

/**
 * Un daño ya etiquetado con su sector. **Es la pieza central del módulo.**
 *
 * `sector` admite `null` a propósito, en vez de un sector «SinSector» de
 * relleno: un valor así se colaría en la tabla de trece filas y en los paquetes
 * de los ministerios. Lo que no tiene sector no es de nadie todavía y vive en
 * la bandeja de sin clasificar hasta que un funcionario lo resuelva.
 */
export interface DanoSectorizado {
  id: string;
  eventoId: string;
  /** `null` mientras ninguna regla haya podido asignarlo. */
  sector: Sector | null;
  origen: OrigenDano;
  /** Identificador del dato original: reporte, registro de damnificado o carga EDAN. */
  origenId: string;
  nivelConfianza: NivelConfianza;
  municipio: string;
  departamento: string;
  descripcion: string;
  cantidad: number;
  /** «viviendas», «km de vía», «sedes educativas»… */
  unidad: string;
  nivel?: NivelDano;
  /** En pesos colombianos. Ausente cuando el dato de origen no lo trae: el módulo no inventa cifras. */
  costoEstimado?: number;
  /** Personas afectadas atribuibles a este daño, cuando el origen las cuenta. */
  personasAfectadas?: number;
  clasificadoPor: ClasificadoPor;
  /**
   * Sectores que el clasificador propone para un daño sin sector.
   *
   * Puede traer más de uno: «se cayó el puente de la vereda y el colegio quedó
   * sin techo» toca `Transporte` **y** `Educacion`.
   */
  sectoresSugeridos?: Sector[];
  /** Nombre del funcionario que confirmó la clasificación. */
  revisadoPor?: string;
  coordenadas?: Coordenadas;
  /** ISO-8601 en UTC. Cuándo entró el dato al consolidado. */
  registradoEn: string;
}

/**
 * Cuánto sabemos de cada municipio afectado.
 *
 * Es el único bloque del panel que habla de lo que **no** llegó. De 1.120
 * municipios del país, 400 afectados y datos de 5: esa cifra sale de aquí.
 */
export interface CoberturaMunicipio {
  municipio: string;
  departamento: string;
  estado: EstadoCobertura;
  /** Reportes ciudadanos recibidos. Cero es lo que define el silencio. */
  reportesRecibidos: number;
  /** ISO-8601 en UTC, o `null` si nunca llegó nada. */
  ultimoDatoEn: string | null;
}

/** Lo que se le arma a un ministerio para un evento. */
export interface PaqueteMinisterio {
  id: string;
  /** `PQT-2026-08-15-0007`. */
  codigo: string;
  eventoId: string;
  sector: Sector;
  /** Nombre oficial de la entidad responsable, copiado del catálogo de sectores. */
  entidad: string;
  /** Dirección de ejemplo mientras no haya proveedor de correo (decisión 9). */
  correoDestino: string;
  totalDanos: number;
  totalMunicipios: number;
  costoEstimadoTotal: number;
  estado: EstadoPaquete;
  /** Nombre del funcionario de la UNGRD que aprobó. **Es la firma humana** (decisión 3). */
  aprobadoPor?: string;
  /** ISO-8601 en UTC. */
  aprobadoEn?: string;
  nombreArchivoCsv?: string;
  nombreArchivoPdf?: string;
}

/** La bitácora. Un envío que no queda registrado no ocurrió. */
export interface EnvioRegistrado {
  id: string;
  paqueteId: string;
  /** Se repite aquí para que la bitácora se lea sin ir a buscar el paquete. */
  sector: Sector;
  entidad: string;
  destinatario: string;
  asunto: string;
  cuerpo: string;
  /** Nombre del funcionario que aprobó y disparó el envío. */
  enviadoPor: string;
  /** ISO-8601 en UTC. */
  enviadoEn: string;
  modo: ModoEnvio;
  /** Nombres de los archivos adjuntos, tal como quedaron descargables. */
  archivos: string[];
}
