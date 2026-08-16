import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PhoneCall } from 'lucide-react';
import type { DanoSectorizado } from '@/types/sectorial';
import { formatearEntero, formatearFecha } from '../formatoPanel';
import { entradaSeca, serieDiaria } from './serieEntrada';

/**
 * Gráfica 4 · ¿La información sigue entrando o ya se secó?
 *
 * Línea de daños registrados por día desde la declaratoria. Es la que nadie
 * suele poner y la que más cambia lo que el funcionario hace: si la curva se
 * aplana mientras quedan municipios en silencio, el problema no es que no haya
 * daños, es que nadie está reportando, y eso se resuelve con una llamada.
 */

/** Un solo tono: una sola serie, y el título la nombra. Sin leyenda. */
const AZUL = '#1f55be';

const REJILLA = '#d8e0ed';

/**
 * «13 ago»: en el eje no cabe el año, y el rótulo hablado sí lo lleva.
 *
 * En hora de Colombia, igual que la serie: el eje tiene que decir el mismo día
 * que se contó.
 */
const DIA_CORTO = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: 'short',
});

const ANCHO = 720;
const ALTO = 220;
const MARGEN_IZQUIERDO = 40;
const MARGEN_DERECHO = 30;
const MARGEN_SUPERIOR = 30;
const MARGEN_INFERIOR = 42;
const ANCHO_TRAZO = ANCHO - MARGEN_IZQUIERDO - MARGEN_DERECHO;
const ALTO_TRAZO = ALTO - MARGEN_SUPERIOR - MARGEN_INFERIOR;
const Y_BASE = MARGEN_SUPERIOR + ALTO_TRAZO;

interface EntradaDeDatosProps {
  /** El consolidado del evento. La serie se cuenta de sus fechas de registro. */
  danos: readonly DanoSectorizado[];
  /** ISO-8601 de la declaratoria: desde ahí corre la serie. */
  desde?: string;
  /** Municipios sin un solo dato, tal como los cuenta `resumenCobertura`. */
  municipiosEnSilencio: number;
  /** Reloj, inyectable en pruebas. */
  ahora?: number;
}

/** Línea de daños registrados por día, con el apunte de cuando deja de entrar información. */
export default function EntradaDeDatos({
  danos,
  desde,
  municipiosEnSilencio,
  ahora,
}: EntradaDeDatosProps) {
  const { t } = useTranslation();

  const serie = useMemo(() => serieDiaria(danos, { desde, ahora }), [danos, desde, ahora]);

  const seca = entradaSeca(serie, municipiosEnSilencio);
  const total = serie.reduce((suma, punto) => suma + punto.total, 0);
  const maximo = serie.reduce((mayor, punto) => Math.max(mayor, punto.total), 0);
  const indiceMaximo = serie.findIndex((punto) => punto.total === maximo);

  /*
   * Solo tres rótulos: el primero, el último y el máximo. Un número sobre cada
   * punto convierte la línea en una tabla mal dibujada.
   */
  const rotulados = new Set<number>([0, serie.length - 1, indiceMaximo]);

  const escalaY = Math.max(1, maximo);
  const posicionX = (indice: number): number =>
    serie.length === 1
      ? MARGEN_IZQUIERDO + ANCHO_TRAZO / 2
      : MARGEN_IZQUIERDO + (indice * ANCHO_TRAZO) / (serie.length - 1);
  const posicionY = (valor: number): number => Y_BASE - (valor / escalaY) * ALTO_TRAZO;

  const trazo = serie
    .map((punto, indice) => {
      const orden = indice === 0 ? 'M' : 'L';
      return `${orden}${posicionX(indice)} ${posicionY(punto.total)}`;
    })
    .join(' ');

  const fechaLegible = (clave: string): string => formatearFecha(`${clave}T12:00:00Z`);
  const diaCorto = (clave: string): string => DIA_CORTO.format(new Date(`${clave}T12:00:00Z`));

  const resumenHablado =
    serie.length === 0
      ? t('ungrd.graficas.entradaVacia')
      : t('ungrd.graficas.entradaResumen', {
          inicio: fechaLegible(serie[0].dia),
          fin: fechaLegible(serie[serie.length - 1].dia),
          total,
          maximo,
          fechaMaximo: fechaLegible(serie[indiceMaximo].dia),
          ultimo: serie[serie.length - 1].total,
        });

  return (
    <figure className="m-0 space-y-3">
      <figcaption className="space-y-1">
        <span className="block text-lg font-bold text-tinta-900">
          {t('ungrd.graficas.entradaTitulo')}
        </span>
        <span className="block text-sm text-tinta-600">{t('ungrd.graficas.entradaAyuda')}</span>
      </figcaption>

      {serie.length === 0 ? (
        <p className="text-tinta-600">{t('ungrd.graficas.entradaVacia')}</p>
      ) : (
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="block h-auto w-full"
          role="img"
          aria-label={resumenHablado}
        >
          <line
            x1={MARGEN_IZQUIERDO}
            y1={MARGEN_SUPERIOR}
            x2={MARGEN_IZQUIERDO}
            y2={Y_BASE}
            stroke={REJILLA}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={MARGEN_IZQUIERDO}
            y1={Y_BASE}
            x2={MARGEN_IZQUIERDO + ANCHO_TRAZO}
            y2={Y_BASE}
            stroke={REJILLA}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {/* `non-scaling-stroke`: 2 px reales en pantalla, mida lo que mida la
              columna donde caiga la gráfica. */}
          <path
            d={trazo}
            fill="none"
            stroke={AZUL}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {serie.map((punto, indice) => {
            if (!rotulados.has(indice)) return null;

            const x = posicionX(indice);
            const y = posicionY(punto.total);
            const anclaje =
              indice === 0 && serie.length > 1
                ? 'start'
                : indice === serie.length - 1 && serie.length > 1
                  ? 'end'
                  : 'middle';

            return (
              <g key={punto.dia}>
                <circle cx={x} cy={y} r={3.5} fill={AZUL} />
                <text
                  x={x}
                  y={y - 12}
                  textAnchor={anclaje}
                  fontSize={13}
                  fontWeight={700}
                  fill="#0e1726"
                >
                  {formatearEntero(punto.total)}
                </text>
                <text x={x} y={Y_BASE + 20} textAnchor={anclaje} fontSize={12} fill="#4d5a71">
                  {diaCorto(punto.dia)}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {seca && (
        <div className="aviso-alerta">
          <PhoneCall className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{t('ungrd.graficas.entradaSecaTitulo')}</p>
            <p className="mt-1">
              {t('ungrd.graficas.entradaSecaCuerpo', { silencio: municipiosEnSilencio })}
            </p>
          </div>
        </div>
      )}

      {/* Día a día en cifras: la línea se lee igual sin verla. */}
      <table className="solo-lector">
        <caption>{t('ungrd.graficas.entradaTabla')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('ungrd.graficas.colDia')}</th>
            <th scope="col">{t('ungrd.graficas.colDanosDia')}</th>
          </tr>
        </thead>
        <tbody>
          {serie.map((punto) => (
            <tr key={punto.dia}>
              <th scope="row">{fechaLegible(punto.dia)}</th>
              <td>{formatearEntero(punto.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
