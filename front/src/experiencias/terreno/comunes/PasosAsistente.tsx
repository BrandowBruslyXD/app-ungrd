import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

/**
 * Indicador de progreso de los cuatro asistentes de terreno.
 *
 * Los cuatro tenían su propia versión y ninguna se parecía: distinto tamaño de círculo, distinto
 * color para el paso cumplido y una de ellas con etiquetas de 10 px. Esta es la única.
 *
 * El punto en curso lleva un anillo dorado porque el amarillo institucional solo se usa como
 * acento gráfico; el estado se sigue distinguiendo por el número, el check y el texto «Paso X de Y»,
 * nunca solo por el color.
 */

export interface PasoAsistente {
  /** Clave estable para React; no se muestra. */
  clave: string;
  /** Nombre del paso. */
  etiqueta: string;
  /** Versión corta para celular. Si falta, se usa la etiqueta completa. */
  etiquetaCorta?: string;
}

interface Props {
  pasos: PasoAsistente[];
  /** Paso en curso, empezando en 1. */
  actual: number;
}

export default function PasosAsistente({ pasos, actual }: Props) {
  const { t } = useTranslation();
  const total = pasos.length;
  const progreso = total > 1 ? ((actual - 1) / (total - 1)) * 100 : 100;

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-slate-600">
        {t('asistente.pasoActual', { actual, total, nombre: pasos[actual - 1]?.etiqueta ?? '' })}
      </p>

      <ol className="mb-3 flex items-start justify-between gap-1">
        {pasos.map((paso, indice) => {
          const numero = indice + 1;
          const cumplido = actual > numero;
          const enCurso = actual === numero;

          return (
            <li key={paso.clave} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span
                aria-current={enCurso ? 'step' : undefined}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  enCurso
                    ? 'bg-ungrd-600 text-white ring-4 ring-gold-300'
                    : cumplido
                      ? 'bg-ungrd-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                }`}
              >
                {cumplido ? <Check className="h-4 w-4" aria-hidden="true" /> : numero}
              </span>
              <span
                className={`w-full truncate text-center text-xs font-medium sm:text-sm ${
                  enCurso ? 'text-ungrd-700' : 'text-slate-600'
                }`}
              >
                <span className="sm:hidden">{paso.etiquetaCorta ?? paso.etiqueta}</span>
                <span className="hidden sm:inline">{paso.etiqueta}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-ungrd-600 transition-all duration-500"
          style={{ width: `${progreso}%` }}
        />
      </div>
    </div>
  );
}
