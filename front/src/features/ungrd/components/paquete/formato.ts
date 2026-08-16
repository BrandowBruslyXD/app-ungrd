/**
 * Formato de cifras y fechas del paquete del ministerio.
 *
 * Vive aparte porque lo usan la pantalla y sus cuatro tablas, y porque estas
 * cifras se leen al lado del CSV que se descarga: si la pantalla escribe
 * «2.880.000.000» y el archivo otra cosa, el funcionario deja de creerle a los
 * dos.
 */

const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const MILES = new Intl.NumberFormat('es-CO');

/**
 * Todo se fecha en la hora de Colombia, no en la del navegador.
 *
 * Las fechas viajan en UTC y aquí se citan un decreto y la hora de una firma.
 * Sin fijar la zona, un funcionario que abra esto desde otro huso vería el
 * decreto un día corrido respecto del panel del evento, que sí la fija: la
 * misma fecha diciendo dos cosas distintas en dos pantallas del mismo módulo.
 */
const ZONA = 'America/Bogota';

const FECHA_LARGA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: ZONA,
});

const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: ZONA,
});

/** Pesos colombianos sin centavos: en un oficio los decimales son ruido. */
export function formatearPesos(monto: number): string {
  return PESOS.format(monto);
}

/** Miles con punto, como se escriben las cifras en Colombia. */
export function formatearNumero(valor: number): string {
  return MILES.format(valor);
}

/** Día y hora. Se usa para la firma de aprobación, que es un hecho con hora. */
export function formatearFechaHora(iso: string): string {
  return FECHA_LARGA.format(new Date(iso));
}

/** Solo el día. Se usa para la fecha del decreto, que no tiene hora. */
export function formatearDia(iso: string): string {
  return FECHA_CORTA.format(new Date(iso));
}
