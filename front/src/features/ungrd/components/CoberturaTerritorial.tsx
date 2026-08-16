import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleAlert, CircleCheck, CircleHelp, Map, PhoneCall } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Ficha from '@/components/ui/Ficha';
import { resumenCobertura } from '@/lib/sectorial';
import type { CoberturaMunicipio, EstadoCobertura } from '@/types/sectorial';
import BarraCobertura from './graficas/BarraCobertura';
import { formatearEntero, formatearFechaHora } from './formatoPanel';

/**
 * Cómo se ve cada estado de cobertura en la tabla.
 *
 * Cada uno lleva icono, palabra y color: el color nunca es la única señal, y
 * los tres tonos son los validados contra daltonismo en
 * `docs/REPARTO-SECTORIAL.md` —verde, azul y rojo—.
 */
const ASPECTO: Record<EstadoCobertura, { icono: LucideIcon; distintivo: string }> = {
  EnSilencio: {
    icono: CircleHelp,
    distintivo: 'bg-alerta-50 text-alerta-700',
  },
  SoloAutorreportes: {
    icono: CircleAlert,
    distintivo: 'bg-azul-50 text-azul-700',
  },
  ConEdan: {
    icono: CircleCheck,
    distintivo: 'bg-seguro-50 text-seguro-700',
  },
};

/**
 * **El silencio va primero**, y no es una preferencia de orden.
 *
 * Un municipio del que no llegó nada no es un municipio sin daños: es del que
 * no sabemos nada, y probablemente sea el que peor está. Ponerlo al final, bajo
 * los que ya mandaron su EDAN, es esconder justo lo único que este subpanel
 * aporta y que ningún sistema actual muestra.
 */
const ORDEN_ESTADO: readonly EstadoCobertura[] = ['EnSilencio', 'SoloAutorreportes', 'ConEdan'];

interface CoberturaTerritorialProps {
  cobertura: readonly CoberturaMunicipio[];
  /**
   * Bloque que cierra el subpanel, debajo de la tabla.
   *
   * Es una ranura y no un dato porque lo que se monta ahí —la entrada de datos
   * en el tiempo— se alimenta de los daños, que viven en el estado de la
   * página. Este componente solo sabe de cobertura territorial.
   */
  cierre?: ReactNode;
}

/** Subpanel A · Cobertura territorial: de dónde **no** ha llegado nada. */
export default function CoberturaTerritorial({ cobertura, cierre }: CoberturaTerritorialProps) {
  const { t } = useTranslation();

  const resumen = useMemo(() => resumenCobertura(cobertura), [cobertura]);

  const municipios = useMemo(
    () =>
      [...cobertura].sort((a, b) => {
        const orden = ORDEN_ESTADO.indexOf(a.estado) - ORDEN_ESTADO.indexOf(b.estado);
        if (orden !== 0) return orden;
        return a.municipio.localeCompare(b.municipio, 'es');
      }),
    [cobertura],
  );

  return (
    <Ficha
      titulo={t('ungrd.panel.coberturaTitulo')}
      icono={Map}
      apunte={t('ungrd.panel.coberturaApunte', { total: resumen.totalMunicipios })}
      sinRelleno
    >
      <div className="space-y-4 p-4 sm:p-5">
        <p className="text-tinta-600">{t('ungrd.panel.coberturaDescripcion')}</p>

        {/* El reparto de un vistazo va antes que el detalle: primero cuánto
            territorio está callado, después quién. La gráfica trae su propia
            leyenda con cifra, glifo y palabra, así que reemplaza a la barra y
            al listado que este subpanel dibujaba a mano. */}
        <BarraCobertura resumen={resumen} />

        <div className="aviso-alerta">
          <PhoneCall className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{t('ungrd.panel.silencioTitulo')}</p>
            <p className="mt-1">{t('ungrd.panel.silencioCuerpo')}</p>
          </div>
        </div>
      </div>

      {/* Tabla densa: en un portátil de 1280 px se desplaza dentro de su propia
          caja en vez de estirar la página entera. */}
      <div className="overflow-x-auto border-t border-papel-borde">
        <table className="w-full min-w-[42rem] border-collapse text-left">
          <caption className="solo-lector">{t('ungrd.panel.coberturaTablaResumen')}</caption>
          <thead>
            <tr className="border-b border-papel-borde bg-papel-hueco text-sm text-tinta-600">
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('ungrd.panel.colMunicipio')}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('ungrd.panel.colDepartamento')}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('ungrd.panel.colEstadoCobertura')}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                {t('ungrd.panel.colReportes')}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('ungrd.panel.colUltimoDato')}
              </th>
            </tr>
          </thead>
          <tbody>
            {municipios.map((municipio) => {
              const { icono: Icono, distintivo } = ASPECTO[municipio.estado];
              return (
                <tr
                  key={`${municipio.departamento}-${municipio.municipio}`}
                  className="border-b border-papel-borde last:border-b-0"
                >
                  <th scope="row" className="px-4 py-3 font-semibold text-tinta-900">
                    {municipio.municipio}
                  </th>
                  <td className="px-4 py-3 text-tinta-600">{municipio.departamento}</td>
                  <td className="px-4 py-3">
                    <span className={`distintivo ${distintivo}`}>
                      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{t(`ungrd.cobertura.${municipio.estado}`)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-tinta-700">
                    {formatearEntero(municipio.reportesRecibidos)}
                  </td>
                  <td className="px-4 py-3 text-sm text-tinta-600">
                    {municipio.ultimoDatoEn === null
                      ? t('ungrd.panel.sinDatoAun')
                      : formatearFechaHora(municipio.ultimoDatoEn)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {cierre && <div className="border-t border-papel-borde p-4 sm:p-5">{cierre}</div>}
    </Ficha>
  );
}
