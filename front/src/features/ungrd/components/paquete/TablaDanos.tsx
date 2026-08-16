import { useTranslation } from 'react-i18next';
import { ListChecks } from 'lucide-react';
import Ficha from '@/components/ui/Ficha';
import type { DanoSectorizado } from '@/types/sectorial';
import DistintivoConfianza from './DistintivoConfianza';
import { formatearNumero, formatearPesos } from './formato';

interface TablaDanosProps {
  danos: readonly DanoSectorizado[];
}

/**
 * El detalle línea a línea, cada daño **con su nivel de confianza a la vista**.
 *
 * Es la regla que sostiene la credibilidad del módulo: un ministerio tiene que
 * poder separar «12 viviendas destruidas verificadas por el CMGRD» de «37
 * reportes ciudadanos sin verificar». Mezclarlos sin decirlo sería justo el
 * problema que este panel viene a resolver, así que la columna de confianza no
 * es opcional ni se esconde en un desplegable.
 *
 * Va también el identificador del dato de origen: sin él, un ministerio que
 * duda de una cifra no tiene a qué reporte volver.
 */
export default function TablaDanos({ danos }: TablaDanosProps) {
  const { t } = useTranslation();

  return (
    <Ficha
      titulo={t('ungrd.paquete.danosTitulo')}
      icono={ListChecks}
      apunte={formatearNumero(danos.length)}
      sinRelleno
    >
      <p className="border-b border-papel-borde px-4 py-3 text-sm text-tinta-600 sm:px-5">
        {t('ungrd.paquete.danosAyuda')}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[60rem] border-collapse text-left text-sm">
          <caption className="solo-lector">{t('ungrd.paquete.danosTitulo')}</caption>
          <thead>
            <tr className="border-b-2 border-papel-borde bg-papel-hueco">
              <th scope="col" className="px-4 py-3 font-bold text-tinta-800">
                {t('ungrd.paquete.colMunicipio')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-tinta-800">
                {t('ungrd.paquete.colDescripcion')}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-bold text-tinta-800">
                {t('ungrd.paquete.colCantidad')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-tinta-800">
                {t('ungrd.paquete.colNivel')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-tinta-800">
                {t('ungrd.paquete.colConfianza')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-tinta-800">
                {t('ungrd.paquete.colOrigen')}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-bold text-tinta-800">
                {t('ungrd.paquete.colCosto')}
              </th>
            </tr>
          </thead>

          <tbody>
            {danos.map((dano) => (
              <tr key={dano.id} className="border-b border-papel-borde align-top">
                <th scope="row" className="px-4 py-3 text-left font-semibold text-tinta-900">
                  {dano.municipio}
                  <span className="block text-xs font-normal text-tinta-500">
                    {dano.departamento}
                  </span>
                </th>
                <td className="min-w-[18rem] px-4 py-3 text-tinta-800">{dano.descripcion}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-tinta-900">
                  {formatearNumero(dano.cantidad)}
                  <span className="block text-xs font-normal text-tinta-500">{dano.unidad}</span>
                </td>
                <td className="px-4 py-3 text-tinta-800">
                  {dano.nivel === undefined
                    ? t('ungrd.paquete.sinNivel')
                    : t(`ungrd.nivelDano.${dano.nivel}`)}
                </td>
                <td className="px-4 py-3">
                  <DistintivoConfianza nivel={dano.nivelConfianza} />
                </td>
                <td className="px-4 py-3 text-tinta-800">
                  {t(`ungrd.origen.${dano.origen}`)}
                  <span className="mt-0.5 block font-mono text-xs text-tinta-500">
                    {dano.origenId}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-tinta-900">
                  {dano.costoEstimado === undefined
                    ? t('ungrd.paquete.sinCosto')
                    : formatearPesos(dano.costoEstimado)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Ficha>
  );
}
