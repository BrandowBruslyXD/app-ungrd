import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, MessageCircle, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CATALOGO_SECTORES } from '@/lib/catalogoSectores';
import type { ResumenSector } from '@/lib/sectorial';
import { NIVELES_CONFIANZA, type NivelConfianza } from '@/types/sectorial';
import { formatearEntero } from '../formatoPanel';
import { porcentajesEnteros } from './porcentajes';

/**
 * Gráfica 2 · ¿Cuánto de lo que sé está verificado?
 *
 * Barras apiladas al 100 %, una por sector con daños. La proporción es la
 * pregunta y no el total: un sector con 90 % autorreportado no está listo para
 * salir hacia un ministerio aunque acumule muchos daños, y un total absoluto
 * escondería justo eso.
 */

/** Los tonos validados contra daltonismo: verde, azul y oro. Nunca semáforo. */
const COLOR: Record<NivelConfianza, string> = {
  Verificado: '#117a50',
  Censado: '#1f55be',
  Autorreportado: '#8c6a00',
};

/** El mismo tono en la leyenda, por la clase de la paleta del proyecto. */
const PUNTO: Record<NivelConfianza, string> = {
  Verificado: 'bg-seguro-600',
  Censado: 'bg-azul-500',
  Autorreportado: 'bg-oro-700',
};

/** Un glifo distinto por nivel: el color nunca es la única señal. */
const ICONO: Record<NivelConfianza, LucideIcon> = {
  Verificado: ShieldCheck,
  Censado: ClipboardCheck,
  Autorreportado: MessageCircle,
};

/** Del dato más comprobado al menos: la barra se lee de izquierda a derecha. */
const ORDEN: readonly NivelConfianza[] = [...NIVELES_CONFIANZA].reverse();

const ALERTA = '#ce1126';
const REJILLA = '#d8e0ed';

const ANCHO = 720;
const ALTO_FILA = 30;
const MARGEN_VERTICAL = 10;
const COL_ETIQUETA = 176;
const HUECO = 12;
const COL_TOTAL = 78;
const X_BARRA = COL_ETIQUETA + HUECO;
const ANCHO_BARRA = ANCHO - X_BARRA - COL_TOTAL;
const ALTO_MARCA = 16;

/** Separación entre segmentos apilados, en unidades del `viewBox`. */
const SEPARACION = 2;

/** Ancho mínimo para que quepa un «34 %» dentro del segmento sin recortarlo. */
const ANCHO_MINIMO_ROTULO = 40;

/** Debajo de esto, el sector no está listo para enviarse a un ministerio. */
const UMBRAL_VERIFICADO = 50;

/**
 * Triángulo de atención dibujado a mano, para señalar dentro del SVG.
 *
 * No introduce un color nuevo: es el rojo que ya usa la cobertura territorial, y
 * viene acompañado del aviso escrito debajo de la gráfica y de una columna en la
 * tabla equivalente. La marca nunca queda sola.
 */
function MarcaAtencion({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke={ALERTA} strokeWidth={1.4}>
      <path d="M7 0.8 L13.4 12.6 L0.6 12.6 Z" strokeLinejoin="round" />
      <line x1={7} y1={5} x2={7} y2={8.6} strokeLinecap="round" />
      <line x1={7} y1={10.6} x2={7} y2={10.7} strokeLinecap="round" strokeWidth={1.8} />
    </g>
  );
}

interface ConfianzaPorSectorProps {
  /** Los resúmenes de `agruparPorSector`. Los sectores en cero se descartan aquí. */
  resumenes: readonly ResumenSector[];
}

interface FilaConfianza {
  resumen: ResumenSector;
  /** En el orden de `ORDEN`, y siempre suman 100. */
  porcentajes: number[];
  verificado: number;
  revisar: boolean;
}

/** Barras apiladas al 100 % con los tres niveles de confianza, sector a sector. */
export default function ConfianzaPorSector({ resumenes }: ConfianzaPorSectorProps) {
  const { t } = useTranslation();

  /*
   * Un sector sin daños no entra: una barra al 100 % de nada no es «0 %
   * verificado», es una pregunta que no aplica. Dónde están los sectores en cero
   * lo responde la gráfica del daño por sector.
   */
  const filas: FilaConfianza[] = useMemo(
    () =>
      resumenes
        .filter((resumen) => resumen.totalDanos > 0)
        .map((resumen) => {
          const porcentajes = porcentajesEnteros(
            ORDEN.map((nivel) => resumen.confianza[nivel]),
            resumen.totalDanos,
          );
          const verificado = porcentajes[ORDEN.indexOf('Verificado')];
          return { resumen, porcentajes, verificado, revisar: verificado < UMBRAL_VERIFICADO };
        }),
    [resumenes],
  );

  const porRevisar = filas.filter((fila) => fila.revisar);
  const alto = MARGEN_VERTICAL * 2 + filas.length * ALTO_FILA;

  const resumenHablado =
    filas.length === 0
      ? t('ungrd.graficas.confianzaVacia')
      : porRevisar.length === 0
        ? t('ungrd.graficas.confianzaResumenLimpio', { sectores: filas.length })
        : t('ungrd.graficas.confianzaResumen', {
            sectores: filas.length,
            alerta: porRevisar.length,
            lista: porRevisar
              .map((fila) => t(CATALOGO_SECTORES[fila.resumen.sector].claveNombre))
              .join(', '),
          });

  return (
    <figure className="m-0 space-y-3">
      <figcaption className="space-y-1">
        <span className="block text-lg font-bold text-tinta-900">
          {t('ungrd.graficas.confianzaTitulo')}
        </span>
        <span className="block text-sm text-tinta-600">{t('ungrd.graficas.confianzaAyuda')}</span>
      </figcaption>

      {/* Leyenda: tres series, así que hace falta. Cada una con su glifo, su
          color y su palabra, en el mismo orden en que se apilan. */}
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {ORDEN.map((nivel) => {
          const Icono = ICONO[nivel];
          return (
            <li key={nivel} className="flex items-center gap-2 text-sm text-tinta-700">
              <span className={`h-3 w-3 shrink-0 rounded-sm ${PUNTO[nivel]}`} aria-hidden="true" />
              <Icono className="h-4 w-4 shrink-0 text-tinta-600" aria-hidden="true" />
              {t(`ungrd.confianza.${nivel}`)}
            </li>
          );
        })}
      </ul>

      {filas.length === 0 ? (
        <p className="text-tinta-600">{t('ungrd.graficas.confianzaVacia')}</p>
      ) : (
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

          {filas.map(({ resumen, porcentajes, revisar }, indice) => {
            const arriba = MARGEN_VERTICAL + indice * ALTO_FILA;
            const centro = arriba + ALTO_FILA / 2;

            let recorrido = 0;
            const ultimoVisible = ORDEN.reduce(
              (ultimo, nivel, i) => (resumen.confianza[nivel] > 0 ? i : ultimo),
              -1,
            );

            return (
              <g key={resumen.sector}>
                {revisar && <MarcaAtencion x={0} y={centro - 7} />}

                <text
                  x={COL_ETIQUETA}
                  y={centro}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={13}
                  fontWeight={revisar ? 700 : 400}
                  fill="#0e1726"
                >
                  {t(CATALOGO_SECTORES[resumen.sector].claveNombre)}
                </text>

                {ORDEN.map((nivel, i) => {
                  const proporcion = resumen.confianza[nivel] / resumen.totalDanos;
                  const completo = proporcion * ANCHO_BARRA;
                  const x = X_BARRA + recorrido;
                  recorrido += completo;

                  if (resumen.confianza[nivel] === 0) return null;

                  // Los 2 px de aire salen del segmento, no del total: la barra
                  // sigue midiendo lo mismo y las proporciones no se falsean.
                  const ancho =
                    i === ultimoVisible ? completo : Math.max(1, completo - SEPARACION);

                  return (
                    <g key={nivel}>
                      <rect
                        x={x}
                        y={centro - ALTO_MARCA / 2}
                        width={ancho}
                        height={ALTO_MARCA}
                        fill={COLOR[nivel]}
                      />
                      {ancho >= ANCHO_MINIMO_ROTULO && (
                        <text
                          x={x + ancho / 2}
                          y={centro}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={11}
                          fontWeight={700}
                          fill="#ffffff"
                        >
                          {t('ungrd.graficas.porcentaje', { valor: porcentajes[i] })}
                        </text>
                      )}
                    </g>
                  );
                })}

                <text
                  x={ANCHO}
                  y={centro}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={12}
                  fill="#4d5a71"
                >
                  {formatearEntero(resumen.totalDanos)}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {porRevisar.length > 0 && (
        <p className="aviso-alerta">
          <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{t('ungrd.graficas.confianzaAviso')}</span>
        </p>
      )}

      {/* Las mismas proporciones en cifras, para leerlas sin distinguir colores. */}
      <table className="solo-lector">
        <caption>{t('ungrd.graficas.confianzaTabla')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('ungrd.graficas.colSector')}</th>
            {ORDEN.map((nivel) => (
              <th key={nivel} scope="col">
                {t(`ungrd.confianza.${nivel}`)}
              </th>
            ))}
            <th scope="col">{t('ungrd.graficas.colDanos')}</th>
            <th scope="col">{t('ungrd.graficas.colRevisar')}</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(({ resumen, porcentajes, revisar }) => (
            <tr key={resumen.sector}>
              <th scope="row">{t(CATALOGO_SECTORES[resumen.sector].claveNombre)}</th>
              {ORDEN.map((nivel, i) => (
                <td key={nivel}>{t('ungrd.graficas.porcentaje', { valor: porcentajes[i] })}</td>
              ))}
              <td>{formatearEntero(resumen.totalDanos)}</td>
              <td>
                {revisar
                  ? t('ungrd.graficas.confianzaMarca')
                  : t('ungrd.graficas.confianzaSinMarca')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
