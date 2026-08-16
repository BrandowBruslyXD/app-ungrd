import { useTranslation } from 'react-i18next';
import type { NecesidadPaquete } from '@/experiencias/sala/ungrd/types/paquete';
import { formatearPesos } from '@/experiencias/sala/ungrd/utils/resumenPaquete';

interface TablaNecesidadesProps {
  necesidades: readonly NecesidadPaquete[];
  costoTotal: number;
}

/**
 * La tabla con la que cierra cada bloque sectorial del formato oficial FR-1703-SMD-09:
 * `Necesidad | Equipos o elementos requeridos | Costo estimado`. Se respeta tal cual
 * para que el ministerio reconozca de inmediato lo que está leyendo.
 */
export default function TablaNecesidades({ necesidades, costoTotal }: TablaNecesidadesProps) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="titulo-necesidades" className="card overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
        <h2 id="titulo-necesidades" className="text-base font-bold text-slate-900">
          {t('paquete.necesidadesTitulo')}
        </h2>
        <p className="text-sm text-slate-600">{t('paquete.necesidadesApoyo')}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-5 py-2.5 font-semibold">
                {t('paquete.colNecesidad')}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {t('paquete.colElementos')}
              </th>
              <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                {t('paquete.colCosto')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {necesidades.map((necesidad) => (
              <tr key={necesidad.id} className="align-top hover:bg-slate-50/70">
                <th scope="row" className="px-5 py-3 text-left font-semibold text-slate-800">
                  {necesidad.necesidad}
                </th>
                <td className="px-3 py-3 text-slate-600">{necesidad.elementos}</td>
                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums font-semibold text-slate-800">
                  {formatearPesos(necesidad.costoEstimado)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 text-sm font-bold text-slate-800">
              <th scope="row" className="px-5 py-3 text-left">
                {t('paquete.totalNecesidades')}
              </th>
              <td className="px-3 py-3" />
              <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                {formatearPesos(costoTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
