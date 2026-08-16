import { useTranslation } from 'react-i18next';
import { CircleAlert, ListChecks } from 'lucide-react';

interface ProcedimientoDeEnvioProps {
  /** Identificador del bloque de reparto, al que salta el primer paso. */
  anclaReparto: string;
  /** Sin declaratoria no hay decreto que citar: el tercer paso no procede. */
  puedeRemitir: boolean;
  informesPendientes: number;
}

/**
 * El procedimiento de envío, arriba del panel y en tres pasos.
 *
 * Es lo que el módulo no dejaba ver: las tres cosas que hay que hacer para que
 * un ministerio reciba lo suyo —generar el informe, descargar el PDF, mandarlo
 * por correo— estaban repartidas entre dos pantallas y el último paso vivía al
 * fondo de la segunda. Un funcionario que abre esto por primera vez tiene que
 * saber en qué consiste el trabajo antes de bajar a las trece filas.
 *
 * Solo el primer paso es accionable desde aquí, y así se muestra: los otros dos
 * ocurren dentro del informe del ministerio. Poner tres botones donde solo uno
 * hace algo sería prometer lo que la pantalla no cumple.
 */
export default function ProcedimientoDeEnvio({
  anclaReparto,
  puedeRemitir,
  informesPendientes,
}: ProcedimientoDeEnvioProps) {
  const { t } = useTranslation();

  return (
    <section aria-label={t('ungrd.panel.pasosTitulo')} className="ficha mt-6 overflow-hidden">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-papel-borde bg-papel-hueco px-4 py-3 sm:px-5">
        <p className="flex items-center gap-2 font-bold text-tinta-900">
          <ListChecks className="h-5 w-5 shrink-0 text-azul-600" aria-hidden="true" />
          {t('ungrd.panel.pasosTitulo')}
        </p>
        <p className="text-sm text-tinta-600">
          {informesPendientes === 0
            ? t('ungrd.panel.pasosSinPendientes')
            : t('ungrd.panel.pasosPendientes', { count: informesPendientes })}
        </p>
      </div>

      {/* Los pasos van en columnas separadas por una línea, no en tarjetas: es
          un solo procedimiento leído de izquierda a derecha. */}
      <ol className="grid gap-5 p-4 sm:p-5 lg:grid-cols-3 lg:gap-0">
        <li className="lg:pr-5">
          <p className="font-semibold text-tinta-900">{t('ungrd.panel.pasoUnoTitulo')}</p>
          <p className="mt-1 text-sm leading-snug text-tinta-600">
            {t('ungrd.panel.pasoUnoTexto')}
          </p>
          {/* Ancla de la misma página: lleva a las trece filas, que es donde se
              elige el ministerio. */}
          <a href={`#${anclaReparto}`} className="btn-secondary mt-3">
            {t('ungrd.panel.pasoUnoAccion')}
          </a>
        </li>

        <li className="border-papel-borde lg:border-l lg:px-5">
          <p className="font-semibold text-tinta-900">{t('ungrd.panel.pasoDosTitulo')}</p>
          <p className="mt-1 text-sm leading-snug text-tinta-600">
            {t('ungrd.panel.pasoDosTexto')}
          </p>
        </li>

        <li className="border-papel-borde lg:border-l lg:pl-5">
          <p className="font-semibold text-tinta-900">{t('ungrd.panel.pasoTresTitulo')}</p>
          {puedeRemitir ? (
            <p className="mt-1 text-sm leading-snug text-tinta-600">
              {t('ungrd.panel.pasoTresTexto')}
            </p>
          ) : (
            /* No se ofrece un botón que no debería usarse: se dice por qué. Un
               oficio sin decreto que lo ampare no se manda. */
            <p className="mt-1 flex gap-2 text-sm leading-snug text-espera-700">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t('ungrd.panel.pasoTresSinDecreto')}</span>
            </p>
          )}
        </li>
      </ol>
    </section>
  );
}
