import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react';
import Ficha from '@/components/ui/Ficha';
import type { FilaNecesidad } from '../../hooks/usePaqueteMinisterio';
import { formatearNumero, formatearPesos } from './formato';

interface TablaNecesidadesProps {
  necesidades: readonly FilaNecesidad[];
  /** Cuántos daños del paquete llegaron sin costo en el dato de origen. */
  danosSinCosto: number;
}

/**
 * `Necesidad | Equipos o elementos requeridos | Costo estimado`.
 *
 * Es la tabla con la que cierra **cada** bloque sectorial del formato oficial
 * FR-1703-SMD-09, y por eso va con esas tres columnas y en ese orden: el
 * funcionario del ministerio la reconoce sin que nadie se la explique.
 *
 * La nota del pie no es un descargo de responsabilidad de relleno. Muchos daños
 * llegan sin costo —un reporte ciudadano no trae presupuesto— y un total que
 * los sumara como cero se leería como «esto cuesta esto», que es una cifra
 * falsa dentro de un documento oficial.
 */
export default function TablaNecesidades({ necesidades, danosSinCosto }: TablaNecesidadesProps) {
  const { t } = useTranslation();

  const total = necesidades.reduce((suma, fila) => suma + fila.costoEstimado, 0);

  return (
    <Ficha titulo={t('ungrd.paquete.necesidadesTitulo')} icono={ClipboardList} sinRelleno>
      <p className="border-b border-papel-borde px-4 py-3 text-sm text-tinta-600 sm:px-5">
        {t('ungrd.paquete.necesidadesAyuda')}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <caption className="solo-lector">{t('ungrd.paquete.necesidadesTitulo')}</caption>
          <thead>
            <tr className="border-b-2 border-papel-borde bg-papel-hueco">
              <th scope="col" className="px-4 py-3 font-bold text-tinta-800">
                {t('ungrd.paquete.colNecesidad')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-tinta-800">
                {t('ungrd.paquete.colElementos')}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-bold text-tinta-800">
                {t('ungrd.paquete.colCostoEstimado')}
              </th>
            </tr>
          </thead>

          <tbody>
            {necesidades.map((fila) => (
              <tr key={fila.nivel ?? 'SinNivel'} className="border-b border-papel-borde align-top">
                <th scope="row" className="px-4 py-3 text-left font-semibold text-tinta-900">
                  {t(`ungrd.necesidad.${fila.nivel ?? 'SinNivel'}`)}
                  <span className="mt-0.5 block text-xs font-normal text-tinta-500">
                    {t('ungrd.paquete.necesidadDesde', { count: fila.totalDanos })}
                  </span>
                </th>
                <td className="px-4 py-3 text-tinta-800">
                  <ul className="space-y-0.5">
                    {fila.elementos.map((elemento) => (
                      <li key={elemento.unidad}>
                        <span className="font-semibold tabular-nums">
                          {formatearNumero(elemento.cantidad)}
                        </span>{' '}
                        {elemento.unidad}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-tinta-900">
                  {fila.costoEstimado > 0
                    ? formatearPesos(fila.costoEstimado)
                    : t('ungrd.paquete.sinCosto')}
                  {fila.sinCosto > 0 && (
                    <span className="mt-0.5 block text-xs font-normal text-tinta-500">
                      {t('ungrd.paquete.sinCostoDetalle', { count: fila.sinCosto })}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-papel-borde bg-papel-hueco font-bold text-tinta-900">
              <th scope="row" colSpan={2} className="px-4 py-3 text-left">
                {t('ungrd.paquete.totalFila')}
              </th>
              <td className="px-4 py-3 text-right tabular-nums">{formatearPesos(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {danosSinCosto > 0 && (
        <p className="border-t border-papel-borde px-4 py-3 text-sm text-tinta-600 sm:px-5">
          {t('ungrd.paquete.notaSinCosto', { count: danosSinCosto })}
        </p>
      )}
    </Ficha>
  );
}
