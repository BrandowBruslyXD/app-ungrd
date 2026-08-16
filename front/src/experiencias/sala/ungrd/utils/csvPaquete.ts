import type { PaqueteMinisterio } from '@/experiencias/sala/ungrd/types/paquete';

/**
 * Generación del CSV de detalle que recibe el ministerio.
 *
 * Se arma en el navegador, sin librerías, con separador `;` y UTF-8 con BOM: es lo que
 * Excel en español espera. Sin el BOM las tildes salen rotas al abrirlo y el archivo
 * pierde credibilidad delante de quien tiene que usarlo.
 */

/** Marca de orden de bytes de UTF-8. Sin esto Excel en español rompe las tildes. */
export const BOM_UTF8 = '\uFEFF';

/** Separador de columnas. Excel en configuración regional española espera punto y coma. */
export const SEPARADOR_CSV = ';';

/** Fin de línea de Windows: es lo que espera Excel y no molesta al resto. */
const FIN_DE_LINEA = '\r\n';

/** Traduce una clave de i18n. Se inyecta para que las etiquetas del archivo salgan del mismo sitio que las de la pantalla. */
export type Traductor = (clave: string) => string;

/**
 * Escapa un valor para que un punto y coma, una comilla o un salto de línea dentro
 * del texto no partan la fila en dos columnas al abrir el archivo.
 */
export function escaparCampoCsv(valor: string): string {
  if (!/[";\r\n]/.test(valor)) return valor;
  return `"${valor.replace(/"/g, '""')}"`;
}

/** Nombre con el que se descarga el archivo. */
export function nombreArchivoCsv(paquete: PaqueteMinisterio): string {
  return `${paquete.codigo}_${paquete.sector}_danos.csv`;
}

/**
 * Arma el contenido completo del CSV: encabezado y una fila por daño.
 *
 * Los costos van como enteros sin separador de miles para que Excel los lea como número,
 * y los daños sin costo quedan en blanco: escribir cero sería afirmar que no cuesta nada.
 */
export function construirCsvPaquete(paquete: PaqueteMinisterio, traducir: Traductor): string {
  const encabezado = [
    'paquete.csv.colPaquete',
    'paquete.csv.colEvento',
    'paquete.csv.colDeclaratoria',
    'paquete.csv.colSector',
    'paquete.csv.colDepartamento',
    'paquete.csv.colMunicipio',
    'paquete.csv.colDescripcion',
    'paquete.csv.colCantidad',
    'paquete.csv.colUnidad',
    'paquete.csv.colNivel',
    'paquete.csv.colOrigen',
    'paquete.csv.colOrigenCodigo',
    'paquete.csv.colConfianza',
    'paquete.csv.colLatitud',
    'paquete.csv.colLongitud',
    'paquete.csv.colCosto',
    'paquete.csv.colFecha',
  ].map((clave) => traducir(clave));

  const declaratoria = traducir(`paquete.declaratoria.${paquete.evento.declaratoria}`);
  const sector = traducir(`paquete.sector.${paquete.sector}`);

  const filas = paquete.danos.map((dano) => [
    paquete.codigo,
    paquete.evento.nombre,
    paquete.evento.numeroDecreto ? `${declaratoria} · ${paquete.evento.numeroDecreto}` : declaratoria,
    sector,
    dano.departamento,
    dano.municipio,
    dano.descripcion,
    String(dano.cantidad),
    dano.unidad,
    dano.nivel ? traducir(`paquete.nivelDano.${dano.nivel}`) : '',
    traducir(`paquete.origen.${dano.origen}`),
    dano.origenCodigo,
    traducir(`paquete.confianza.${dano.nivelConfianza}`),
    String(dano.latitud),
    String(dano.longitud),
    dano.costoEstimado === null ? '' : String(dano.costoEstimado),
    dano.fecha,
  ]);

  return [encabezado, ...filas]
    .map((fila) => fila.map(escaparCampoCsv).join(SEPARADOR_CSV))
    .join(FIN_DE_LINEA);
}

/**
 * Dispara la descarga del CSV en el navegador.
 *
 * Se separa del armado para que el contenido se pueda probar sin depender del DOM.
 */
export function descargarCsvPaquete(paquete: PaqueteMinisterio, traducir: Traductor): void {
  const contenido = BOM_UTF8 + construirCsvPaquete(paquete, traducir);
  const archivo = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');

  enlace.href = url;
  enlace.download = nombreArchivoCsv(paquete);
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
