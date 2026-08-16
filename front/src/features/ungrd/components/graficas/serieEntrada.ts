import type { DanoSectorizado } from '@/types/sectorial';

/**
 * El cálculo detrás de la gráfica de entrada de datos: cuántos daños entraron
 * cada día y si dejaron de entrar.
 *
 * Está aparte del componente porque es puro —entran daños, sale una serie— y
 * porque es la parte que decide si el panel le dice a un funcionario que
 * levante el teléfono. Eso se prueba con números, no montando una pantalla.
 */

/**
 * Todo se agrupa en la hora de Colombia, no en la del navegador.
 *
 * Las fechas viajan en UTC: agrupar por el día del navegador movería un daño de
 * las 10 de la noche al día siguiente para quien abra el panel desde Europa, y
 * la curva contaría otra historia según dónde esté sentado quien mira.
 */
const ZONA = 'America/Bogota';

const CLAVE_DIA = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const MILISEGUNDOS_POR_DIA = 86_400_000;

/**
 * Tope de días dibujados.
 *
 * Una emergencia de seis meses convertiría la línea en un peine ilegible en un
 * portátil de 1280 px. Lo que la gráfica responde —«¿sigue entrando?»— se ve en
 * las últimas semanas, no en el histórico completo.
 */
const MAX_DIAS = 30;

/** Días seguidos sin un dato que hacen falta para hablar de entrada seca. */
const DIAS_SECOS = 3;

/** Un día de la serie: cuántos daños entraron. */
export interface PuntoSerie {
  /** `2026-08-13`, el día en hora de Colombia. */
  dia: string;
  total: number;
}

/** Desde cuándo y hasta cuándo se dibuja la serie. */
export interface RangoSerie {
  /** ISO-8601 de la declaratoria. Sin ella, la serie arranca en el primer daño. */
  desde?: string;
  /** Reloj, inyectable para que las pruebas no dependan del día en que corran. */
  ahora?: number;
}

/** El día colombiano al que pertenece un instante, en formato `2026-08-13`. */
export function diaColombiano(fecha: Date): string {
  return CLAVE_DIA.format(fecha);
}

/*
 * Se avanza desde el mediodía UTC —las 7 de la mañana en Colombia— y no desde
 * la medianoche: sumar 24 horas a un mediodía siempre cae en el día siguiente,
 * mientras que hacerlo desde el filo de la medianoche deja el resultado a
 * merced del desfase horario.
 */
function siguienteDia(clave: string): string {
  return diaColombiano(new Date(new Date(`${clave}T12:00:00Z`).getTime() + MILISEGUNDOS_POR_DIA));
}

/**
 * Cuenta los daños que entraron cada día, sin saltarse los días en blanco.
 *
 * Los días en cero son el dato: una serie que solo trajera los días con
 * registros dibujaría una línea siempre viva, que es justo lo contrario de lo
 * que esta gráfica tiene que poder mostrar.
 *
 * Y llega hasta hoy, no hasta el último daño, por lo mismo: si terminara en el
 * último registro, nunca podría verse que la información dejó de entrar.
 */
export function serieDiaria(
  danos: readonly DanoSectorizado[],
  { desde, ahora = Date.now() }: RangoSerie = {},
): PuntoSerie[] {
  const conteos = new Map<string, number>();
  for (const dano of danos) {
    const clave = diaColombiano(new Date(dano.registradoEn));
    conteos.set(clave, (conteos.get(clave) ?? 0) + 1);
  }

  const claves = [...conteos.keys()].sort();
  const primero = desde === undefined ? claves[0] : diaColombiano(new Date(desde));
  if (primero === undefined) return [];

  const hoy = diaColombiano(new Date(ahora));
  const masReciente = claves.length === 0 ? hoy : claves[claves.length - 1];
  const ultimo = masReciente > hoy ? masReciente : hoy;

  // Una declaratoria posterior al último dato conocido deja un solo punto: no
  // hay rango que recorrer, y un arreglo vacío escondería el día de hoy.
  if (primero > ultimo) return [{ dia: primero, total: conteos.get(primero) ?? 0 }];

  const serie: PuntoSerie[] = [];
  for (let dia = primero; dia <= ultimo; dia = siguienteDia(dia)) {
    serie.push({ dia, total: conteos.get(dia) ?? 0 });
  }

  return serie.slice(-MAX_DIAS);
}

/**
 * Si la entrada de información se secó: tres días seguidos sin un solo dato
 * mientras quedan municipios de los que nunca llegó nada.
 *
 * Las dos condiciones van juntas a propósito. Tres días en cero con todo el
 * territorio ya cubierto es una emergencia que se estabilizó, y anunciarlo como
 * problema sería gritar por nada.
 */
export function entradaSeca(serie: readonly PuntoSerie[], municipiosEnSilencio: number): boolean {
  if (municipiosEnSilencio <= 0 || serie.length < DIAS_SECOS) return false;
  return serie.slice(-DIAS_SECOS).every((punto) => punto.total === 0);
}
