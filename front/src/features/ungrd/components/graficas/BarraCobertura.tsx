import { useTranslation } from 'react-i18next';
import { CircleAlert, CircleCheck, CircleHelp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ResumenCobertura } from '@/lib/sectorial';
import type { EstadoCobertura } from '@/types/sectorial';

/**
 * Gráfica 3 · ¿De dónde no llega información?
 *
 * Una sola barra apilada sobre el total de municipios afectados. Es un reparto
 * de tres estados sobre un total conocido, y una barra lo dice mejor que tres
 * tarjetas sueltas que obligarían a sumar de cabeza para saber cuánto falta.
 *
 * Vive en `graficas/` y se llama distinto del subpanel `CoberturaTerritorial`,
 * que es la ficha completa con su tabla de municipios.
 */

/** Los tonos validados: verde, azul y el rojo de la bandera para el silencio. */
const COLOR: Record<EstadoCobertura, string> = {
  EnSilencio: '#ce1126',
  SoloAutorreportes: '#1f55be',
  ConEdan: '#117a50',
};

/** El mismo tono en la leyenda, y el glifo que acompaña a cada estado. */
const ASPECTO: Record<EstadoCobertura, { punto: string; texto: string; icono: LucideIcon }> = {
  EnSilencio: { punto: 'bg-alerta-600', texto: 'text-alerta-700', icono: CircleHelp },
  SoloAutorreportes: { punto: 'bg-azul-500', texto: 'text-azul-700', icono: CircleAlert },
  ConEdan: { punto: 'bg-seguro-600', texto: 'text-seguro-700', icono: CircleCheck },
};

/**
 * **El silencio va primero.** Un municipio del que no llegó nada no es un
 * municipio sin daños: es del que no sabemos nada, y probablemente sea el que
 * peor está. Ponerlo al final sería esconder lo único que este bloque aporta.
 */
const ORDEN: readonly EstadoCobertura[] = ['EnSilencio', 'SoloAutorreportes', 'ConEdan'];

const ANCHO = 720;
const ALTO = 34;
const ALTO_BARRA = 22;
const Y_BARRA = (ALTO - ALTO_BARRA) / 2;

/** Separación entre segmentos apilados, en unidades del `viewBox`. */
const SEPARACION = 2;

/** Ancho mínimo para que la cifra quepa dentro del segmento sin recortarse. */
const ANCHO_MINIMO_ROTULO = 30;

interface BarraCoberturaProps {
  /** Lo que devuelve `resumenCobertura`. Aquí no se vuelve a contar nada. */
  resumen: ResumenCobertura;
}

/** Barra única con el reparto de los municipios afectados por lo que se sabe de ellos. */
export default function BarraCobertura({ resumen }: BarraCoberturaProps) {
  const { t } = useTranslation();

  const conteos: Record<EstadoCobertura, number> = {
    EnSilencio: resumen.enSilencio,
    SoloAutorreportes: resumen.soloAutorreportes,
    ConEdan: resumen.conEdan,
  };

  const total = resumen.totalMunicipios;

  const resumenHablado =
    total === 0
      ? t('ungrd.graficas.coberturaVacia')
      : t('ungrd.graficas.coberturaResumen', {
          total,
          silencio: resumen.enSilencio,
          porcentaje: Math.round((resumen.enSilencio / total) * 100),
          autorreportes: resumen.soloAutorreportes,
          edan: resumen.conEdan,
        });

  const ultimoVisible = ORDEN.reduce(
    (ultimo, estado, indice) => (conteos[estado] > 0 ? indice : ultimo),
    -1,
  );

  let recorrido = 0;

  return (
    <figure className="m-0 space-y-3">
      <figcaption className="space-y-1">
        <span className="block text-lg font-bold text-tinta-900">
          {t('ungrd.graficas.coberturaTitulo')}
        </span>
        <span className="block text-sm text-tinta-600">{t('ungrd.graficas.coberturaAyuda')}</span>
      </figcaption>

      {total === 0 ? (
        <p className="text-tinta-600">{t('ungrd.graficas.coberturaVacia')}</p>
      ) : (
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="block h-auto w-full"
          role="img"
          aria-label={resumenHablado}
        >
          {ORDEN.map((estado, indice) => {
            const completo = (conteos[estado] / total) * ANCHO;
            const x = recorrido;
            recorrido += completo;

            if (conteos[estado] === 0) return null;

            // Los 2 px de aire salen del segmento: el total sigue midiendo lo
            // mismo y la proporción no se falsea.
            const ancho = indice === ultimoVisible ? completo : Math.max(1, completo - SEPARACION);

            return (
              <g key={estado}>
                <rect x={x} y={Y_BARRA} width={ancho} height={ALTO_BARRA} fill={COLOR[estado]} />
                {ancho >= ANCHO_MINIMO_ROTULO && (
                  <text
                    x={x + ancho / 2}
                    y={ALTO / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={13}
                    fontWeight={700}
                    fill="#ffffff"
                  >
                    {conteos[estado]}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {/* La leyenda es también la vista de datos: cifra, palabra y glifo por
          estado, legible sin distinguir un solo color. */}
      <ul className="grid gap-3 sm:grid-cols-3">
        {ORDEN.map((estado) => {
          const { punto, texto, icono: Icono } = ASPECTO[estado];
          return (
            <li key={estado} className="flex items-start gap-2.5">
              <span className={`mt-2 h-3 w-3 shrink-0 rounded-sm ${punto}`} aria-hidden="true" />
              <Icono className={`mt-1 h-5 w-5 shrink-0 ${texto}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-bold tabular-nums text-tinta-900">
                  {t('ungrd.graficas.municipiosConteo', { count: conteos[estado] })}
                </p>
                <p className="text-sm leading-snug text-tinta-600">
                  {t(`ungrd.cobertura.${estado}`)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
