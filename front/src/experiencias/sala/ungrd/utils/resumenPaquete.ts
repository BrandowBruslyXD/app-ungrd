import type {
  DanoSectorizado,
  NivelConfianza,
  PaqueteMinisterio,
  ResumenPaquete,
  TotalMunicipio,
} from '@/experiencias/sala/ungrd/types/paquete';

/**
 * Los totales no se guardan: se calculan a partir de los daños.
 *
 * Así no puede existir un paquete cuyo resumen diga una cosa y cuyo detalle diga otra,
 * que en un documento oficial sería el peor de los errores posibles.
 */

/** Cuántos daños hay de cada nivel de confianza. Siempre devuelve las tres llaves. */
export function contarPorConfianza(danos: readonly DanoSectorizado[]): Record<NivelConfianza, number> {
  const conteo: Record<NivelConfianza, number> = {
    Verificado: 0,
    Censado: 0,
    Autorreportado: 0,
  };
  for (const dano of danos) {
    conteo[dano.nivelConfianza] += 1;
  }
  return conteo;
}

/** Suma los costos disponibles. Los daños sin costo no suman cero: simplemente no entran. */
export function sumarCostos(danos: readonly DanoSectorizado[]): number {
  return danos.reduce((total, dano) => total + (dano.costoEstimado ?? 0), 0);
}

/**
 * Agrupa los daños por municipio, que es como el ministerio pide la información.
 *
 * El orden es por costo estimado descendente y, a igual costo, por número de daños:
 * arriba queda el municipio que más presupuesto va a requerir.
 */
export function totalizarPorMunicipio(danos: readonly DanoSectorizado[]): TotalMunicipio[] {
  const porMunicipio = new Map<string, TotalMunicipio>();

  for (const dano of danos) {
    const clave = `${dano.departamento}|${dano.municipio}`;
    const acumulado = porMunicipio.get(clave) ?? {
      municipio: dano.municipio,
      departamento: dano.departamento,
      danos: 0,
      costoEstimado: 0,
      porConfianza: { Verificado: 0, Censado: 0, Autorreportado: 0 },
    };

    acumulado.danos += 1;
    acumulado.costoEstimado += dano.costoEstimado ?? 0;
    acumulado.porConfianza[dano.nivelConfianza] += 1;
    porMunicipio.set(clave, acumulado);
  }

  return [...porMunicipio.values()].sort(
    (a, b) => b.costoEstimado - a.costoEstimado || b.danos - a.danos,
  );
}

/** Todo lo que la pantalla necesita saber del paquete de un vistazo. */
export function resumirPaquete(paquete: PaqueteMinisterio): ResumenPaquete {
  const totalesPorMunicipio = totalizarPorMunicipio(paquete.danos);

  return {
    totalDanos: paquete.danos.length,
    totalMunicipios: totalesPorMunicipio.length,
    costoEstimadoTotal: sumarCostos(paquete.danos),
    danosSinCosto: paquete.danos.filter((dano) => dano.costoEstimado === null).length,
    porConfianza: contarPorConfianza(paquete.danos),
    totalesPorMunicipio,
    costoNecesidades: paquete.necesidades.reduce(
      (total, necesidad) => total + necesidad.costoEstimado,
      0,
    ),
  };
}

/** Pesos colombianos sin decimales: los costos oficiales se manejan en unidades enteras. */
const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Da formato de moneda a un costo en pesos. */
export function formatearPesos(valor: number): string {
  return formatoMoneda.format(valor);
}

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const formatoFechaHora = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Fecha corta a partir de un ISO-8601. */
export function formatearFecha(iso: string): string {
  return formatoFecha.format(new Date(iso));
}

/** Fecha con hora a partir de un ISO-8601. */
export function formatearFechaHora(iso: string): string {
  return formatoFechaHora.format(new Date(iso));
}
