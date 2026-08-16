import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CATALOGO_SECTORES, ordenDelSector } from '@/lib/catalogoSectores';
import type { ResumenSector } from '@/lib/sectorial';
import { formatearEntero, formatearMillones } from '../formatoPanel';

/**
 * Gráfica 1 · ¿Qué sector concentra el daño?
 *
 * Barras horizontales, un solo tono. Trece sectores no caben en una torta, y
 * comparar longitudes es más fácil que comparar ángulos: ordenadas por costo,
 * la respuesta se lee en el primer renglón.
 *
 * El SVG se dibuja a mano —`rect`, `line`, `text`— y no con una librería de
 * gráficas: son trece rectángulos, y una dependencia nueva costaría más peso de
 * descarga que todo este archivo, en una app que se abre con mala red.
 */

/** Azul único: la identidad de cada fila la lleva su etiqueta, no el color. */
const AZUL = '#1f55be';

const REJILLA = '#d8e0ed';
const PISTA = '#eef3fc';

const ANCHO = 720;
const ALTO_FILA = 30;
const MARGEN_VERTICAL = 10;
const COL_ETIQUETA = 176;
const HUECO = 12;
const COL_VALOR = 92;
const X_BARRA = COL_ETIQUETA + HUECO;
const ANCHO_BARRA = ANCHO - X_BARRA - COL_VALOR;
const ALTO_MARCA = 14;

interface DanoPorSectorProps {
  /** Los trece resúmenes que devuelve `agruparPorSector`. */
  resumenes: readonly ResumenSector[];
}

/**
 * Ordena por costo descendente en la propia gráfica en vez de confiar en el
 * orden con el que llegan.
 *
 * `agruparPorSector` ya los devuelve así, pero la gráfica promete «ordenadas por
 * magnitud» y esa promesa no puede depender de quién la llame: filtrar o
 * reordenar los resúmenes aguas arriba dejaría la barra más larga en mitad de la
 * lista sin que nadie lo notara.
 */
function ordenarPorCosto(resumenes: readonly ResumenSector[]): ResumenSector[] {
  return [...resumenes].sort((a, b) => {
    if (b.costoEstimado !== a.costoEstimado) return b.costoEstimado - a.costoEstimado;
    if (b.totalDanos !== a.totalDanos) return b.totalDanos - a.totalDanos;
    return ordenDelSector(a.sector) - ordenDelSector(b.sector);
  });
}

/** Barras horizontales del costo estimado por sector, con los que van en cero. */
export default function DanoPorSector({ resumenes }: DanoPorSectorProps) {
  const { t } = useTranslation();

  const filas = useMemo(() => ordenarPorCosto(resumenes), [resumenes]);

  const total = filas.reduce((suma, fila) => suma + fila.costoEstimado, 0);
  const mayor = filas.length === 0 ? 0 : filas[0].costoEstimado;
  const enCero = filas.filter((fila) => fila.costoEstimado === 0).length;
  const alto = MARGEN_VERTICAL * 2 + filas.length * ALTO_FILA;

  /*
   * El rótulo accesible dice el dato, no la forma: quien no ve la gráfica
   * necesita «Vivienda concentra el 38 % del costo», no «gráfico de barras».
   */
  const resumenHablado =
    total === 0
      ? t('ungrd.graficas.danoResumenVacio')
      : t('ungrd.graficas.danoResumen', {
          sector: t(CATALOGO_SECTORES[filas[0].sector].claveNombre),
          porcentaje: Math.round((filas[0].costoEstimado / total) * 100),
          enCero,
          total: filas.length,
        });

  return (
    <figure className="m-0 space-y-3">
      <figcaption className="space-y-1">
        <span className="block text-lg font-bold text-tinta-900">
          {t('ungrd.graficas.danoTitulo')}
        </span>
        <span className="block text-sm text-tinta-600">{t('ungrd.graficas.danoAyuda')}</span>
      </figcaption>

      {/* `viewBox` sin ancho fijo: la gráfica se estira con su columna y en
          pantalla estrecha se encoge sin recortarse ni desbordar la página. */}
      <svg
        viewBox={`0 0 ${ANCHO} ${alto}`}
        className="block h-auto w-full"
        role="img"
        aria-label={resumenHablado}
      >
        <line
          x1={X_BARRA}
          y1={MARGEN_VERTICAL}
          x2={X_BARRA}
          y2={alto - MARGEN_VERTICAL}
          stroke={REJILLA}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {filas.map((fila, indice) => {
          const arriba = MARGEN_VERTICAL + indice * ALTO_FILA;
          const centro = arriba + ALTO_FILA / 2;
          const ancho = mayor === 0 ? 0 : (fila.costoEstimado / mayor) * ANCHO_BARRA;
          const vacio = fila.costoEstimado === 0;

          return (
            <g key={fila.sector}>
              <text
                x={COL_ETIQUETA}
                y={centro}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={13}
                fill={vacio ? '#64738d' : '#0e1726'}
              >
                {t(CATALOGO_SECTORES[fila.sector].claveNombre)}
              </text>

              {/* La pista vacía es lo que hace visible el cero: sin ella, un
                  sector sin daños se vería como una fila en blanco, que se lee
                  como «falta el dato» y no como «no le toca nada». */}
              <rect
                x={X_BARRA}
                y={centro - ALTO_MARCA / 2}
                width={ANCHO_BARRA}
                height={ALTO_MARCA}
                fill={PISTA}
              />

              {ancho > 0 && (
                <rect
                  x={X_BARRA}
                  y={centro - ALTO_MARCA / 2}
                  width={ancho}
                  height={ALTO_MARCA}
                  fill={AZUL}
                />
              )}

              <text
                x={X_BARRA + ancho + 8}
                y={centro}
                dominantBaseline="central"
                fontSize={13}
                fontWeight={vacio ? 400 : 700}
                fill={vacio ? '#64738d' : '#0e1726'}
              >
                {formatearMillones(fila.costoEstimado)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* La misma información sin color y sin forma: quien navega con lector de
          pantalla, o quien no distingue la longitud de dos barras parecidas,
          lee las cifras exactas. */}
      <table className="solo-lector">
        <caption>{t('ungrd.graficas.danoTabla')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('ungrd.graficas.colSector')}</th>
            <th scope="col">{t('ungrd.graficas.colCostoMillones')}</th>
            <th scope="col">{t('ungrd.graficas.colDanos')}</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.sector}>
              <th scope="row">{t(CATALOGO_SECTORES[fila.sector].claveNombre)}</th>
              <td>{formatearMillones(fila.costoEstimado)}</td>
              <td>{formatearEntero(fila.totalDanos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
