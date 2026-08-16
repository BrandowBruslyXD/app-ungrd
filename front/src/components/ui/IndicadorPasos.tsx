import { useTranslation } from 'react-i18next';

interface IndicadorPasosProps {
  paso: number;
  total: number;
  /** Nombre del paso actual, en lenguaje llano. */
  titulo: string;
}

/**
 * Indicador de avance de un formulario por pasos.
 *
 * A propósito NO es la fila de circulitos numerados: en un teléfono de 360px,
 * seis círculos con etiqueta debajo dejan cada rótulo en 10px y truncado, que es
 * justo lo que no puede leer el público de esta app. En su lugar dice en letra
 * grande dónde va y cuánto falta, con una barra que se llena.
 */
export default function IndicadorPasos({ paso, total, titulo }: IndicadorPasosProps) {
  const { t } = useTranslation();
  const porcentaje = Math.round((paso / total) * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold uppercase tracking-wider text-azul-600">
          {t('ui.steps.of', { current: paso, total })}
        </p>
        <p className="text-sm font-semibold text-tinta-500">{porcentaje}%</p>
      </div>

      <h2 className="mt-1 text-xl font-bold text-tinta-900">{titulo}</h2>

      <div
        className="mt-3 h-3 w-full overflow-hidden rounded-full bg-tinta-200"
        role="progressbar"
        aria-valuenow={paso}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={t('ui.steps.of', { current: paso, total })}
      >
        <div
          className="h-full rounded-full bg-azul-600 transition-[width] duration-300"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
