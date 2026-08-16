import { useTranslation } from 'react-i18next';
import type { ResumenPaquete } from '@/experiencias/sala/ungrd/types/paquete';
import { NIVELES_CONFIANZA } from '@/experiencias/sala/ungrd/types/paquete';
import { formatearPesos } from '@/experiencias/sala/ungrd/utils/resumenPaquete';
import { estilosConfianza } from '@/experiencias/sala/ungrd/components/estilosConfianza';

interface TotalesPorMunicipioProps {
  resumen: ResumenPaquete;
}

/**
 * Totales por municipio: es la forma exacta en que el ministerio pide la información
 * («lo mío de esta emergencia, desglosado por municipio»).
 */
export default function TotalesPorMunicipio({ resumen }: TotalesPorMunicipioProps) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="titulo-municipios" className="card overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
        <h2 id="titulo-municipios" className="text-base font-bold text-slate-900">
          {t('paquete.municipiosTitulo')}
        </h2>
        <p className="text-sm text-slate-600">{t('paquete.municipiosApoyo')}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-5 py-2.5 font-semibold">
                {t('paquete.colMunicipio')}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                {t('paquete.colDanos')}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {t('paquete.colConfianza')}
              </th>
              <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                {t('paquete.colCosto')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resumen.totalesPorMunicipio.map((fila) => (
              <tr key={`${fila.departamento}-${fila.municipio}`} className="hover:bg-slate-50/70">
                <th scope="row" className="px-5 py-3 text-left font-semibold text-slate-800">
                  {fila.municipio}
                  <span className="block text-sm font-normal text-slate-600">
                    {fila.departamento}
                  </span>
                </th>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-700">
                  {fila.danos}
                </td>
                <td className="px-3 py-3">
                  <ul className="flex flex-wrap gap-1.5">
                    {NIVELES_CONFIANZA.filter((nivel) => fila.porConfianza[nivel] > 0).map((nivel) => (
                      <li
                        key={nivel}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${estilosConfianza[nivel].barra}`}
                          aria-hidden="true"
                        />
                        <span className="tabular-nums font-semibold">{fila.porConfianza[nivel]}</span>
                        {t(`paquete.confianza.${nivel}`)}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums font-semibold text-slate-800">
                  {fila.costoEstimado > 0 ? formatearPesos(fila.costoEstimado) : t('paquete.sinCosto')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 text-sm font-bold text-slate-800">
              <th scope="row" className="px-5 py-3 text-left">
                {t('paquete.totalGeneral')}
              </th>
              <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                {resumen.totalDanos}
              </td>
              <td className="px-3 py-3" />
              <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                {formatearPesos(resumen.costoEstimadoTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
