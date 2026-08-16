/**
 * Cómo se dice cuándo se observó algo.
 *
 * Aquí no se escribe «en tiempo real» ni se escribirá. Ninguna de las tres
 * fuentes lo es: un satélite de órbita polar pasa dos veces al día y su mosaico
 * se publica entre una y tres horas después; GDACS revisa episodios cada varias
 * horas; USGS es lo más rápido y aun así tarda un minuto en publicar. Lo honesto
 * —y lo que suena mejor ante alguien que sabe cómo funciona un satélite— es
 * decir cuánto hace que se observó y dejar que quien mira saque su conclusión.
 *
 * Devuelve la clave de i18n en vez del texto ya armado: así la redacción vive
 * entera en `es.json`, este módulo se puede probar sin montar i18n y no hay
 * ningún texto incrustado en código.
 */

/**
 * Clave de traducción y sus valores, lista para pasársela a `t`.
 *
 * El valor se llama `count` y no `minutos` u `horas` porque es el nombre que
 * i18next reserva para escoger entre singular y plural: «hace 1 hora» y «hace
 * 3 horas» salen de la misma llamada sin condicionales en el componente.
 */
export interface TiempoRelativo {
  readonly clave: string;
  readonly valores: Readonly<Record<string, number>>;
}

const MINUTO_MS = 60_000;
const HORA_MS = 3_600_000;
const DIA_MS = 86_400_000;

/**
 * A partir de cuántas horas se pasa a contar en días.
 *
 * «Hace 30 h» obliga a hacer la cuenta mental; «hace 1 d» se entiende de una.
 * El corte va en 48 h y no en 24 para no perder la resolución del «ayer», que
 * en una sala de crisis todavía es información operativa.
 */
const HORAS_ANTES_DE_CONTAR_DIAS = 48;

/**
 * Convierte una hora de observación en «hace tanto».
 *
 * @param iso Hora de observación en ISO-8601. Si no se puede leer, devuelve `null`
 *   y quien llama simplemente no escribe la línea: mejor callar que inventarla.
 * @param ahora Momento de referencia. Se inyecta para poder probarlo.
 */
export function tiempoDesde(iso: string, ahora: Date = new Date()): TiempoRelativo | null {
  const observado = new Date(iso).getTime();
  if (Number.isNaN(observado)) {
    return null;
  }

  /*
   * El reloj del navegador puede ir atrasado respecto al del servicio y dar una
   * diferencia negativa. Se recorta a cero: «hace -3 minutos» delata un error de
   * la herramienta, «hace un momento» es lo que el gestor necesitaba saber.
   */
  const transcurrido = Math.max(0, ahora.getTime() - observado);

  if (transcurrido < MINUTO_MS) {
    return { clave: 'manager.observacion.haceInstantes', valores: {} };
  }

  if (transcurrido < HORA_MS) {
    return {
      clave: 'manager.observacion.haceMinutos',
      valores: { count: Math.floor(transcurrido / MINUTO_MS) },
    };
  }

  const horas = Math.floor(transcurrido / HORA_MS);
  if (horas < HORAS_ANTES_DE_CONTAR_DIAS) {
    return { clave: 'manager.observacion.haceHoras', valores: { count: horas } };
  }

  return {
    clave: 'manager.observacion.haceDias',
    valores: { count: Math.floor(transcurrido / DIA_MS) },
  };
}

/**
 * La observación más reciente de una lista, o `null` si la lista está vacía.
 *
 * Todas las horas vienen normalizadas a ISO-8601 UTC por los clientes, así que
 * comparar el texto compara el tiempo.
 */
export function observacionMasReciente(
  elementos: readonly { readonly observadoEn: string }[],
): string | null {
  let masReciente: string | null = null;

  for (const elemento of elementos) {
    if (masReciente === null || elemento.observadoEn.localeCompare(masReciente) > 0) {
      masReciente = elemento.observadoEn;
    }
  }

  return masReciente;
}
