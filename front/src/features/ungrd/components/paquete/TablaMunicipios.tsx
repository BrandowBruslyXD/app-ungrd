import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import Ficha from '@/components/ui/Ficha';
import type { ResumenMunicipio } from '@/lib/sectorial';
import { NIVELES_CONFIANZA } from '@/types/sectorial';
import DistintivoConfianza from './DistintivoConfianza';
import { formatearNumero, formatearPesos } from './formato';

interface TablaMunicipiosProps {
  municipios: readonly ResumenMunicipio[];
}

/**
 * Totales por municipio: **así es como el ministerio pide la información.**
 *
 * No es un desglose más. Un ministerio no formula proyectos sobre «el sector
 * educación del evento»: los formula sobre las sedes de Cereté y las de Lorica,
 * cada una con su alcalde y su presupuesto. Por eso esta tabla va antes que el
 * detalle línea a línea.
 */
export default function TablaMunicipios({ municipios }: TablaMunicipiosProps) {
  const { t } = useTranslation();

  const totalDanos = municipios.reduce((suma, fila) => suma + fila.totalDanos, 0);
  const totalPersonas = municipios.reduce((suma, fila) => suma + fila.personasAfectadas, 0);
  const totalCosto = municipios.reduce((suma, fila) => suma + fila.costoEstimado, 0);

  return (
    <Ficha titulo={t('ungrd.paquete.municipiosTitulo')} icono={MapPin} sinRelleno>
      <p className="border-b border-papel-borde px-4 py-3 text-sm text-tinta-600 sm:px-5">
        {t('ungrd.paquete.municipiosAyuda')}
      </p>

      {/* Alguien va a abrir esto en un portátil de 1280px con la barra lateral
          del navegador abierta: la tabla se desplaza dentro de su caja en vez
          de estirar la página entera. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
          <caption className="solo-lector">{t('ungrd.paquete.municipiosTitulo')}</caption>
          <thead>
            <tr className="border-b-2 border-papel-borde bg-papel-hueco">
              <th scope="col" className="px-4 py-3 font-bold text-tinta-800">
                {t('ungrd.paquete.colMunicipio')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-tinta-800">
                {t('ungrd.paquete.colDepartamento')}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-bold text-tinta-800">
                {t('ungrd.paquete.colDanos')}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-bold text-tinta-800">
                {t('ungrd.paquete.colPersonas')}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-bold text-tinta-800">
                {t('ungrd.paquete.colCosto')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-tinta-800">
                {t('ungrd.paquete.colConfianza')}
              </th>
            </tr>
          </thead>

          <tbody>
            {municipios.map((fila) => (
              <tr
                key={`${fila.departamento}-${fila.municipio}`}
                className="border-b border-papel-borde"
              >
                <th scope="row" className="px-4 py-3 text-left font-semibold text-tinta-900">
                  {fila.municipio}
                </th>
                <td className="px-4 py-3 text-tinta-600">{fila.departamento}</td>
                <td className="px-4 py-3 text-right tabular-nums text-tinta-900">
                  {formatearNumero(fila.totalDanos)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-tinta-900">
                  {fila.personasAfectadas > 0 ? formatearNumero(fila.personasAfectadas) : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-tinta-900">
                  {fila.costoEstimado > 0
                    ? formatearPesos(fila.costoEstimado)
                    : t('ungrd.paquete.sinCosto')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {NIVELES_CONFIANZA.filter((nivel) => fila.confianza[nivel] > 0).map((nivel) => (
                      <DistintivoConfianza key={nivel} nivel={nivel} conteo={fila.confianza[nivel]} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-papel-borde bg-papel-hueco font-bold text-tinta-900">
              <th scope="row" colSpan={2} className="px-4 py-3 text-left">
                {t('ungrd.paquete.totalFila')}
              </th>
              <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(totalDanos)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatearNumero(totalPersonas)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatearPesos(totalCosto)}</td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </Ficha>
  );
}
