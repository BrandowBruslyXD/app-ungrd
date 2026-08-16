import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleAlert, Info, Paperclip, Send } from 'lucide-react';
import Ficha from '@/components/ui/Ficha';
import { CATALOGO_SECTORES } from '@/lib/catalogoSectores';
import type { EnvioRegistrado } from '@/types/sectorial';
import { formatearFechaHora } from './formatoPanel';

interface BitacoraEnviosProps {
  envios: readonly EnvioRegistrado[];
}

/**
 * Subpanel D · Bitácora de envíos.
 *
 * No es adorno de auditoría: es lo que permite responder «¿ya le avisamos a
 * Educación?» sin preguntarle a nadie. Y un envío que no queda registrado no
 * ocurrió.
 */
export default function BitacoraEnvios({ envios }: BitacoraEnviosProps) {
  const { t } = useTranslation();

  const ordenados = useMemo(
    () => [...envios].sort((a, b) => b.enviadoEn.localeCompare(a.enviadoEn)),
    [envios],
  );

  return (
    <Ficha
      titulo={t('ungrd.panel.bitacoraTitulo')}
      icono={Send}
      apunte={t('ungrd.panel.bitacoraApunte', { total: ordenados.length })}
      sinRelleno
    >
      <div className="space-y-4 p-4 sm:p-5">
        <p className="text-tinta-600">{t('ungrd.panel.bitacoraDescripcion')}</p>

        {/* Se dice, no se disimula: presentar como real un envío que no ocurrió
            sería engañar, y si preguntan en la demo se nota. */}
        <div className="aviso-info">
          <Info className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{t('ungrd.panel.simuladoTitulo')}</p>
            <p className="mt-1">{t('ungrd.panel.simuladoCuerpo')}</p>
          </div>
        </div>
      </div>

      {ordenados.length === 0 ? (
        <p className="border-t border-papel-borde px-4 py-10 text-center text-tinta-500">
          {t('ungrd.panel.bitacoraVacia')}
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-papel-borde">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <caption className="solo-lector">{t('ungrd.panel.bitacoraTablaResumen')}</caption>
            <thead>
              <tr className="border-b border-papel-borde bg-papel-hueco text-sm text-tinta-600">
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t('ungrd.panel.colDestino')}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t('ungrd.panel.colEnviadoEn')}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t('ungrd.panel.colAprobadoPor')}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t('ungrd.panel.colArchivos')}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t('ungrd.panel.colModo')}
                </th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((envio) => (
                <tr key={envio.id} className="border-b border-papel-borde last:border-b-0">
                  <th scope="row" className="px-4 py-3">
                    <span className="block font-semibold text-tinta-900">
                      {t(CATALOGO_SECTORES[envio.sector].claveNombre)}
                    </span>
                    <span className="mt-0.5 block text-sm font-normal text-tinta-600">
                      {envio.entidad}
                    </span>
                    <span className="mt-0.5 block font-mono text-sm font-normal text-tinta-500">
                      {envio.destinatario}
                    </span>
                  </th>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-tinta-700">
                    {formatearFechaHora(envio.enviadoEn)}
                  </td>
                  <td className="px-4 py-3 text-tinta-700">{envio.enviadoPor}</td>
                  <td className="px-4 py-3">
                    <ul className="space-y-1">
                      {envio.archivos.map((archivo) => (
                        <li
                          key={archivo}
                          className="flex items-center gap-1.5 font-mono text-sm text-tinta-600"
                        >
                          <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {archivo}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3">
                    <span className="distintivo bg-espera-50 text-espera-700">
                      <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{t(`ungrd.modoEnvio.${envio.modo}`)}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Ficha>
  );
}
