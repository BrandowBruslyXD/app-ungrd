import { ordenDelSector } from '@/lib/catalogoSectores';
import {
  SECTORES,
  type CoberturaMunicipio,
  type DanoSectorizado,
  type Evento,
  type NivelConfianza,
  type PaqueteMinisterio,
  type Sector,
} from '@/types/sectorial';

/**
 * Reglas del reparto sectorial: agrupaciones, totales y los dos entregables.
 *
 * Están aquí y no en las pantallas porque son lo que sostiene el módulo. Un
 * total mal sumado no se ve en una revisión visual, pero sí en una prueba; y
 * estas cifras terminan en un documento oficial dirigido a un ministerio.
 *
 * Todo lo de este archivo es puro: entra un arreglo, sale un valor. Sin fechas
 * del reloj, sin `localStorage`, sin red.
 */

/** Cuántos daños hay de cada nivel de confianza. */
export type DesgloseConfianza = Record<NivelConfianza, number>;

/** Una fila de la tabla del reparto: lo que le toca a un ministerio. */
export interface ResumenSector {
  sector: Sector;
  totalDanos: number;
  totalMunicipios: number;
  costoEstimado: number;
  personasAfectadas: number;
  /**
   * Proporción, nunca promedio.
   *
   * «8 verificados · 3 censados · 26 autorreportados» dice que casi todo el
   * volumen está sin verificar. Un promedio lo escondería detrás de una cifra
   * intermedia que no describe a ningún dato real.
   */
  confianza: DesgloseConfianza;
}

/** Lo que el ministerio pide: el desglose territorial de su sector. */
export interface ResumenMunicipio {
  municipio: string;
  departamento: string;
  totalDanos: number;
  costoEstimado: number;
  personasAfectadas: number;
  confianza: DesgloseConfianza;
}

/** Cuánto se sabe del territorio afectado, en cuatro cifras. */
export interface ResumenCobertura {
  /** Municipios afectados del evento. Es el denominador del «5 de 400». */
  totalMunicipios: number;
  conEdan: number;
  soloAutorreportes: number;
  enSilencio: number;
  /** `conEdan + soloAutorreportes`: de cuántos llegó algo, aunque sea sin verificar. */
  conInformacion: number;
}

/** El correo tal como saldría, para mostrarlo completo antes de aprobarlo. */
export interface CorreoCompuesto {
  destinatario: string;
  asunto: string;
  cuerpo: string;
}

function desgloseVacio(): DesgloseConfianza {
  return { Autorreportado: 0, Censado: 0, Verificado: 0 };
}

/**
 * Clave territorial: municipio **y** departamento.
 *
 * En Colombia hay municipios homónimos en departamentos distintos —Sucre está
 * en Sucre y en Santander—. Agrupar solo por nombre sumaría daños de dos sitios
 * que no tienen nada que ver y se los mandaría al ministerio como uno solo.
 */
function claveMunicipio(dano: DanoSectorizado): string {
  return `${dano.departamento}|${dano.municipio}`;
}

/**
 * Agrupa los daños por sector y devuelve **los trece**, incluidos los que van
 * en cero.
 *
 * Que un ministerio no tenga nada es información, no un hueco que ocultar: la
 * pantalla los muestra apagados, y para eso tienen que llegar en la lista.
 *
 * Los daños sin sector (`sector: null`) quedan fuera a propósito. No son de
 * nadie hasta que un funcionario los resuelva, y colarlos en un paquete sería
 * mandarle a un ministerio algo que nadie revisó.
 *
 * Orden: costo estimado descendente, porque es lo que va a pesar en el Plan de
 * Acción Específico. Se desempata por volumen de daños y, si aun así empatan,
 * por el orden del formato oficial, para que la tabla no baile entre recargas.
 */
export function agruparPorSector(danos: readonly DanoSectorizado[]): ResumenSector[] {
  const municipiosPorSector = new Map<Sector, Set<string>>();
  const resumenes = new Map<Sector, ResumenSector>();

  for (const sector of SECTORES) {
    municipiosPorSector.set(sector, new Set<string>());
    resumenes.set(sector, {
      sector,
      totalDanos: 0,
      totalMunicipios: 0,
      costoEstimado: 0,
      personasAfectadas: 0,
      confianza: desgloseVacio(),
    });
  }

  for (const dano of danos) {
    if (dano.sector === null) continue;

    const resumen = resumenes.get(dano.sector);
    const municipios = municipiosPorSector.get(dano.sector);
    if (resumen === undefined || municipios === undefined) continue;

    resumen.totalDanos += 1;
    resumen.costoEstimado += dano.costoEstimado ?? 0;
    resumen.personasAfectadas += dano.personasAfectadas ?? 0;
    resumen.confianza[dano.nivelConfianza] += 1;
    municipios.add(claveMunicipio(dano));
  }

  for (const [sector, municipios] of municipiosPorSector) {
    const resumen = resumenes.get(sector);
    if (resumen !== undefined) resumen.totalMunicipios = municipios.size;
  }

  return [...resumenes.values()].sort((a, b) => {
    if (b.costoEstimado !== a.costoEstimado) return b.costoEstimado - a.costoEstimado;
    if (b.totalDanos !== a.totalDanos) return b.totalDanos - a.totalDanos;
    return ordenDelSector(a.sector) - ordenDelSector(b.sector);
  });
}

/**
 * Totales por municipio: así es como el ministerio pide la información.
 *
 * Solo aparecen los municipios que tienen algún daño en la lista recibida —el
 * que pregunta «de cuáles no sé nada» tiene el subpanel de cobertura, que es
 * otra pregunta—. Los daños sin sector se cuentan igual, porque esta función
 * también sirve para mirar el consolidado completo del evento.
 *
 * Orden: costo descendente y, a igual costo, alfabético en español, para que la
 * tabla sea estable y se pueda copiar a un correo sin que cambie de fila.
 */
export function totalesPorMunicipio(danos: readonly DanoSectorizado[]): ResumenMunicipio[] {
  const totales = new Map<string, ResumenMunicipio>();

  for (const dano of danos) {
    const clave = claveMunicipio(dano);
    let resumen = totales.get(clave);

    if (resumen === undefined) {
      resumen = {
        municipio: dano.municipio,
        departamento: dano.departamento,
        totalDanos: 0,
        costoEstimado: 0,
        personasAfectadas: 0,
        confianza: desgloseVacio(),
      };
      totales.set(clave, resumen);
    }

    resumen.totalDanos += 1;
    resumen.costoEstimado += dano.costoEstimado ?? 0;
    resumen.personasAfectadas += dano.personasAfectadas ?? 0;
    resumen.confianza[dano.nivelConfianza] += 1;
  }

  return [...totales.values()].sort((a, b) => {
    if (b.costoEstimado !== a.costoEstimado) return b.costoEstimado - a.costoEstimado;
    return a.municipio.localeCompare(b.municipio, 'es');
  });
}

/**
 * Cuenta los municipios por estado de cobertura.
 *
 * La cifra que importa es `enSilencio`: un municipio sin información no es un
 * municipio sin daños, es uno del que no sabemos nada.
 */
export function resumenCobertura(cobertura: readonly CoberturaMunicipio[]): ResumenCobertura {
  const conEdan = cobertura.filter((m) => m.estado === 'ConEdan').length;
  const soloAutorreportes = cobertura.filter((m) => m.estado === 'SoloAutorreportes').length;
  const enSilencio = cobertura.filter((m) => m.estado === 'EnSilencio').length;

  return {
    totalMunicipios: cobertura.length,
    conEdan,
    soloAutorreportes,
    enSilencio,
    conInformacion: conEdan + soloAutorreportes,
  };
}

const SEPARADOR_CSV = ';';

/**
 * Excel en español espera `;` como separador y, sin la marca de orden de bytes,
 * abre el archivo en la codificación del sistema y rompe todas las tildes:
 * «Ciénaga de Oro» se lee «CiÃ©naga de Oro». Un adjunto que se abre así le
 * quita credibilidad al oficio entero antes de que alguien lea una cifra
 * (decisión 2).
 */
const BOM_UTF8 = '\uFEFF';

const ENCABEZADOS_CSV: readonly string[] = [
  'Sector',
  'Municipio',
  'Departamento',
  'Descripción',
  'Cantidad',
  'Unidad',
  'Nivel',
  'Costo estimado (COP)',
  'Origen',
  'Nivel de confianza',
  'Latitud',
  'Longitud',
  'Fecha del dato',
];

/**
 * Un campo se entrecomilla solo si lo necesita, y las comillas internas se
 * duplican. Sin esto, una descripción con punto y coma parte la fila en dos y
 * el ministerio abre un archivo desalineado.
 */
function escaparCampo(valor: string): string {
  if (!/[";\r\n]/.test(valor)) return valor;
  return `"${valor.replace(/"/g, '""')}"`;
}

function numeroCsv(valor: number | undefined): string {
  return valor === undefined ? '' : String(valor);
}

/**
 * Arma el CSV de detalle del paquete: una línea por daño.
 *
 * Filtra por evento **y** por sector aunque le pasen el consolidado completo.
 * Es deliberado: el archivo se le manda a un ministerio, y que se cuele el daño
 * de otro sector no es un error de presentación, es información que no le
 * corresponde.
 *
 * Devuelve el contenido listo para un `Blob` de tipo `text/csv;charset=utf-8`.
 */
export function armarCsvPaquete(
  paquete: PaqueteMinisterio,
  danos: readonly DanoSectorizado[],
): string {
  const delPaquete = danos.filter(
    (dano) => dano.eventoId === paquete.eventoId && dano.sector === paquete.sector,
  );

  const filas = delPaquete.map((dano) =>
    [
      dano.sector ?? '',
      dano.municipio,
      dano.departamento,
      dano.descripcion,
      String(dano.cantidad),
      dano.unidad,
      dano.nivel ?? '',
      numeroCsv(dano.costoEstimado),
      dano.origen,
      dano.nivelConfianza,
      numeroCsv(dano.coordenadas?.lat),
      numeroCsv(dano.coordenadas?.lng),
      dano.registradoEn,
    ]
      .map(escaparCampo)
      .join(SEPARADOR_CSV),
  );

  // CRLF, que es lo que Excel espera; con solo `\n` algunas versiones pegan las filas.
  return `${BOM_UTF8}${[ENCABEZADOS_CSV.join(SEPARADOR_CSV), ...filas].join('\r\n')}\r\n`;
}

/** Nombre sugerido para el archivo adjunto. Sin espacios ni tildes: viaja por correo. */
export function nombreArchivoCsv(paquete: PaqueteMinisterio): string {
  return `${paquete.codigo}-${paquete.sector}.csv`;
}

function fechaLegible(iso: string | undefined): string {
  return iso === undefined ? 'sin fecha' : iso.slice(0, 10);
}

function amparoLegal(evento: Evento): string {
  if (evento.declaratoria === 'Ninguna' || evento.numeroDecreto === undefined) {
    return 'Sin declaratoria vigente asociada.';
  }
  return `${evento.numeroDecreto} del ${fechaLegible(evento.fechaDeclaratoria)}.`;
}

/**
 * Compone el correo que recibiría el ministerio, para mostrarlo completo antes
 * de que el funcionario lo apruebe.
 *
 * Recibe el evento además del paquete porque el oficio cita el evento y el
 * decreto que lo ampara, y el paquete solo guarda el identificador del evento.
 *
 * El texto no pasa por i18n a propósito: no es interfaz, es el contenido de un
 * documento oficial dirigido a una entidad del Estado colombiano. Traducirlo
 * cambiaría lo que dice el oficio.
 *
 * Aquí no se envía nada. Este es el único punto de integración con un proveedor
 * de correo el día que exista (decisión 1).
 */
export function componerCorreo(paquete: PaqueteMinisterio, evento: Evento): CorreoCompuesto {
  const asunto = `Remisión de daños sector ${paquete.sector} — ${evento.nombre} (${paquete.codigo})`;

  const cuerpo = [
    `Señores ${paquete.entidad}:`,
    '',
    'La Unidad Nacional para la Gestión del Riesgo de Desastres remite el consolidado de daños',
    `del sector ${paquete.sector} correspondiente al evento ${evento.nombre} (${evento.codigo}).`,
    '',
    `Amparo legal: ${amparoLegal(evento)}`,
    '',
    `Daños consolidados: ${paquete.totalDanos}`,
    `Municipios con afectación reportada: ${paquete.totalMunicipios}`,
    `Costo estimado: $${paquete.costoEstimadoTotal.toLocaleString('es-CO')} COP`,
    '',
    'Se adjunta el detalle línea a línea en formato CSV. Cada registro indica su nivel de',
    'confianza (Autorreportado, Censado o Verificado); los autorreportados no han sido',
    'verificados en terreno y se remiten como indicio, no como dato consolidado.',
    '',
    'Cordialmente,',
    'Unidad Nacional para la Gestión del Riesgo de Desastres',
  ].join('\n');

  return { destinatario: paquete.correoDestino, asunto, cuerpo };
}
