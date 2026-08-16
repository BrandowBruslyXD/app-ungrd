import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { TrustLevel } from '@/types';

const ORDEN: readonly TrustLevel[] = ['autorreportado', 'verificado', 'censado', 'avalado'];

interface EscaleraConfianzaProps {
  nivel: TrustLevel;
  /** Versión compacta, sin las descripciones, para listados. */
  compacta?: boolean;
}

/**
 * La escalera de confianza del dato: autorreportado → verificado → censado → avalado.
 *
 * Va numerada del 1 al 4 y eso no es decoración: es una secuencia con valor
 * jurídico creciente, y saber en qué peldaño se está es exactamente lo que la
 * Alcaldía de Cali tuvo que explicar en rueda de prensa en agosto de 2026,
 * porque la gente creía que reportar ya la dejaba inscrita.
 *
 * Mostrar el nivel en vez de esconderlo es la recomendación §9.3 de la
 * investigación.
 */
export default function EscaleraConfianza({ nivel, compacta }: EscaleraConfianzaProps) {
  const { t } = useTranslation();
  const indiceActual = ORDEN.indexOf(nivel);

  return (
    <ol className="space-y-2">
      {ORDEN.map((peldano, indice) => {
        const alcanzado = indice <= indiceActual;
        const esActual = indice === indiceActual;

        return (
          <li
            key={peldano}
            className={`flex gap-3 rounded-control border-2 px-3 py-2.5 ${
              esActual
                ? 'border-azul-600 bg-azul-50'
                : alcanzado
                  ? 'border-transparent bg-tinta-50'
                  : 'border-transparent bg-transparent'
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                alcanzado ? 'bg-azul-600 text-white' : 'bg-tinta-200 text-tinta-500'
              }`}
              aria-hidden="true"
            >
              {alcanzado && !esActual ? <Check className="h-5 w-5" strokeWidth={3} /> : indice + 1}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={`font-semibold leading-snug ${
                  alcanzado ? 'text-tinta-900' : 'text-tinta-400'
                }`}
              >
                {t(`trust.${peldano}`)}
                {esActual && (
                  <span className="ml-2 rounded-full bg-azul-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                    {t('ui.trustLadder.current')}
                  </span>
                )}
              </p>
              {!compacta && (
                <p
                  className={`mt-0.5 text-sm leading-snug ${
                    alcanzado ? 'text-tinta-600' : 'text-tinta-400'
                  }`}
                >
                  {t(`trustDesc.${peldano}`)}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
