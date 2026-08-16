/**
 * Formato de cifras y fechas del panel del reparto sectorial.
 *
 * Está aquí y no en `lib/` porque no es una regla del reparto: es cómo se
 * escriben los números en estas pantallas. Las reglas —lo que termina en el
 * CSV y en el oficio— viven en `@/lib/sectorial` y se prueban aparte.
 */

/**
 * Todo se formatea en la zona horaria de Colombia, no en la del navegador.
 *
 * Las fechas viajan en UTC, y un funcionario que abra el panel desde otro huso
 * vería la declaratoria un día corrido. En un documento que cita un decreto, la
 * fecha no puede depender de dónde esté sentado quien mira.
 */
const ZONA = 'America/Bogota';

const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const ENTEROS = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

const FECHA = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: ZONA,
});

const FECHA_HORA = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: ZONA,
});

const MILISEGUNDOS_POR_DIA = 86_400_000;

/** Pesos colombianos completos, sin decimales. Para las tablas, donde la cifra exacta importa. */
export function formatearPesos(valor: number): string {
  return PESOS.format(valor);
}

/** Cantidades con separador de miles: «18.450». */
export function formatearEntero(valor: number): string {
  return ENTEROS.format(valor);
}

/**
 * La misma cifra en millones.
 *
 * Un indicador no puede decir «$34.019.000.000»: a cuerpo grande se sale de la
 * tarjeta y, peor, nadie cuenta trece dígitos de un vistazo. En la tabla del
 * reparto sí va completa, que es donde alguien la va a copiar.
 */
export function formatearMillones(valor: number): string {
  return ENTEROS.format(Math.round(valor / 1_000_000));
}

/** Fecha sola: «12 ago 2026». */
export function formatearFecha(iso: string): string {
  return FECHA.format(new Date(iso));
}

/** Fecha con hora: «15 ago 2026, 09:07». Para la bitácora, donde el orden del día importa. */
export function formatearFechaHora(iso: string): string {
  return FECHA_HORA.format(new Date(iso));
}

/**
 * Días completos corridos desde una fecha.
 *
 * Es el contador del plazo del Plan de Acción Específico, y hoy nadie lo ve.
 * Nunca devuelve negativo: una fecha en el futuro son cero días corridos, no
 * «menos tres».
 */
export function diasTranscurridos(iso: string, ahora: number = Date.now()): number {
  const transcurrido = ahora - new Date(iso).getTime();
  return transcurrido <= 0 ? 0 : Math.floor(transcurrido / MILISEGUNDOS_POR_DIA);
}
