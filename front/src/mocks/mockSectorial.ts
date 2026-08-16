import { CATALOGO_SECTORES } from '@/lib/catalogoSectores';
import { agruparPorSector, componerCorreo, nombreArchivoCsv } from '@/lib/sectorial';
import { SECTORES } from '@/types/sectorial';
import type {
  CoberturaMunicipio,
  DanoSectorizado,
  EnvioRegistrado,
  EstadoPaquete,
  Evento,
  PaqueteMinisterio,
  Sector,
} from '@/types/sectorial';

/**
 * Datos sembrados del reparto sectorial: **cuatro desastres**, no uno.
 *
 * Con un solo evento el módulo se lee como la pantalla de un caso particular.
 * El trabajo de la UNGRD es repartir varios a la vez, y cada uno llega en un
 * momento distinto del ciclo: uno recién declarado del que casi no hay datos,
 * uno viejo con casi todo remitido, y uno que ni siquiera tiene decreto que
 * ampare un envío. Esas cuatro situaciones puestas en una lista son el módulo.
 *
 * Todo es inventado: los municipios existen y los departamentos también, pero
 * los eventos, los decretos, las cifras y los nombres de los funcionarios no.
 * No hay un solo documento de identidad, ni siquiera de prueba: el repositorio
 * es público y una cédula subida aquí queda en el historial de Git para siempre
 * (`CLAUDE.md`, Ley 1581).
 *
 * Las cifras del panel no se escriben a mano en ningún sitio: salen de contar
 * estos daños con las funciones de `@/lib/sectorial`. Sembrar totales aparte es
 * la forma segura de que un día dejen de coincidir con el detalle que los
 * sustenta, y aquí el detalle es lo que se le manda a un ministerio.
 *
 * Los nombres históricos (`mockEvento`, `mockDanos`, `mockCobertura`,
 * `mockPaquetes`, `mockEnvios`) se conservan y apuntan al primer evento. Lo que
 * necesite trabajar con varios usa las funciones de acceso del final del
 * archivo, que no obligan a filtrar por `eventoId` en cada pantalla.
 */

/*
 * ───────────────────────────────────────────────────────────────────────────
 *  Piezas compartidas
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Coordenadas aproximadas de las cabeceras municipales, para los mapas.
 *
 * Solo están las de los municipios que aportan algún daño: pintar un punto
 * sobre un municipio en silencio sería dibujar información que no existe.
 */
const COORDENADAS: Record<string, { lat: number; lng: number }> = {
  // Córdoba y Sucre — inundaciones del bajo San Jorge
  Montería: { lat: 8.7479, lng: -75.8814 },
  Cereté: { lat: 8.8853, lng: -75.7911 },
  Lorica: { lat: 9.2397, lng: -75.814 },
  'San Marcos': { lat: 8.6614, lng: -75.1319 },
  'Ciénaga de Oro': { lat: 8.8783, lng: -75.6222 },
  Ayapel: { lat: 8.3131, lng: -75.1394 },
  Montelíbano: { lat: 7.9744, lng: -75.4181 },
  'Planeta Rica': { lat: 8.4083, lng: -75.5844 },
  Tierralta: { lat: 8.1719, lng: -76.0594 },
  Majagual: { lat: 8.5386, lng: -74.6244 },
  Caimito: { lat: 8.7906, lng: -75.1156 },

  // Quindío y Risaralda — sismo de la cordillera Central
  Calarcá: { lat: 4.5222, lng: -75.6444 },
  Armenia: { lat: 4.5339, lng: -75.6811 },
  Salento: { lat: 4.6372, lng: -75.5703 },
  Circasia: { lat: 4.6172, lng: -75.6353 },
  'Santa Rosa de Cabal': { lat: 4.8694, lng: -75.6214 },

  // Santander — incendio forestal de la mesa de Los Santos
  'Los Santos': { lat: 6.755, lng: -73.1025 },
  Piedecuesta: { lat: 6.995, lng: -73.05 },
  Girón: { lat: 7.0703, lng: -73.1697 },
  Aratoca: { lat: 6.6947, lng: -73.0158 },
  Curití: { lat: 6.6053, lng: -73.07 },

  // Nariño — deslizamientos de la cordillera nariñense
  Samaniego: { lat: 1.335, lng: -77.595 },
  Ricaurte: { lat: 1.2131, lng: -77.9997 },
  Mallama: { lat: 1.1414, lng: -77.8656 },
  Túquerres: { lat: 1.0872, lng: -77.6183 },
};

/** Lo que cambia de un daño a otro. El resto lo completa el constructor del evento. */
type SemillaDano = Omit<DanoSectorizado, 'id' | 'eventoId' | 'departamento' | 'coordenadas'>;

/** Un envío ya registrado en la bitácora, antes de componerle el correo. */
interface SemillaEnvio {
  sector: Sector;
  por: string;
  en: string;
}

/**
 * Todo lo que define un desastre sembrado.
 *
 * `ultimoDatoEn` del evento no se escribe aquí: se calcula del dato más
 * reciente de su cobertura. Es la cifra que la lista usa para decir «este lleva
 * seis días sin recibir nada», y escrita a mano se desincroniza en la primera
 * edición.
 */
interface SemillaEventoCompleto {
  evento: Omit<Evento, 'ultimoDatoEn'>;
  /** Prefijo de los identificadores de daño. Único por evento. */
  prefijoDano: string;
  /** Fecha de corte que va en los códigos de paquete y de envío: `2026-08-15`. */
  fechaCorte: string;
  cobertura: readonly CoberturaMunicipio[];
  danos: readonly SemillaDano[];
  /**
   * Estado de los paquetes que no están en borrador.
   *
   * Lo que no se nombre queda en `Borrador`, que es donde nace un paquete: un
   * sector sin daños jamás debería figurar como remitido a su ministerio.
   */
  estados?: Partial<Record<Sector, EstadoPaquete>>;
  /** Quién firmó y cuándo. Solo llevan firma los paquetes aprobados o enviados. */
  firmas?: Partial<Record<Sector, { por: string; en: string }>>;
  envios?: readonly SemillaEnvio[];
}

/** Un desastre ya armado, con sus cinco colecciones coherentes entre sí. */
interface DatosEvento {
  evento: Evento;
  cobertura: CoberturaMunicipio[];
  danos: DanoSectorizado[];
  paquetes: PaqueteMinisterio[];
  envios: EnvioRegistrado[];
}

/*
 * ───────────────────────────────────────────────────────────────────────────
 *  Evento 1 — Inundaciones del bajo San Jorge (Córdoba y Sucre)
 *
 *  Desastre departamental declarado, el caso completo: 24 municipios, 60 daños
 *  y la bitácora con tres envíos. Es el que sostiene las pruebas del módulo.
 * ───────────────────────────────────────────────────────────────────────────
 */

const EVENTO_ID = 'EVT-2026-08-15-003';

/*
 * Coherencia territorial que sostiene el panel entero, y que las pruebas
 * vigilan en los cuatro eventos:
 *
 *   · Un municipio `EnSilencio` no tiene ni un daño. Si tuviera, no estaría en
 *     silencio, y el subpanel de cobertura estaría mintiendo justo en lo único
 *     que ningún otro sistema muestra.
 *   · Un municipio `SoloAutorreportes` solo aporta daños `Autorreportado`. En
 *     cuanto alguien verifica en terreno, deja de ser autorreporte.
 *   · Los daños `Verificado` y `Censado` salen únicamente de municipios que ya
 *     mandaron su EDAN o recibieron brigada.
 *
 * Y la proporción es la del problema real: trece municipios callados contra
 * cuatro con formato completo.
 */
const COBERTURA_SAN_JORGE: readonly CoberturaMunicipio[] = [
  {
    municipio: 'Montería',
    departamento: 'Córdoba',
    estado: 'ConEdan',
    reportesRecibidos: 46,
    ultimoDatoEn: '2026-08-15T13:10:00Z',
  },
  {
    municipio: 'Cereté',
    departamento: 'Córdoba',
    estado: 'ConEdan',
    reportesRecibidos: 31,
    ultimoDatoEn: '2026-08-15T11:40:00Z',
  },
  {
    municipio: 'Lorica',
    departamento: 'Córdoba',
    estado: 'ConEdan',
    reportesRecibidos: 27,
    ultimoDatoEn: '2026-08-14T22:05:00Z',
  },
  {
    municipio: 'San Marcos',
    departamento: 'Sucre',
    estado: 'ConEdan',
    reportesRecibidos: 19,
    ultimoDatoEn: '2026-08-15T09:25:00Z',
  },
  {
    municipio: 'Ciénaga de Oro',
    departamento: 'Córdoba',
    estado: 'SoloAutorreportes',
    reportesRecibidos: 14,
    ultimoDatoEn: '2026-08-15T08:50:00Z',
  },
  {
    municipio: 'Ayapel',
    departamento: 'Córdoba',
    estado: 'SoloAutorreportes',
    reportesRecibidos: 22,
    ultimoDatoEn: '2026-08-15T12:15:00Z',
  },
  {
    municipio: 'Montelíbano',
    departamento: 'Córdoba',
    estado: 'SoloAutorreportes',
    reportesRecibidos: 11,
    ultimoDatoEn: '2026-08-14T19:30:00Z',
  },
  {
    municipio: 'Planeta Rica',
    departamento: 'Córdoba',
    estado: 'SoloAutorreportes',
    reportesRecibidos: 9,
    ultimoDatoEn: '2026-08-14T17:45:00Z',
  },
  {
    municipio: 'Tierralta',
    departamento: 'Córdoba',
    estado: 'SoloAutorreportes',
    reportesRecibidos: 7,
    ultimoDatoEn: '2026-08-14T16:00:00Z',
  },
  {
    municipio: 'Majagual',
    departamento: 'Sucre',
    estado: 'SoloAutorreportes',
    reportesRecibidos: 13,
    ultimoDatoEn: '2026-08-15T07:20:00Z',
  },
  {
    municipio: 'Caimito',
    departamento: 'Sucre',
    estado: 'SoloAutorreportes',
    reportesRecibidos: 6,
    ultimoDatoEn: '2026-08-14T14:10:00Z',
  },
  {
    municipio: 'San Pelayo',
    departamento: 'Córdoba',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Momil',
    departamento: 'Córdoba',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Purísima',
    departamento: 'Córdoba',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Chimá',
    departamento: 'Córdoba',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Cotorra',
    departamento: 'Córdoba',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Pueblo Nuevo',
    departamento: 'Córdoba',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Buenavista',
    departamento: 'Córdoba',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'La Apartada',
    departamento: 'Córdoba',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Valencia',
    departamento: 'Córdoba',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'San Bernardo del Viento',
    departamento: 'Córdoba',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Guaranda',
    departamento: 'Sucre',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Sucre',
    departamento: 'Sucre',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Sincé',
    departamento: 'Sucre',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
];

/**
 * Los daños del bajo San Jorge, ya etiquetados con su sector.
 *
 * Cubren doce de los trece sectores: **Deporte no tiene ni uno**, y es a
 * propósito. Que al Ministerio del Deporte no le toque nada de esta emergencia
 * es información, y la pantalla tiene que poder decirlo en lugar de esconder la
 * fila.
 */
const DANOS_SAN_JORGE: readonly SemillaDano[] = [
  // ── Vivienda ────────────────────────────────────────────────────────────
  {
    sector: 'Vivienda',
    origen: 'CargaEdan',
    origenId: 'EDAN-MON-014',
    nivelConfianza: 'Verificado',
    municipio: 'Montería',
    descripcion: 'Viviendas destruidas por creciente del río Sinú en el barrio Cantaclaro',
    cantidad: 64,
    unidad: 'viviendas',
    nivel: 'DestruccionTotal',
    costoEstimado: 2_880_000_000,
    personasAfectadas: 241,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-08T21:25:00Z',
  },
  {
    sector: 'Vivienda',
    origen: 'CargaEdan',
    origenId: 'EDAN-MON-015',
    nivelConfianza: 'Verificado',
    municipio: 'Montería',
    descripcion: 'Viviendas averiadas con afectación de techos y pisos en Mocarí',
    cantidad: 187,
    unidad: 'viviendas',
    nivel: 'Moderado',
    costoEstimado: 1_310_000_000,
    personasAfectadas: 702,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-08T20:25:00Z',
  },
  {
    sector: 'Vivienda',
    origen: 'RegistroDamnificado',
    origenId: 'CEN-CER-0031',
    nivelConfianza: 'Censado',
    municipio: 'Cereté',
    descripcion: 'Viviendas de la vereda Retiro de los Indios con lámina de agua sobre el piso',
    cantidad: 42,
    unidad: 'viviendas',
    nivel: 'Grave',
    costoEstimado: 640_000_000,
    personasAfectadas: 158,
    clasificadoPor: 'Regla',
    revisadoPor: 'Marcela Ibáñez Rueda',
    registradoEn: '2026-08-08T06:55:00Z',
  },
  {
    sector: 'Vivienda',
    origen: 'RegistroDamnificado',
    origenId: 'CEN-LOR-0012',
    nivelConfianza: 'Censado',
    municipio: 'Lorica',
    descripcion: 'Viviendas palafíticas colapsadas en la ciénaga grande del bajo Sinú',
    cantidad: 23,
    unidad: 'viviendas',
    nivel: 'DestruccionTotal',
    costoEstimado: 810_000_000,
    personasAfectadas: 96,
    clasificadoPor: 'Regla',
    revisadoPor: 'Marcela Ibáñez Rueda',
    registradoEn: '2026-08-08T17:55:00Z',
  },
  {
    sector: 'Vivienda',
    origen: 'CargaEdan',
    origenId: 'EDAN-SMA-006',
    nivelConfianza: 'Verificado',
    municipio: 'San Marcos',
    descripcion: 'Viviendas averiadas en el casco urbano por desbordamiento del San Jorge',
    cantidad: 118,
    unidad: 'viviendas',
    nivel: 'Moderado',
    costoEstimado: 720_000_000,
    personasAfectadas: 430,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-08T18:15:00Z',
  },
  {
    sector: 'Vivienda',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-AYA-7X4K',
    nivelConfianza: 'Autorreportado',
    municipio: 'Ayapel',
    descripcion: 'Casas inundadas hasta la mitad de la pared en el barrio La Esperanza',
    cantidad: 30,
    unidad: 'viviendas',
    nivel: 'Grave',
    personasAfectadas: 110,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-08T17:35:00Z',
  },
  {
    sector: 'Vivienda',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-MAJ-3TQP',
    nivelConfianza: 'Autorreportado',
    municipio: 'Majagual',
    descripcion: 'Viviendas de la vereda Las Palmas rodeadas de agua, familias en la carretera',
    cantidad: 26,
    unidad: 'viviendas',
    nivel: 'Grave',
    personasAfectadas: 94,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-09T16:35:00Z',
  },
  {
    sector: 'Vivienda',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-CDO-9WHR',
    nivelConfianza: 'Autorreportado',
    municipio: 'Ciénaga de Oro',
    descripcion: 'Techos levantados por el vendaval que acompañó la creciente',
    cantidad: 17,
    unidad: 'viviendas',
    nivel: 'Moderado',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-09T18:15:00Z',
  },

  // ── Agua y saneamiento ──────────────────────────────────────────────────
  {
    sector: 'AguaYSaneamiento',
    origen: 'CargaEdan',
    origenId: 'EDAN-MON-021',
    nivelConfianza: 'Verificado',
    municipio: 'Montería',
    descripcion: 'Bocatoma del acueducto de la margen izquierda colmatada de sedimentos',
    cantidad: 1,
    unidad: 'bocatoma',
    nivel: 'Grave',
    costoEstimado: 1_450_000_000,
    personasAfectadas: 6200,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-09T07:15:00Z',
  },
  {
    sector: 'AguaYSaneamiento',
    origen: 'CargaEdan',
    origenId: 'EDAN-LOR-009',
    nivelConfianza: 'Verificado',
    municipio: 'Lorica',
    descripcion: 'Red de alcantarillado del centro con reflujo por taponamiento',
    cantidad: 4,
    unidad: 'km de red',
    nivel: 'Moderado',
    costoEstimado: 520_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-09T10:35:00Z',
  },
  {
    sector: 'AguaYSaneamiento',
    origen: 'CargaEdan',
    origenId: 'EDAN-SMA-011',
    nivelConfianza: 'Verificado',
    municipio: 'San Marcos',
    descripcion: 'Planta de tratamiento fuera de servicio por inundación de la sala de bombas',
    cantidad: 1,
    unidad: 'planta',
    nivel: 'Grave',
    costoEstimado: 890_000_000,
    personasAfectadas: 4100,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-09T11:55:00Z',
  },
  {
    sector: 'AguaYSaneamiento',
    origen: 'RegistroDamnificado',
    origenId: 'CEN-CER-0044',
    nivelConfianza: 'Censado',
    municipio: 'Cereté',
    descripcion: 'Pozos sépticos rebosados en cuatro veredas, riesgo sanitario inmediato',
    cantidad: 61,
    unidad: 'pozos',
    nivel: 'Grave',
    costoEstimado: 183_000_000,
    clasificadoPor: 'Funcionario',
    revisadoPor: 'Julián Ospina Cárdenas',
    registradoEn: '2026-08-09T17:25:00Z',
  },
  {
    sector: 'AguaYSaneamiento',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-CAI-6MDF',
    nivelConfianza: 'Autorreportado',
    municipio: 'Caimito',
    descripcion: 'El pueblo lleva tres días sin agua potable, están repartiendo en carrotanque',
    cantidad: 1,
    unidad: 'acueducto',
    nivel: 'Grave',
    clasificadoPor: 'Sugerencia',
    revisadoPor: 'Julián Ospina Cárdenas',
    registradoEn: '2026-08-09T19:05:00Z',
  },

  // ── Transporte ──────────────────────────────────────────────────────────
  {
    sector: 'Transporte',
    origen: 'CargaEdan',
    origenId: 'EDAN-MON-030',
    nivelConfianza: 'Verificado',
    municipio: 'Montería',
    descripcion: 'Puente vehicular sobre el caño Bugre con estribo socavado',
    cantidad: 1,
    unidad: 'puente',
    nivel: 'Grave',
    costoEstimado: 3_400_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-09T10:05:00Z',
  },
  {
    sector: 'Transporte',
    origen: 'CargaEdan',
    origenId: 'EDAN-SMA-015',
    nivelConfianza: 'Verificado',
    municipio: 'San Marcos',
    descripcion: 'Vía secundaria San Marcos – Caimito con banca perdida en tres tramos',
    cantidad: 9,
    unidad: 'km de vía',
    nivel: 'Grave',
    costoEstimado: 2_150_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-09T14:25:00Z',
  },
  {
    sector: 'Transporte',
    origen: 'CargaEdan',
    origenId: 'EDAN-CER-008',
    nivelConfianza: 'Verificado',
    municipio: 'Cereté',
    descripcion: 'Vías terciarias veredales intransitables por lodo y socavación',
    cantidad: 22,
    unidad: 'km de vía',
    nivel: 'Moderado',
    costoEstimado: 1_760_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-09T07:55:00Z',
  },
  {
    sector: 'Transporte',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-TIE-2KJC',
    nivelConfianza: 'Autorreportado',
    municipio: 'Tierralta',
    descripcion: 'Se llevó el pontón de la vereda Palmira, no pasa ni una moto',
    cantidad: 1,
    unidad: 'pontón',
    nivel: 'DestruccionTotal',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-09T11:25:00Z',
  },
  {
    sector: 'Transporte',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-AYA-5NBT',
    nivelConfianza: 'Autorreportado',
    municipio: 'Ayapel',
    descripcion: 'Carretera al corregimiento Cecilia bajo el agua desde el martes',
    cantidad: 6,
    unidad: 'km de vía',
    nivel: 'Grave',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-10T07:45:00Z',
  },
  {
    sector: 'Transporte',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-MLB-8QRA',
    nivelConfianza: 'Autorreportado',
    municipio: 'Montelíbano',
    descripcion: 'Muelle de paso del río San Jorge inservible, las canoas no pueden atracar',
    cantidad: 1,
    unidad: 'muelle',
    nivel: 'Moderado',
    clasificadoPor: 'Sugerencia',
    revisadoPor: 'Julián Ospina Cárdenas',
    registradoEn: '2026-08-10T12:05:00Z',
  },

  // ── Educación ───────────────────────────────────────────────────────────
  {
    sector: 'Educacion',
    origen: 'CargaEdan',
    origenId: 'EDAN-MON-042',
    nivelConfianza: 'Verificado',
    municipio: 'Montería',
    descripcion: 'Institución educativa con dos bloques de aulas anegados y sin mobiliario',
    cantidad: 2,
    unidad: 'sedes educativas',
    nivel: 'Grave',
    costoEstimado: 940_000_000,
    personasAfectadas: 1180,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-10T07:45:00Z',
  },
  {
    sector: 'Educacion',
    origen: 'CargaEdan',
    origenId: 'EDAN-CER-014',
    nivelConfianza: 'Verificado',
    municipio: 'Cereté',
    descripcion: 'Sedes rurales usadas como alojamiento temporal, sin clases desde el 12 de agosto',
    cantidad: 5,
    unidad: 'sedes educativas',
    nivel: 'Moderado',
    costoEstimado: 410_000_000,
    personasAfectadas: 860,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-10T18:25:00Z',
  },
  {
    sector: 'Educacion',
    origen: 'CargaEdan',
    origenId: 'EDAN-LOR-017',
    nivelConfianza: 'Verificado',
    municipio: 'Lorica',
    descripcion: 'Cubierta de la sede principal levantada, aulas expuestas a la lluvia',
    cantidad: 1,
    unidad: 'sede educativa',
    nivel: 'Grave',
    costoEstimado: 275_000_000,
    personasAfectadas: 540,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-10T12:35:00Z',
  },
  {
    sector: 'Educacion',
    origen: 'RegistroDamnificado',
    origenId: 'CEN-SMA-0022',
    nivelConfianza: 'Censado',
    municipio: 'San Marcos',
    descripcion: 'Comedor escolar fuera de servicio: se perdieron la dotación y los alimentos',
    cantidad: 1,
    unidad: 'comedor escolar',
    nivel: 'Moderado',
    costoEstimado: 68_000_000,
    personasAfectadas: 320,
    clasificadoPor: 'Funcionario',
    revisadoPor: 'Marcela Ibáñez Rueda',
    registradoEn: '2026-08-10T15:45:00Z',
  },
  {
    sector: 'Educacion',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-PLR-4HFD',
    nivelConfianza: 'Autorreportado',
    municipio: 'Planeta Rica',
    descripcion: 'La escuela del corregimiento Marañonal quedó sin techo y los niños no han vuelto',
    cantidad: 1,
    unidad: 'sede educativa',
    nivel: 'Grave',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-10T17:15:00Z',
  },
  {
    sector: 'Educacion',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-CAI-1PLZ',
    nivelConfianza: 'Autorreportado',
    municipio: 'Caimito',
    descripcion: 'El colegio está lleno de barro, los profesores lo están sacando con palas',
    cantidad: 1,
    unidad: 'sede educativa',
    nivel: 'Moderado',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-10T06:45:00Z',
  },

  // ── Salud ───────────────────────────────────────────────────────────────
  {
    sector: 'Salud',
    origen: 'CargaEdan',
    origenId: 'EDAN-MON-051',
    nivelConfianza: 'Verificado',
    municipio: 'Montería',
    descripcion: 'Centro de salud del barrio Sucre con uso restringido: urgencias fuera de servicio',
    cantidad: 1,
    unidad: 'centro de salud',
    nivel: 'Grave',
    costoEstimado: 1_120_000_000,
    personasAfectadas: 3400,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-10T13:45:00Z',
  },
  {
    sector: 'Salud',
    origen: 'CargaEdan',
    origenId: 'EDAN-LOR-023',
    nivelConfianza: 'Verificado',
    municipio: 'Lorica',
    descripcion: 'Puesto de salud rural anegado, se perdió la cadena de frío de vacunas',
    cantidad: 1,
    unidad: 'puesto de salud',
    nivel: 'Moderado',
    costoEstimado: 145_000_000,
    personasAfectadas: 820,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-10T07:45:00Z',
  },
  {
    sector: 'Salud',
    origen: 'RegistroDamnificado',
    origenId: 'CEN-CER-0058',
    nivelConfianza: 'Censado',
    municipio: 'Cereté',
    descripcion: 'Brote de enfermedad diarreica aguda en alojamientos temporales',
    cantidad: 74,
    unidad: 'personas atendidas',
    nivel: 'Moderado',
    personasAfectadas: 74,
    clasificadoPor: 'Funcionario',
    revisadoPor: 'Marcela Ibáñez Rueda',
    registradoEn: '2026-08-10T17:05:00Z',
  },
  {
    sector: 'Salud',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-MAJ-7CVN',
    nivelConfianza: 'Autorreportado',
    municipio: 'Majagual',
    descripcion: 'No hay ambulancia que entre al corregimiento, hay una señora embarazada aislada',
    cantidad: 1,
    unidad: 'corregimiento sin acceso',
    nivel: 'Grave',
    clasificadoPor: 'Sugerencia',
    revisadoPor: 'Julián Ospina Cárdenas',
    registradoEn: '2026-08-10T13:05:00Z',
  },

  // ── Energía ─────────────────────────────────────────────────────────────
  {
    sector: 'Energia',
    origen: 'CargaEdan',
    origenId: 'EDAN-SMA-019',
    nivelConfianza: 'Verificado',
    municipio: 'San Marcos',
    descripcion: 'Subestación eléctrica inundada, cuatro circuitos fuera de servicio',
    cantidad: 1,
    unidad: 'subestación',
    nivel: 'Grave',
    costoEstimado: 1_980_000_000,
    personasAfectadas: 5200,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-10T10:55:00Z',
  },
  {
    sector: 'Energia',
    origen: 'CargaEdan',
    origenId: 'EDAN-MON-060',
    nivelConfianza: 'Verificado',
    municipio: 'Montería',
    descripcion: 'Postes de media tensión caídos sobre la vía a Tres Palmas',
    cantidad: 38,
    unidad: 'postes',
    nivel: 'Moderado',
    costoEstimado: 456_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-10T21:15:00Z',
  },
  {
    sector: 'Energia',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-AYA-9DKM',
    nivelConfianza: 'Autorreportado',
    municipio: 'Ayapel',
    descripcion: 'Cuatro días sin luz en todo el barrio, la comida se dañó',
    cantidad: 1,
    unidad: 'barrio sin servicio',
    nivel: 'Grave',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-11T08:05:00Z',
  },
  {
    sector: 'Energia',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-TIE-3XBS',
    nivelConfianza: 'Autorreportado',
    municipio: 'Tierralta',
    descripcion: 'Transformador de la vereda estalló cuando subió el agua',
    cantidad: 1,
    unidad: 'transformador',
    nivel: 'Grave',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-11T12:35:00Z',
  },

  // ── Telecomunicaciones ──────────────────────────────────────────────────
  {
    sector: 'Telecomunicaciones',
    origen: 'CargaEdan',
    origenId: 'EDAN-SMA-024',
    nivelConfianza: 'Verificado',
    municipio: 'San Marcos',
    descripcion: 'Torre de telefonía móvil sin energía de respaldo desde el 12 de agosto',
    cantidad: 1,
    unidad: 'estación base',
    nivel: 'Moderado',
    costoEstimado: 310_000_000,
    personasAfectadas: 7800,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-11T18:15:00Z',
  },
  {
    sector: 'Telecomunicaciones',
    origen: 'CargaEdan',
    origenId: 'EDAN-LOR-028',
    nivelConfianza: 'Verificado',
    municipio: 'Lorica',
    descripcion: 'Emisora comunitaria fuera del aire: se inundó la cabina y el transmisor',
    cantidad: 1,
    unidad: 'emisora',
    nivel: 'Grave',
    costoEstimado: 96_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-11T13:15:00Z',
  },
  {
    sector: 'Telecomunicaciones',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-MAJ-5RTW',
    nivelConfianza: 'Autorreportado',
    municipio: 'Majagual',
    descripcion: 'No hay señal de celular en el corregimiento, hay que salir en canoa para llamar',
    cantidad: 1,
    unidad: 'corregimiento sin señal',
    nivel: 'Grave',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-11T07:25:00Z',
  },

  // ── Agropecuario ────────────────────────────────────────────────────────
  {
    sector: 'Agropecuario',
    origen: 'CargaEdan',
    origenId: 'EDAN-CER-021',
    nivelConfianza: 'Verificado',
    municipio: 'Cereté',
    descripcion: 'Hectáreas de maíz y algodón perdidas por permanencia de la lámina de agua',
    cantidad: 1240,
    unidad: 'hectáreas',
    nivel: 'DestruccionTotal',
    costoEstimado: 4_960_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-11T21:05:00Z',
  },
  {
    sector: 'Agropecuario',
    origen: 'CargaEdan',
    origenId: 'EDAN-SMA-031',
    nivelConfianza: 'Verificado',
    municipio: 'San Marcos',
    descripcion: 'Semovientes bovinos muertos o desplazados sin pastura disponible',
    cantidad: 860,
    unidad: 'cabezas de ganado',
    nivel: 'Grave',
    costoEstimado: 2_580_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-11T14:45:00Z',
  },
  {
    sector: 'Agropecuario',
    origen: 'RegistroDamnificado',
    origenId: 'CEN-LOR-0037',
    nivelConfianza: 'Censado',
    municipio: 'Lorica',
    descripcion: 'Estanques piscícolas desbordados: se perdió la cosecha de cachama',
    cantidad: 46,
    unidad: 'estanques',
    nivel: 'Grave',
    costoEstimado: 322_000_000,
    clasificadoPor: 'Regla',
    revisadoPor: 'Marcela Ibáñez Rueda',
    registradoEn: '2026-08-11T13:25:00Z',
  },
  {
    sector: 'Agropecuario',
    origen: 'RegistroDamnificado',
    origenId: 'CEN-MON-0064',
    nivelConfianza: 'Censado',
    municipio: 'Montería',
    descripcion: 'Galpones avícolas familiares destruidos en zona rural',
    cantidad: 19,
    unidad: 'galpones',
    nivel: 'DestruccionTotal',
    costoEstimado: 152_000_000,
    clasificadoPor: 'Regla',
    revisadoPor: 'Marcela Ibáñez Rueda',
    registradoEn: '2026-08-11T10:35:00Z',
  },
  {
    sector: 'Agropecuario',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-AYA-2FGH',
    nivelConfianza: 'Autorreportado',
    municipio: 'Ayapel',
    descripcion: 'Se ahogó el ganado de varias fincas, están sacando los que quedan en planchón',
    cantidad: 140,
    unidad: 'cabezas de ganado',
    nivel: 'Grave',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-11T15:05:00Z',
  },
  {
    sector: 'Agropecuario',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-MLB-6JYN',
    nivelConfianza: 'Autorreportado',
    municipio: 'Montelíbano',
    descripcion: 'Los cultivos de yuca y plátano de la vereda quedaron debajo del agua',
    cantidad: 85,
    unidad: 'hectáreas',
    nivel: 'Grave',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-11T21:05:00Z',
  },

  // ── Comercio e industria ────────────────────────────────────────────────
  {
    sector: 'ComercioIndustria',
    origen: 'CargaEdan',
    origenId: 'EDAN-MON-072',
    nivelConfianza: 'Verificado',
    municipio: 'Montería',
    descripcion: 'Locales del mercado público con mercancía perdida por la creciente',
    cantidad: 96,
    unidad: 'locales',
    nivel: 'Grave',
    costoEstimado: 768_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-11T16:55:00Z',
  },
  {
    sector: 'ComercioIndustria',
    origen: 'CargaEdan',
    origenId: 'EDAN-CER-027',
    nivelConfianza: 'Verificado',
    municipio: 'Cereté',
    descripcion: 'Planta procesadora de arroz con maquinaria sumergida',
    cantidad: 1,
    unidad: 'planta',
    nivel: 'Grave',
    costoEstimado: 1_240_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-12T15:25:00Z',
  },
  {
    sector: 'ComercioIndustria',
    origen: 'RegistroDamnificado',
    origenId: 'CEN-LOR-0049',
    nivelConfianza: 'Censado',
    municipio: 'Lorica',
    descripcion: 'Puestos de venta informal del malecón arrastrados por el agua',
    cantidad: 54,
    unidad: 'puestos',
    nivel: 'DestruccionTotal',
    costoEstimado: 81_000_000,
    clasificadoPor: 'Funcionario',
    revisadoPor: 'Julián Ospina Cárdenas',
    registradoEn: '2026-08-12T08:55:00Z',
  },
  {
    sector: 'ComercioIndustria',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-PLR-8SDQ',
    nivelConfianza: 'Autorreportado',
    municipio: 'Planeta Rica',
    descripcion: 'Se dañó toda la nevera de la tienda del barrio con los cuatro días sin luz',
    cantidad: 12,
    unidad: 'establecimientos',
    nivel: 'Moderado',
    clasificadoPor: 'Sugerencia',
    revisadoPor: 'Julián Ospina Cárdenas',
    registradoEn: '2026-08-12T08:25:00Z',
  },

  // ── Cultura ─────────────────────────────────────────────────────────────
  {
    sector: 'Cultura',
    origen: 'CargaEdan',
    origenId: 'EDAN-LOR-033',
    nivelConfianza: 'Verificado',
    municipio: 'Lorica',
    descripcion: 'Casa de la cultura del centro histórico con humedad estructural en muros',
    cantidad: 1,
    unidad: 'edificación patrimonial',
    nivel: 'Grave',
    costoEstimado: 640_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-12T16:05:00Z',
  },
  {
    sector: 'Cultura',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-CDO-4BNM',
    nivelConfianza: 'Autorreportado',
    municipio: 'Ciénaga de Oro',
    descripcion: 'La iglesia del corregimiento se llenó de agua y se dañaron las bancas',
    cantidad: 1,
    unidad: 'iglesia',
    nivel: 'Moderado',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-12T11:45:00Z',
  },

  // ── Inclusión social ────────────────────────────────────────────────────
  {
    sector: 'InclusionSocial',
    origen: 'CargaEdan',
    origenId: 'EDAN-MON-081',
    nivelConfianza: 'Verificado',
    municipio: 'Montería',
    descripcion: 'Centros de desarrollo infantil cerrados por inundación de aulas y cocina',
    cantidad: 3,
    unidad: 'centros del ICBF',
    nivel: 'Moderado',
    costoEstimado: 218_000_000,
    personasAfectadas: 410,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-12T18:25:00Z',
  },
  {
    sector: 'InclusionSocial',
    origen: 'RegistroDamnificado',
    origenId: 'CEN-SMA-0041',
    nivelConfianza: 'Censado',
    municipio: 'San Marcos',
    descripcion: 'Hogares comunitarios sin dotación tras el paso del agua',
    cantidad: 7,
    unidad: 'hogares comunitarios',
    nivel: 'Moderado',
    costoEstimado: 63_000_000,
    personasAfectadas: 112,
    clasificadoPor: 'Funcionario',
    revisadoPor: 'Marcela Ibáñez Rueda',
    registradoEn: '2026-08-12T09:15:00Z',
  },
  {
    sector: 'InclusionSocial',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-CAI-7ZQK',
    nivelConfianza: 'Autorreportado',
    municipio: 'Caimito',
    descripcion: 'En el albergue hay adultos mayores durmiendo en el piso, no alcanzan las colchonetas',
    cantidad: 1,
    unidad: 'alojamiento temporal',
    nivel: 'Grave',
    personasAfectadas: 86,
    clasificadoPor: 'Sugerencia',
    revisadoPor: 'Julián Ospina Cárdenas',
    registradoEn: '2026-08-12T08:55:00Z',
  },

  // ── Gobierno ────────────────────────────────────────────────────────────
  {
    sector: 'Gobierno',
    origen: 'CargaEdan',
    origenId: 'EDAN-SMA-038',
    nivelConfianza: 'Verificado',
    municipio: 'San Marcos',
    descripcion: 'Primer piso de la alcaldía inundado: archivo y equipos de cómputo perdidos',
    cantidad: 1,
    unidad: 'edificación pública',
    nivel: 'Grave',
    costoEstimado: 385_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-13T15:25:00Z',
  },
  {
    sector: 'Gobierno',
    origen: 'CargaEdan',
    origenId: 'EDAN-CER-034',
    nivelConfianza: 'Verificado',
    municipio: 'Cereté',
    descripcion: 'Sede de la inspección de policía con daño en cubierta y instalación eléctrica',
    cantidad: 1,
    unidad: 'edificación pública',
    nivel: 'Moderado',
    costoEstimado: 97_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-13T10:45:00Z',
  },
  {
    sector: 'Gobierno',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-MLB-9WXE',
    nivelConfianza: 'Autorreportado',
    municipio: 'Montelíbano',
    descripcion: 'La registraduría no está atendiendo, dicen que se les mojaron los papeles',
    cantidad: 1,
    unidad: 'edificación pública',
    nivel: 'Moderado',
    clasificadoPor: 'Sugerencia',
    registradoEn: '2026-08-13T16:35:00Z',
  },

  // ── Sin clasificar ──────────────────────────────────────────────────────
  // Texto libre de reportes ciudadanos que ninguna regla pudo asignar. Casi
  // todos tocan dos sectores a la vez, y por eso los resuelve una persona: un
  // dato mal enviado a un ministerio cuesta más que una bandeja pendiente.
  {
    sector: null,
    origen: 'ReporteCiudadano',
    origenId: 'RPT-TIE-8HKV',
    nivelConfianza: 'Autorreportado',
    municipio: 'Tierralta',
    descripcion: 'Se cayó el puente de la vereda y el colegio quedó sin techo',
    cantidad: 1,
    unidad: 'reporte',
    clasificadoPor: 'Sugerencia',
    sectoresSugeridos: ['Transporte', 'Educacion'],
    registradoEn: '2026-08-13T15:05:00Z',
  },
  {
    sector: null,
    origen: 'ReporteCiudadano',
    origenId: 'RPT-AYA-1QRD',
    nivelConfianza: 'Autorreportado',
    municipio: 'Ayapel',
    descripcion: 'El centro de acopio del pueblo se inundó y ahí guardaban la comida del albergue',
    cantidad: 1,
    unidad: 'reporte',
    clasificadoPor: 'Sugerencia',
    sectoresSugeridos: ['ComercioIndustria', 'InclusionSocial'],
    registradoEn: '2026-08-13T07:15:00Z',
  },
  {
    sector: null,
    origen: 'ReporteCiudadano',
    origenId: 'RPT-MAJ-2LWC',
    nivelConfianza: 'Autorreportado',
    municipio: 'Majagual',
    descripcion: 'La cancha del barrio quedó vuelta un charco y ahí funcionaba el puesto de salud móvil',
    cantidad: 1,
    unidad: 'reporte',
    clasificadoPor: 'Sugerencia',
    sectoresSugeridos: ['Deporte', 'Salud'],
    registradoEn: '2026-08-14T10:25:00Z',
  },
  {
    sector: null,
    origen: 'ReporteCiudadano',
    origenId: 'RPT-CDO-5TVB',
    nivelConfianza: 'Autorreportado',
    municipio: 'Ciénaga de Oro',
    descripcion: 'Se reventó la tubería en la vía principal, hay un hueco enorme y no llega agua',
    cantidad: 1,
    unidad: 'reporte',
    clasificadoPor: 'Sugerencia',
    sectoresSugeridos: ['AguaYSaneamiento', 'Transporte'],
    registradoEn: '2026-08-14T14:45:00Z',
  },
  {
    sector: null,
    origen: 'ReporteCiudadano',
    origenId: 'RPT-PLR-3GNM',
    nivelConfianza: 'Autorreportado',
    municipio: 'Planeta Rica',
    descripcion: 'Un poste cayó sobre la casa de la esquina y quedó la casa y el cable en el suelo',
    cantidad: 1,
    unidad: 'reporte',
    clasificadoPor: 'Sugerencia',
    sectoresSugeridos: ['Energia', 'Vivienda'],
    registradoEn: '2026-08-14T14:35:00Z',
  },
  {
    sector: null,
    origen: 'ReporteCiudadano',
    origenId: 'RPT-CAI-4XJS',
    nivelConfianza: 'Autorreportado',
    municipio: 'Caimito',
    descripcion: 'Hay olor feo por todo el caño y los niños de la escuela de al lado están enfermos',
    cantidad: 1,
    unidad: 'reporte',
    clasificadoPor: 'Sugerencia',
    sectoresSugeridos: ['AguaYSaneamiento', 'Salud', 'Educacion'],
    registradoEn: '2026-08-14T10:15:00Z',
  },
];

const SEMILLA_SAN_JORGE: SemillaEventoCompleto = {
  evento: {
    id: EVENTO_ID,
    codigo: EVENTO_ID,
    nombre: 'Inundaciones del bajo San Jorge, agosto 2026',
    tipoEvento: 'inundacion',
    declaratoria: 'Desastre',
    nivelDeclaratoria: 'Departamental',
    numeroDecreto: 'Decreto Departamental 0642 de 2026',
    fechaDeclaratoria: '2026-08-08T15:00:00Z',
    fechaEvento: '2026-08-07T04:20:00Z',
    departamentos: ['Córdoba', 'Sucre'],
    estado: 'Activo',
    personasAfectadas: 18450,
  },
  prefijoDano: 'DS',
  fechaCorte: '2026-08-15',
  cobertura: COBERTURA_SAN_JORGE,
  danos: DANOS_SAN_JORGE,
  /*
   * Cubre las cuatro casillas del flujo para que la pantalla no muestre trece
   * filas iguales: hay enviados, uno aprobado esperando envío, tres en revisión
   * y el resto en borrador.
   */
  estados: {
    Vivienda: 'Enviado',
    Transporte: 'Enviado',
    Telecomunicaciones: 'Enviado',
    Salud: 'Aprobado',
    AguaYSaneamiento: 'EnRevision',
    Educacion: 'EnRevision',
    Agropecuario: 'EnRevision',
  },
  firmas: {
    Vivienda: { por: 'Marcela Ibáñez Rueda', en: '2026-08-15T14:05:00Z' },
    Transporte: { por: 'Julián Ospina Cárdenas', en: '2026-08-15T14:40:00Z' },
    Telecomunicaciones: { por: 'Marcela Ibáñez Rueda', en: '2026-08-15T15:12:00Z' },
    Salud: { por: 'Diana Restrepo Tovar', en: '2026-08-15T16:00:00Z' },
  },
  /*
   * La bitácora nace con tres envíos: una vacía no deja ver para qué sirve el
   * subpanel D.
   */
  envios: [
    { sector: 'Vivienda', por: 'Marcela Ibáñez Rueda', en: '2026-08-15T14:07:00Z' },
    { sector: 'Transporte', por: 'Julián Ospina Cárdenas', en: '2026-08-15T14:42:00Z' },
    { sector: 'Telecomunicaciones', por: 'Marcela Ibáñez Rueda', en: '2026-08-15T15:15:00Z' },
  ],
};

/*
 * ───────────────────────────────────────────────────────────────────────────
 *  Evento 2 — Sismo de la cordillera Central (Quindío y Risaralda)
 *
 *  Declarado ayer. Es el caso donde el panel más sirve, porque lo único que
 *  tiene para enseñar es el vacío: un municipio con EDAN contra once callados,
 *  y casi todo lo que se sabe viene de gente reportando desde el celular.
 *  Ningún paquete ha salido todavía, y así debe verse.
 * ───────────────────────────────────────────────────────────────────────────
 */

const COBERTURA_CORDILLERA: readonly CoberturaMunicipio[] = [
  {
    municipio: 'Calarcá',
    departamento: 'Quindío',
    estado: 'ConEdan',
    reportesRecibidos: 28,
    ultimoDatoEn: '2026-08-15T18:40:00Z',
  },
  {
    municipio: 'Armenia',
    departamento: 'Quindío',
    estado: 'SoloAutorreportes',
    reportesRecibidos: 63,
    ultimoDatoEn: '2026-08-15T19:15:00Z',
  },
  {
    municipio: 'Salento',
    departamento: 'Quindío',
    estado: 'SoloAutorreportes',
    reportesRecibidos: 17,
    ultimoDatoEn: '2026-08-15T16:05:00Z',
  },
  {
    municipio: 'Circasia',
    departamento: 'Quindío',
    estado: 'SoloAutorreportes',
    reportesRecibidos: 12,
    ultimoDatoEn: '2026-08-15T14:30:00Z',
  },
  {
    municipio: 'Santa Rosa de Cabal',
    departamento: 'Risaralda',
    estado: 'SoloAutorreportes',
    reportesRecibidos: 9,
    ultimoDatoEn: '2026-08-15T12:55:00Z',
  },
  {
    municipio: 'Filandia',
    departamento: 'Quindío',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Montenegro',
    departamento: 'Quindío',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Quimbaya',
    departamento: 'Quindío',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'La Tebaida',
    departamento: 'Quindío',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Pijao',
    departamento: 'Quindío',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Génova',
    departamento: 'Quindío',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Córdoba',
    departamento: 'Quindío',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Pereira',
    departamento: 'Risaralda',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Dosquebradas',
    departamento: 'Risaralda',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Marsella',
    departamento: 'Risaralda',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Belén de Umbría',
    departamento: 'Risaralda',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
];

const DANOS_CORDILLERA: readonly SemillaDano[] = [
  {
    sector: 'Vivienda',
    origen: 'CargaEdan',
    origenId: 'EDAN-CAL-002',
    nivelConfianza: 'Verificado',
    municipio: 'Calarcá',
    descripcion: 'Viviendas de bahareque con muros agrietados en el barrio La Floresta',
    cantidad: 74,
    unidad: 'viviendas',
    nivel: 'Grave',
    costoEstimado: 1_110_000_000,
    personasAfectadas: 268,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-15T11:20:00Z',
  },
  {
    sector: 'Educacion',
    origen: 'CargaEdan',
    origenId: 'EDAN-CAL-004',
    nivelConfianza: 'Verificado',
    municipio: 'Calarcá',
    descripcion: 'Sedes educativas con fisuras en columnas, evacuadas hasta el peritaje',
    cantidad: 2,
    unidad: 'sedes educativas',
    nivel: 'Moderado',
    costoEstimado: 320_000_000,
    personasAfectadas: 740,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-15T13:05:00Z',
  },
  {
    sector: 'Salud',
    origen: 'RegistroDamnificado',
    origenId: 'CEN-CAL-0006',
    nivelConfianza: 'Censado',
    municipio: 'Calarcá',
    descripcion: 'Personas atendidas por heridas leves y crisis de ansiedad en el hospital local',
    cantidad: 63,
    unidad: 'personas atendidas',
    nivel: 'Leve',
    personasAfectadas: 63,
    clasificadoPor: 'Funcionario',
    revisadoPor: 'Diana Restrepo Tovar',
    registradoEn: '2026-08-15T15:40:00Z',
  },
  {
    sector: 'Vivienda',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-ARM-2PQV',
    nivelConfianza: 'Autorreportado',
    municipio: 'Armenia',
    descripcion: 'Las casas del conjunto quedaron con grietas y nadie ha venido a revisarlas',
    cantidad: 46,
    unidad: 'viviendas',
    nivel: 'Moderado',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-15T09:10:00Z',
  },
  {
    sector: 'Vivienda',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-SAL-7KDN',
    nivelConfianza: 'Autorreportado',
    municipio: 'Salento',
    descripcion: 'Se cayó el muro de una casa vieja del centro y la familia salió corriendo',
    cantidad: 3,
    unidad: 'viviendas',
    nivel: 'Grave',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-15T10:35:00Z',
  },
  {
    sector: 'Transporte',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-CIR-5MWT',
    nivelConfianza: 'Autorreportado',
    municipio: 'Circasia',
    descripcion: 'La vía al corregimiento tiene una grieta atravesada, los buses no están pasando',
    cantidad: 2,
    unidad: 'km de vía',
    nivel: 'Grave',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-15T11:50:00Z',
  },
  {
    sector: 'Energia',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-ARM-9BHX',
    nivelConfianza: 'Autorreportado',
    municipio: 'Armenia',
    descripcion: 'Todo el sector lleva desde anoche sin luz, hay postes inclinados sobre los techos',
    cantidad: 1,
    unidad: 'barrio sin servicio',
    nivel: 'Moderado',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-15T07:45:00Z',
  },
  {
    sector: 'Cultura',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-SAL-3JCE',
    nivelConfianza: 'Autorreportado',
    municipio: 'Salento',
    descripcion: 'La torre de la iglesia quedó torcida y le cerraron el paso con cinta',
    cantidad: 1,
    unidad: 'edificación patrimonial',
    nivel: 'Grave',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-15T12:25:00Z',
  },
  {
    sector: 'AguaYSaneamiento',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-SRC-6TLA',
    nivelConfianza: 'Autorreportado',
    municipio: 'Santa Rosa de Cabal',
    descripcion: 'Se reventó la tubería madre del acueducto y el barrio está sin una gota',
    cantidad: 1,
    unidad: 'acueducto',
    nivel: 'Grave',
    clasificadoPor: 'Sugerencia',
    revisadoPor: 'Diana Restrepo Tovar',
    registradoEn: '2026-08-15T12:55:00Z',
  },
  {
    sector: 'Gobierno',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-CIR-1XSF',
    nivelConfianza: 'Autorreportado',
    municipio: 'Circasia',
    descripcion: 'Evacuaron la alcaldía porque el segundo piso quedó con las paredes abiertas',
    cantidad: 1,
    unidad: 'edificación pública',
    nivel: 'Moderado',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-15T14:30:00Z',
  },

  // ── Sin clasificar ──────────────────────────────────────────────────────
  {
    sector: null,
    origen: 'ReporteCiudadano',
    origenId: 'RPT-ARM-4NRJ',
    nivelConfianza: 'Autorreportado',
    municipio: 'Armenia',
    descripcion: 'Se cayó el muro del colegio sobre la calle y quedó tapada la entrada al barrio',
    cantidad: 1,
    unidad: 'reporte',
    clasificadoPor: 'Sugerencia',
    sectoresSugeridos: ['Educacion', 'Transporte'],
    registradoEn: '2026-08-15T16:20:00Z',
  },
  {
    sector: null,
    origen: 'ReporteCiudadano',
    origenId: 'RPT-SRC-8VQD',
    nivelConfianza: 'Autorreportado',
    municipio: 'Santa Rosa de Cabal',
    descripcion: 'El puesto de salud está agrietado y además no le llega agua desde el temblor',
    cantidad: 1,
    unidad: 'reporte',
    clasificadoPor: 'Sugerencia',
    sectoresSugeridos: ['Salud', 'AguaYSaneamiento'],
    registradoEn: '2026-08-15T17:10:00Z',
  },
  {
    sector: null,
    origen: 'ReporteCiudadano',
    origenId: 'RPT-SAL-9GZP',
    nivelConfianza: 'Autorreportado',
    municipio: 'Salento',
    descripcion: 'Hay familias durmiendo en el parque desde anoche y no han llegado carpas',
    cantidad: 1,
    unidad: 'reporte',
    clasificadoPor: 'Sugerencia',
    sectoresSugeridos: ['InclusionSocial', 'Vivienda'],
    registradoEn: '2026-08-15T16:05:00Z',
  },
];

const SEMILLA_CORDILLERA: SemillaEventoCompleto = {
  evento: {
    id: 'EVT-2026-08-14-007',
    codigo: 'EVT-2026-08-14-007',
    nombre: 'Sismo de la cordillera Central, agosto 2026',
    tipoEvento: 'sismo',
    declaratoria: 'CalamidadPublica',
    nivelDeclaratoria: 'Departamental',
    numeroDecreto: 'Decreto Departamental 0311 de 2026',
    fechaDeclaratoria: '2026-08-14T22:10:00Z',
    fechaEvento: '2026-08-14T08:42:00Z',
    departamentos: ['Quindío', 'Risaralda'],
    estado: 'Activo',
    personasAfectadas: 4120,
  },
  prefijoDano: 'DSQ',
  fechaCorte: '2026-08-14',
  cobertura: COBERTURA_CORDILLERA,
  danos: DANOS_CORDILLERA,
  // Sin estados ni firmas: a un día de la declaratoria no hay nada que remitir.
};

/*
 * ───────────────────────────────────────────────────────────────────────────
 *  Evento 3 — Incendio forestal de la mesa de Los Santos (Santander)
 *
 *  Dos meses después: cobertura casi completa, EDAN en cuatro de seis
 *  municipios y siete paquetes ya remitidos. Es el evento que muestra cómo se
 *  ve el módulo cuando el trabajo está hecho.
 *
 *  La calamidad la declaró el municipio donde arrancó el fuego, y por eso el
 *  nivel es municipal aunque el incendio se pasara a los vecinos: la
 *  declaratoria departamental, cuando llega, llega después.
 * ───────────────────────────────────────────────────────────────────────────
 */

const COBERTURA_MESA: readonly CoberturaMunicipio[] = [
  {
    municipio: 'Los Santos',
    departamento: 'Santander',
    estado: 'ConEdan',
    reportesRecibidos: 54,
    ultimoDatoEn: '2026-06-28T16:30:00Z',
  },
  {
    municipio: 'Piedecuesta',
    departamento: 'Santander',
    estado: 'ConEdan',
    reportesRecibidos: 37,
    ultimoDatoEn: '2026-06-27T21:15:00Z',
  },
  {
    municipio: 'Girón',
    departamento: 'Santander',
    estado: 'ConEdan',
    reportesRecibidos: 22,
    ultimoDatoEn: '2026-06-26T18:45:00Z',
  },
  {
    municipio: 'Aratoca',
    departamento: 'Santander',
    estado: 'ConEdan',
    reportesRecibidos: 18,
    ultimoDatoEn: '2026-06-27T10:05:00Z',
  },
  {
    municipio: 'Curití',
    departamento: 'Santander',
    estado: 'SoloAutorreportes',
    reportesRecibidos: 11,
    ultimoDatoEn: '2026-06-25T14:20:00Z',
  },
  {
    municipio: 'Jordán',
    departamento: 'Santander',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
];

const DANOS_MESA: readonly SemillaDano[] = [
  // ── Agropecuario ────────────────────────────────────────────────────────
  {
    sector: 'Agropecuario',
    origen: 'CargaEdan',
    origenId: 'EDAN-LSA-003',
    nivelConfianza: 'Verificado',
    municipio: 'Los Santos',
    descripcion: 'Hectáreas de bosque seco y cultivo de tabaco arrasadas por el frente de fuego',
    cantidad: 1820,
    unidad: 'hectáreas',
    nivel: 'DestruccionTotal',
    costoEstimado: 3_640_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-06-21T15:10:00Z',
  },
  {
    sector: 'Agropecuario',
    origen: 'CargaEdan',
    origenId: 'EDAN-ARA-007',
    nivelConfianza: 'Verificado',
    municipio: 'Aratoca',
    descripcion: 'Ganado caprino muerto o sacrificado por quemaduras en fincas de ladera',
    cantidad: 310,
    unidad: 'cabezas de ganado',
    nivel: 'Grave',
    costoEstimado: 620_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-06-22T11:40:00Z',
  },
  {
    sector: 'Agropecuario',
    origen: 'RegistroDamnificado',
    origenId: 'CEN-PIE-0018',
    nivelConfianza: 'Censado',
    municipio: 'Piedecuesta',
    descripcion: 'Apiarios de la vereda La Esperanza destruidos, se perdió la cosecha de miel',
    cantidad: 140,
    unidad: 'colmenas',
    nivel: 'DestruccionTotal',
    costoEstimado: 84_000_000,
    clasificadoPor: 'Regla',
    revisadoPor: 'Andrés Quintero Lozano',
    registradoEn: '2026-06-23T09:25:00Z',
  },

  // ── Vivienda ────────────────────────────────────────────────────────────
  {
    sector: 'Vivienda',
    origen: 'CargaEdan',
    origenId: 'EDAN-LSA-011',
    nivelConfianza: 'Verificado',
    municipio: 'Los Santos',
    descripcion: 'Viviendas rurales consumidas por el fuego en las veredas del filo',
    cantidad: 18,
    unidad: 'viviendas',
    nivel: 'DestruccionTotal',
    costoEstimado: 720_000_000,
    personasAfectadas: 61,
    clasificadoPor: 'Regla',
    registradoEn: '2026-06-21T19:55:00Z',
  },
  {
    sector: 'Vivienda',
    origen: 'RegistroDamnificado',
    origenId: 'CEN-GIR-0026',
    nivelConfianza: 'Censado',
    municipio: 'Girón',
    descripcion: 'Viviendas con cubierta y carpintería comprometidas por el paso del fuego',
    cantidad: 34,
    unidad: 'viviendas',
    nivel: 'Grave',
    costoEstimado: 408_000_000,
    personasAfectadas: 121,
    clasificadoPor: 'Regla',
    revisadoPor: 'Andrés Quintero Lozano',
    registradoEn: '2026-06-24T13:15:00Z',
  },

  // ── Agua y saneamiento ──────────────────────────────────────────────────
  {
    sector: 'AguaYSaneamiento',
    origen: 'CargaEdan',
    origenId: 'EDAN-LSA-019',
    nivelConfianza: 'Verificado',
    municipio: 'Los Santos',
    descripcion: 'Conducción del acueducto veredal derretida en doce kilómetros de manguera',
    cantidad: 12,
    unidad: 'km de red',
    nivel: 'Grave',
    costoEstimado: 260_000_000,
    personasAfectadas: 1900,
    clasificadoPor: 'Regla',
    registradoEn: '2026-06-22T16:20:00Z',
  },
  {
    sector: 'AguaYSaneamiento',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-CUR-3WQK',
    nivelConfianza: 'Autorreportado',
    municipio: 'Curití',
    descripcion: 'El nacimiento que surte la vereda quedó rodeado de ceniza y el agua sale negra',
    cantidad: 1,
    unidad: 'nacimiento de agua',
    nivel: 'Moderado',
    clasificadoPor: 'Regla',
    registradoEn: '2026-06-24T08:40:00Z',
  },

  // ── Transporte ──────────────────────────────────────────────────────────
  {
    sector: 'Transporte',
    origen: 'CargaEdan',
    origenId: 'EDAN-ARA-013',
    nivelConfianza: 'Verificado',
    municipio: 'Aratoca',
    descripcion: 'Vía terciaria con pérdida de banca por remoción del talud sin cobertura vegetal',
    cantidad: 7,
    unidad: 'km de vía',
    nivel: 'Grave',
    costoEstimado: 980_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-06-25T10:50:00Z',
  },

  // ── Energía ─────────────────────────────────────────────────────────────
  {
    sector: 'Energia',
    origen: 'CargaEdan',
    origenId: 'EDAN-PIE-016',
    nivelConfianza: 'Verificado',
    municipio: 'Piedecuesta',
    descripcion: 'Red de media tensión con postes de madera quemados en el circuito rural',
    cantidad: 62,
    unidad: 'postes',
    nivel: 'Moderado',
    costoEstimado: 310_000_000,
    personasAfectadas: 2400,
    clasificadoPor: 'Regla',
    registradoEn: '2026-06-23T17:35:00Z',
  },

  // ── Comercio e industria ────────────────────────────────────────────────
  {
    sector: 'ComercioIndustria',
    origen: 'CargaEdan',
    origenId: 'EDAN-PIE-022',
    nivelConfianza: 'Verificado',
    municipio: 'Piedecuesta',
    descripcion: 'Fincas agroturísticas cerradas por daño en cabañas y senderos',
    cantidad: 9,
    unidad: 'establecimientos',
    nivel: 'Grave',
    costoEstimado: 540_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-06-24T15:05:00Z',
  },
  {
    sector: 'ComercioIndustria',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-CUR-7HDM',
    nivelConfianza: 'Autorreportado',
    municipio: 'Curití',
    descripcion: 'Los talleres de fique quedaron sin materia prima porque se quemó el cultivo',
    cantidad: 26,
    unidad: 'talleres',
    nivel: 'Moderado',
    clasificadoPor: 'Sugerencia',
    revisadoPor: 'Andrés Quintero Lozano',
    registradoEn: '2026-06-25T14:20:00Z',
  },

  // ── Salud ───────────────────────────────────────────────────────────────
  {
    sector: 'Salud',
    origen: 'CargaEdan',
    origenId: 'EDAN-LSA-027',
    nivelConfianza: 'Verificado',
    municipio: 'Los Santos',
    descripcion: 'Personas atendidas por afecciones respiratorias durante los días de humo',
    cantidad: 214,
    unidad: 'personas atendidas',
    nivel: 'Moderado',
    personasAfectadas: 214,
    clasificadoPor: 'Regla',
    registradoEn: '2026-06-26T12:10:00Z',
  },
  {
    sector: 'Salud',
    origen: 'RegistroDamnificado',
    origenId: 'CEN-GIR-0033',
    nivelConfianza: 'Censado',
    municipio: 'Girón',
    descripcion: 'Puesto de salud rural con cubierta comprometida por el calor del incendio',
    cantidad: 1,
    unidad: 'puesto de salud',
    nivel: 'Moderado',
    costoEstimado: 74_000_000,
    personasAfectadas: 610,
    clasificadoPor: 'Funcionario',
    revisadoPor: 'Diana Restrepo Tovar',
    registradoEn: '2026-06-26T18:45:00Z',
  },

  // ── Educación ───────────────────────────────────────────────────────────
  {
    sector: 'Educacion',
    origen: 'CargaEdan',
    origenId: 'EDAN-LSA-031',
    nivelConfianza: 'Verificado',
    municipio: 'Los Santos',
    descripcion: 'Sedes rurales usadas como puesto de mando, sin clases durante dos semanas',
    cantidad: 2,
    unidad: 'sedes educativas',
    nivel: 'Moderado',
    costoEstimado: 96_000_000,
    personasAfectadas: 180,
    clasificadoPor: 'Regla',
    registradoEn: '2026-06-27T10:05:00Z',
  },

  // ── Gobierno ────────────────────────────────────────────────────────────
  {
    sector: 'Gobierno',
    origen: 'CargaEdan',
    origenId: 'EDAN-LSA-035',
    nivelConfianza: 'Verificado',
    municipio: 'Los Santos',
    descripcion: 'Estación de bomberos con mangueras, motobombas y dotación consumidas',
    cantidad: 1,
    unidad: 'edificación pública',
    nivel: 'Grave',
    costoEstimado: 215_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-06-27T21:15:00Z',
  },

  // ── Sin clasificar ──────────────────────────────────────────────────────
  {
    sector: null,
    origen: 'ReporteCiudadano',
    origenId: 'RPT-CUR-5FTB',
    nivelConfianza: 'Autorreportado',
    municipio: 'Curití',
    descripcion: 'Se quemó la caseta comunal y la cancha, ahí hacíamos las reuniones y los partidos',
    cantidad: 1,
    unidad: 'reporte',
    clasificadoPor: 'Sugerencia',
    sectoresSugeridos: ['Cultura', 'Deporte'],
    registradoEn: '2026-06-25T09:35:00Z',
  },
  {
    sector: null,
    origen: 'ReporteCiudadano',
    origenId: 'RPT-GIR-2NKY',
    nivelConfianza: 'Autorreportado',
    municipio: 'Girón',
    descripcion: 'Quedó el humo metido en la escuela y los niños están tosiendo todo el día',
    cantidad: 1,
    unidad: 'reporte',
    clasificadoPor: 'Sugerencia',
    sectoresSugeridos: ['Educacion', 'Salud'],
    registradoEn: '2026-06-26T11:20:00Z',
  },
];

const SEMILLA_MESA: SemillaEventoCompleto = {
  evento: {
    id: 'EVT-2026-06-19-001',
    codigo: 'EVT-2026-06-19-001',
    nombre: 'Incendio forestal de la mesa de Los Santos, junio 2026',
    tipoEvento: 'incendio_forestal',
    declaratoria: 'CalamidadPublica',
    nivelDeclaratoria: 'Municipal',
    numeroDecreto: 'Decreto Municipal 118 de 2026',
    fechaDeclaratoria: '2026-06-20T14:00:00Z',
    fechaEvento: '2026-06-18T13:30:00Z',
    departamentos: ['Santander'],
    estado: 'EnRecuperacion',
    personasAfectadas: 2380,
  },
  prefijoDano: 'DSS',
  fechaCorte: '2026-06-28',
  cobertura: COBERTURA_MESA,
  danos: DANOS_MESA,
  estados: {
    Agropecuario: 'Enviado',
    Vivienda: 'Enviado',
    Transporte: 'Enviado',
    ComercioIndustria: 'Enviado',
    Energia: 'Enviado',
    AguaYSaneamiento: 'Enviado',
    Gobierno: 'Enviado',
    Salud: 'Aprobado',
    Educacion: 'Aprobado',
  },
  firmas: {
    Agropecuario: { por: 'Andrés Quintero Lozano', en: '2026-06-26T09:10:00Z' },
    Vivienda: { por: 'Andrés Quintero Lozano', en: '2026-06-26T09:25:00Z' },
    Transporte: { por: 'Diana Restrepo Tovar', en: '2026-06-26T15:40:00Z' },
    ComercioIndustria: { por: 'Andrés Quintero Lozano', en: '2026-06-27T08:55:00Z' },
    Energia: { por: 'Diana Restrepo Tovar', en: '2026-06-27T11:30:00Z' },
    AguaYSaneamiento: { por: 'Andrés Quintero Lozano', en: '2026-06-27T16:05:00Z' },
    Gobierno: { por: 'Diana Restrepo Tovar', en: '2026-06-28T10:20:00Z' },
    Salud: { por: 'Diana Restrepo Tovar', en: '2026-06-28T14:45:00Z' },
    Educacion: { por: 'Andrés Quintero Lozano', en: '2026-06-28T15:10:00Z' },
  },
  envios: [
    { sector: 'Agropecuario', por: 'Andrés Quintero Lozano', en: '2026-06-26T09:12:00Z' },
    { sector: 'Vivienda', por: 'Andrés Quintero Lozano', en: '2026-06-26T09:28:00Z' },
    { sector: 'Transporte', por: 'Diana Restrepo Tovar', en: '2026-06-26T15:44:00Z' },
    { sector: 'ComercioIndustria', por: 'Andrés Quintero Lozano', en: '2026-06-27T09:00:00Z' },
    { sector: 'Energia', por: 'Diana Restrepo Tovar', en: '2026-06-27T11:33:00Z' },
    { sector: 'AguaYSaneamiento', por: 'Andrés Quintero Lozano', en: '2026-06-27T16:08:00Z' },
    { sector: 'Gobierno', por: 'Diana Restrepo Tovar', en: '2026-06-28T10:24:00Z' },
  ],
};

/*
 * ───────────────────────────────────────────────────────────────────────────
 *  Evento 4 — Deslizamientos de la cordillera nariñense (Nariño)
 *
 *  Sin declaratoria. Hay daños censados y verificados, pero **ningún decreto**,
 *  y sin decreto no hay amparo legal que citar en el oficio: los paquetes
 *  quedan en borrador aunque las cifras estén listas. Es un estado real y
 *  frecuente, y esconderlo daría a entender que basta con tener el dato.
 * ───────────────────────────────────────────────────────────────────────────
 */

const COBERTURA_NARINO: readonly CoberturaMunicipio[] = [
  {
    municipio: 'Samaniego',
    departamento: 'Nariño',
    estado: 'ConEdan',
    reportesRecibidos: 21,
    ultimoDatoEn: '2026-08-14T17:25:00Z',
  },
  {
    municipio: 'Ricaurte',
    departamento: 'Nariño',
    estado: 'SoloAutorreportes',
    reportesRecibidos: 14,
    ultimoDatoEn: '2026-08-14T15:40:00Z',
  },
  {
    municipio: 'Mallama',
    departamento: 'Nariño',
    estado: 'SoloAutorreportes',
    reportesRecibidos: 8,
    ultimoDatoEn: '2026-08-13T19:10:00Z',
  },
  {
    municipio: 'Túquerres',
    departamento: 'Nariño',
    estado: 'SoloAutorreportes',
    reportesRecibidos: 6,
    ultimoDatoEn: '2026-08-13T12:05:00Z',
  },
  {
    municipio: 'Barbacoas',
    departamento: 'Nariño',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Providencia',
    departamento: 'Nariño',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Linares',
    departamento: 'Nariño',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
  {
    municipio: 'Ancuya',
    departamento: 'Nariño',
    estado: 'EnSilencio',
    reportesRecibidos: 0,
    ultimoDatoEn: null,
  },
];

const DANOS_NARINO: readonly SemillaDano[] = [
  {
    sector: 'Transporte',
    origen: 'CargaEdan',
    origenId: 'EDAN-SAM-005',
    nivelConfianza: 'Verificado',
    municipio: 'Samaniego',
    descripcion: 'Vía Samaniego – Túquerres con banca perdida en dos sitios críticos',
    cantidad: 4,
    unidad: 'km de vía',
    nivel: 'Grave',
    costoEstimado: 1_480_000_000,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-11T14:15:00Z',
  },
  {
    sector: 'Vivienda',
    origen: 'CargaEdan',
    origenId: 'EDAN-SAM-009',
    nivelConfianza: 'Verificado',
    municipio: 'Samaniego',
    descripcion: 'Viviendas sepultadas por movimiento en masa en la vereda El Salado',
    cantidad: 11,
    unidad: 'viviendas',
    nivel: 'DestruccionTotal',
    costoEstimado: 495_000_000,
    personasAfectadas: 42,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-11T16:40:00Z',
  },
  {
    sector: 'AguaYSaneamiento',
    origen: 'CargaEdan',
    origenId: 'EDAN-SAM-014',
    nivelConfianza: 'Verificado',
    municipio: 'Samaniego',
    descripcion: 'Bocatoma del acueducto rural sepultada por el deslizamiento',
    cantidad: 1,
    unidad: 'bocatoma',
    nivel: 'Grave',
    costoEstimado: 180_000_000,
    personasAfectadas: 1400,
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-12T09:30:00Z',
  },
  {
    sector: 'Educacion',
    origen: 'RegistroDamnificado',
    origenId: 'CEN-SAM-0011',
    nivelConfianza: 'Censado',
    municipio: 'Samaniego',
    descripcion: 'Sede educativa rural con talud inestable a diez metros del patio',
    cantidad: 1,
    unidad: 'sede educativa',
    nivel: 'Grave',
    costoEstimado: 130_000_000,
    personasAfectadas: 210,
    clasificadoPor: 'Funcionario',
    revisadoPor: 'Diana Restrepo Tovar',
    registradoEn: '2026-08-14T17:25:00Z',
  },
  {
    sector: 'Transporte',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-RIC-6PDX',
    nivelConfianza: 'Autorreportado',
    municipio: 'Ricaurte',
    descripcion: 'Un derrumbe tapó la vía a la cabecera y llevamos dos días sin poder salir',
    cantidad: 1,
    unidad: 'vía bloqueada',
    nivel: 'Grave',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-12T11:05:00Z',
  },
  {
    sector: 'Transporte',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-MAL-4KTC',
    nivelConfianza: 'Autorreportado',
    municipio: 'Mallama',
    descripcion: 'El puente colgante que usamos para cruzar quedó torcido y da miedo pasar',
    cantidad: 1,
    unidad: 'puente peatonal',
    nivel: 'Moderado',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-13T08:50:00Z',
  },
  {
    sector: 'Vivienda',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-TUQ-9JSN',
    nivelConfianza: 'Autorreportado',
    municipio: 'Túquerres',
    descripcion: 'Las casas del barrio alto están agrietadas y el terreno se sigue moviendo',
    cantidad: 23,
    unidad: 'viviendas',
    nivel: 'Grave',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-13T12:05:00Z',
  },
  {
    sector: 'Agropecuario',
    origen: 'ReporteCiudadano',
    origenId: 'RPT-RIC-1LWQ',
    nivelConfianza: 'Autorreportado',
    municipio: 'Ricaurte',
    descripcion: 'Los cultivos de plátano y caña de la ladera se fueron con el barro',
    cantidad: 60,
    unidad: 'hectáreas',
    nivel: 'Grave',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-14T10:35:00Z',
  },

  // ── Sin clasificar ──────────────────────────────────────────────────────
  {
    sector: null,
    origen: 'ReporteCiudadano',
    origenId: 'RPT-MAL-7CVE',
    nivelConfianza: 'Autorreportado',
    municipio: 'Mallama',
    descripcion: 'Se fue el agua y el camino al mismo tiempo, quedamos sin nada de las dos cosas',
    cantidad: 1,
    unidad: 'reporte',
    clasificadoPor: 'Sugerencia',
    sectoresSugeridos: ['AguaYSaneamiento', 'Transporte'],
    registradoEn: '2026-08-13T19:10:00Z',
  },
  {
    sector: null,
    origen: 'ReporteCiudadano',
    origenId: 'RPT-TUQ-3BMR',
    nivelConfianza: 'Autorreportado',
    municipio: 'Túquerres',
    descripcion: 'Hay una familia durmiendo donde el vecino porque la casa se está partiendo',
    cantidad: 1,
    unidad: 'reporte',
    clasificadoPor: 'Sugerencia',
    sectoresSugeridos: ['Vivienda', 'InclusionSocial'],
    registradoEn: '2026-08-13T11:45:00Z',
  },
];

const SEMILLA_NARINO: SemillaEventoCompleto = {
  evento: {
    id: 'EVT-2026-08-11-004',
    codigo: 'EVT-2026-08-11-004',
    nombre: 'Deslizamientos de la cordillera nariñense, agosto 2026',
    tipoEvento: 'deslizamiento',
    declaratoria: 'Ninguna',
    fechaEvento: '2026-08-09T22:50:00Z',
    departamentos: ['Nariño'],
    estado: 'Activo',
    personasAfectadas: 1260,
  },
  prefijoDano: 'DSN',
  fechaCorte: '2026-08-11',
  cobertura: COBERTURA_NARINO,
  danos: DANOS_NARINO,
  // Sin estados, firmas ni envíos: sin decreto no hay amparo que citar.
};

/*
 * ───────────────────────────────────────────────────────────────────────────
 *  Construcción
 * ───────────────────────────────────────────────────────────────────────────
 */

/** El dato más reciente que llegó de cualquier municipio, o `null` si no llegó ninguno. */
function ultimoDatoDeLaCobertura(cobertura: readonly CoberturaMunicipio[]): string | null {
  // Comparar cadenas alcanza: todas son ISO-8601 en UTC y con el mismo formato.
  return cobertura.reduce<string | null>((ultimo, municipio) => {
    if (municipio.ultimoDatoEn === null) return ultimo;
    if (ultimo === null || municipio.ultimoDatoEn > ultimo) return municipio.ultimoDatoEn;
    return ultimo;
  }, null);
}

/**
 * Arma un desastre completo a partir de su semilla.
 *
 * Todo lo derivable se deriva aquí —el departamento de cada daño, el último
 * dato del evento, los totales de cada paquete y el cuerpo de cada correo— para
 * que no exista un segundo sitio donde la misma cifra pueda decir otra cosa.
 *
 * Lo que no cuadra revienta al importar el módulo, no al pintar la pantalla: un
 * dato incoherente sembrado es una demo que muestra justo la mentira que este
 * módulo viene a denunciar.
 */
function construirEvento(semilla: SemillaEventoCompleto): DatosEvento {
  const cobertura: CoberturaMunicipio[] = [...semilla.cobertura];
  const porMunicipio = new Map(cobertura.map((municipio) => [municipio.municipio, municipio]));

  const evento: Evento = {
    ...semilla.evento,
    ultimoDatoEn: ultimoDatoDeLaCobertura(cobertura),
  };

  const danos: DanoSectorizado[] = semilla.danos.map((dano, indice) => {
    const territorio = porMunicipio.get(dano.municipio);
    if (territorio === undefined) {
      throw new Error(`${evento.codigo}: daño en ${dano.municipio}, que no está en su cobertura`);
    }

    return {
      ...dano,
      id: `${semilla.prefijoDano}-${String(indice + 1).padStart(3, '0')}`,
      eventoId: evento.id,
      departamento: territorio.departamento,
      coordenadas: COORDENADAS[dano.municipio],
    };
  });

  const resumenes = new Map(agruparPorSector(danos).map((resumen) => [resumen.sector, resumen]));

  const paquetes: PaqueteMinisterio[] = SECTORES.map((sector, indice) => {
    const resumen = resumenes.get(sector);
    const ficha = CATALOGO_SECTORES[sector];
    const firma = semilla.firmas?.[sector];
    const estado: EstadoPaquete = semilla.estados?.[sector] ?? 'Borrador';
    const codigo = `PQT-${semilla.fechaCorte}-${String(indice + 1).padStart(4, '0')}`;

    const paquete: PaqueteMinisterio = {
      id: codigo,
      codigo,
      eventoId: evento.id,
      sector,
      entidad: ficha.entidad,
      correoDestino: ficha.correo,
      totalDanos: resumen?.totalDanos ?? 0,
      totalMunicipios: resumen?.totalMunicipios ?? 0,
      costoEstimadoTotal: resumen?.costoEstimado ?? 0,
      estado,
      aprobadoPor: firma?.por,
      aprobadoEn: firma?.en,
    };

    if (estado !== 'Enviado') return paquete;

    return {
      ...paquete,
      nombreArchivoCsv: nombreArchivoCsv(paquete),
      nombreArchivoPdf: `${codigo}-oficio.pdf`,
    };
  });

  /*
   * El cuerpo del correo no se escribe aquí, se compone con la misma función
   * que usa la pantalla del paquete. Así lo que quedó registrado es exactamente
   * lo que el sistema manda, y no una versión bonita escrita a mano que nadie
   * volvería a comparar.
   */
  const envios: EnvioRegistrado[] = (semilla.envios ?? []).map(({ sector, por, en }, indice) => {
    const paquete = paquetes.find((candidato) => candidato.sector === sector);
    if (paquete === undefined || paquete.estado !== 'Enviado') {
      throw new Error(`${evento.codigo}: envío sembrado de ${sector} sin paquete remitido`);
    }

    const correo = componerCorreo(paquete, evento);

    return {
      id: `ENV-${semilla.fechaCorte}-${String(indice + 1).padStart(3, '0')}`,
      paqueteId: paquete.id,
      sector,
      entidad: paquete.entidad,
      destinatario: correo.destinatario,
      asunto: correo.asunto,
      cuerpo: correo.cuerpo,
      enviadoPor: por,
      enviadoEn: en,
      // Hoy no hay proveedor de correo y no se finge que lo haya (decisión 1).
      modo: 'Simulado',
      archivos: [nombreArchivoCsv(paquete), `${paquete.codigo}-oficio.pdf`],
    };
  });

  return { evento, cobertura, danos, paquetes, envios };
}

/**
 * Los cuatro desastres sembrados, en el orden en que los muestra la lista: el
 * más reciente primero, y el cerrado o en recuperación al final.
 */
const DATOS_POR_EVENTO: readonly DatosEvento[] = [
  SEMILLA_SAN_JORGE,
  SEMILLA_CORDILLERA,
  SEMILLA_NARINO,
  SEMILLA_MESA,
].map(construirEvento);

const INDICE = new Map(DATOS_POR_EVENTO.map((datos) => [datos.evento.id, datos]));

/*
 * ───────────────────────────────────────────────────────────────────────────
 *  Acceso
 * ───────────────────────────────────────────────────────────────────────────
 */

/** Los desastres que ve el gestor al entrar al módulo. */
export const mockEventos: Evento[] = DATOS_POR_EVENTO.map((datos) => datos.evento);

/**
 * Busca un desastre por el código que viaja en la URL.
 *
 * Devuelve `undefined` si no existe: el código sale de la barra de direcciones
 * y es texto libre hasta que se compruebe.
 */
export function eventoPorCodigo(codigo: string): Evento | undefined {
  return mockEventos.find((evento) => evento.codigo === codigo || evento.id === codigo);
}

/** Los daños de un desastre, incluidos los que todavía no tienen sector. */
export function danosDelEvento(eventoId: string): DanoSectorizado[] {
  return INDICE.get(eventoId)?.danos ?? [];
}

/** Los daños de un desastre que esperan que un funcionario les asigne sector. */
export function danosSinSectorDelEvento(eventoId: string): DanoSectorizado[] {
  return danosDelEvento(eventoId).filter((dano) => dano.sector === null);
}

/** Cuánto se sabe de cada municipio afectado por un desastre. */
export function coberturaDelEvento(eventoId: string): CoberturaMunicipio[] {
  return INDICE.get(eventoId)?.cobertura ?? [];
}

/** Los trece paquetes de un desastre, **incluidos los que van en cero**. */
export function paquetesDelEvento(eventoId: string): PaqueteMinisterio[] {
  return INDICE.get(eventoId)?.paquetes ?? [];
}

/** La bitácora de envíos de un desastre. Vacía mientras no se haya remitido nada. */
export function enviosDelEvento(eventoId: string): EnvioRegistrado[] {
  return INDICE.get(eventoId)?.envios ?? [];
}

/**
 * Busca el paquete de un sector dentro de un desastre.
 *
 * Sin `eventoId` responde por el primer desastre sembrado, que es lo que
 * esperan las pantallas que todavía no reciben el evento por la URL.
 */
export function paquetePorSector(
  sector: string,
  eventoId: string = EVENTO_ID,
): PaqueteMinisterio | undefined {
  return paquetesDelEvento(eventoId).find((paquete) => paquete.sector === sector);
}

/*
 * ───────────────────────────────────────────────────────────────────────────
 *  Nombres históricos — todos apuntan al primer desastre
 *
 *  Se conservan para no romper las pantallas y las pruebas que ya existen. Lo
 *  nuevo debería usar las funciones de acceso de arriba, que sí saben de qué
 *  evento hablan.
 * ───────────────────────────────────────────────────────────────────────────
 */

/** El primer desastre sembrado: las inundaciones del bajo San Jorge. */
export const mockEvento: Evento = mockEventos[0];

/** @see coberturaDelEvento */
export const mockCobertura: CoberturaMunicipio[] = coberturaDelEvento(EVENTO_ID);

/** @see danosDelEvento */
export const mockDanos: DanoSectorizado[] = danosDelEvento(EVENTO_ID);

/** @see danosSinSectorDelEvento */
export const mockDanosSinSector: DanoSectorizado[] = danosSinSectorDelEvento(EVENTO_ID);

/** @see paquetesDelEvento */
export const mockPaquetes: PaqueteMinisterio[] = paquetesDelEvento(EVENTO_ID);

/** @see enviosDelEvento */
export const mockEnvios: EnvioRegistrado[] = enviosDelEvento(EVENTO_ID);
