import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Share2 } from 'lucide-react';
import Ficha from '@/components/ui/Ficha';
import { CATALOGO_SECTORES } from '@/lib/catalogoSectores';
import { agruparPorSector } from '@/lib/sectorial';
import type {
  DanoSectorizado,
  EstadoPaquete,
  PaqueteMinisterio,
  Sector,
} from '@/types/sectorial';
import DistintivoEstadoPaquete from './DistintivoEstadoPaquete';
import ProporcionConfianza from './ProporcionConfianza';
import ConfianzaPorSector from './graficas/ConfianzaPorSector';
import DanoPorSector from './graficas/DanoPorSector';
import { ICONO_ESTADO_PAQUETE } from './estadoPaquete';
import { formatearEntero, formatearPesos } from './formatoPanel';

/*
 * Los iconos del pie salen del mismo mapa que usa el distintivo de estado.
 *
 * Es la misma casilla del flujo contada de otra forma —«3 aprobados» resume las
 * filas que llevan el distintivo «Aprobado»—, y con dos glifos distintos para
 * el mismo estado la relación entre el pie y la tabla deja de verse.
 */
const IconoListos = ICONO_ESTADO_PAQUETE.Aprobado;
const IconoEnviados = ICONO_ESTADO_PAQUETE.Enviado;
const IconoBloqueados = ICONO_ESTADO_PAQUETE.EnRevision;

/** Un paquete sin firma humana no puede salir, y por eso cuenta como bloqueado. */
const SIN_FIRMA: readonly EstadoPaquete[] = ['Borrador', 'EnRevision'];

interface RepartoPorSectorProps {
  danos: readonly DanoSectorizado[];
  paquetes: readonly PaqueteMinisterio[];
  /**
   * Código del desastre, tal como viaja en la URL.
   *
   * El informe de un ministerio no existe sin su emergencia: cuelga del evento
   * y no de un sector suelto, o dos desastres distintos abrirían el mismo
   * enlace.
   */
  codigoEvento: string;
}

/** Subpanel B · Reparto por sector: qué le toca a cada ministerio. */
export default function RepartoPorSector({
  danos,
  paquetes,
  codigoEvento,
}: RepartoPorSectorProps) {
  const { t } = useTranslation();

  /*
   * Las trece filas se calculan sobre los daños que hay en pantalla, no se leen
   * de los totales guardados en el paquete.
   *
   * Es lo que hace que reclasificar un daño en la bandeja de sin clasificar se
   * vea aquí en el mismo momento. Si la tabla leyera el total sembrado, el
   * funcionario asignaría un sector y no pasaría nada visible: parecería que el
   * sistema perdió su trabajo.
   */
  const resumenes = useMemo(() => agruparPorSector(danos), [danos]);

  const estadoPorSector = useMemo(() => {
    const estados = new Map<Sector, EstadoPaquete>();
    for (const paquete of paquetes) estados.set(paquete.sector, paquete.estado);
    return estados;
  }, [paquetes]);

  const filas = resumenes.map((resumen) => ({
    resumen,
    estado: estadoPorSector.get(resumen.sector) ?? 'Borrador',
  }));

  /*
   * «Bloqueado» no es un estado del modelo: es la lectura de dos campos juntos.
   * Un sector con daños que todavía no tiene firma no se puede enviar, y esa es
   * la cifra que le dice al funcionario cuánto le falta. Un sector en cero no
   * está bloqueado —no hay nada que mandar—, así que no entra en la cuenta.
   */
  const listos = filas.filter(({ estado }) => estado === 'Aprobado').length;
  const enviados = filas.filter(({ estado }) => estado === 'Enviado').length;
  const bloqueados = filas.filter(
    ({ resumen, estado }) => resumen.totalDanos > 0 && SIN_FIRMA.includes(estado),
  ).length;

  return (
    <Ficha
      titulo={t('ungrd.panel.repartoTitulo')}
      icono={Share2}
      apunte={t('ungrd.panel.repartoApunte', { total: filas.length })}
      sinRelleno
    >
      <p className="px-4 pt-4 text-tinta-600 sm:px-5">{t('ungrd.panel.repartoDescripcion')}</p>

      {/*
        Las dos gráficas van antes de las trece filas y en este orden: «dónde
        está el daño» y «cuánto de eso es fiable» son las dos mitades de una
        sola decisión —qué paquete se puede aprobar hoy—, y juntas se responden
        de un vistazo donde la tabla obliga a recorrer trece renglones.

        Una debajo de la otra, nunca en dos columnas: las etiquetas de los trece
        sectores necesitan el ancho completo, y a media columna el texto del
        `viewBox` quedaría por debajo del tamaño legible en un portátil.
      */}
      <div className="mt-5 space-y-8 px-4 sm:px-5">
        <DanoPorSector resumenes={resumenes} />
        <ConfianzaPorSector resumenes={resumenes} />
      </div>

      <div className="mt-5 overflow-x-auto border-t border-papel-borde">
        <table className="w-full min-w-[62rem] border-collapse text-left">
          <caption className="solo-lector">{t('ungrd.panel.repartoTablaResumen')}</caption>
          <thead>
            <tr className="border-b border-papel-borde bg-papel-hueco text-sm text-tinta-600">
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('ungrd.panel.colSector')}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('ungrd.panel.colEntidad')}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                {t('ungrd.panel.colDanos')}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                {t('ungrd.panel.colMunicipios')}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                {t('ungrd.panel.colCosto')}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('ungrd.panel.colConfianza')}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('ungrd.panel.colEstadoPaquete')}
              </th>
            </tr>
          </thead>

          <tbody>
            {filas.map(({ resumen, estado }) => {
              const ficha = CATALOGO_SECTORES[resumen.sector];
              const nombre = t(ficha.claveNombre);
              const IconoSector = ficha.icono;
              const vacio = resumen.totalDanos === 0;

              return (
                <tr
                  key={resumen.sector}
                  /* Un sector sin daños se muestra apagado, no se esconde: que a
                     un ministerio no le toque nada de esta emergencia es
                     información, y alguien va a preguntar por ella. */
                  className={`border-b border-papel-borde last:border-b-0 ${
                    vacio ? 'bg-papel-hueco/50' : 'hover:bg-azul-50'
                  }`}
                >
                  <th scope="row" className="px-4 py-2 font-semibold">
                    {vacio ? (
                      <span className="inline-flex min-h-[2.75rem] items-center gap-2.5 text-tinta-400">
                        <IconoSector className="h-5 w-5 shrink-0" aria-hidden="true" />
                        {nombre}
                      </span>
                    ) : (
                      <Link
                        to={`/gestor/reparto/${codigoEvento}/${resumen.sector}`}
                        aria-label={t('ungrd.panel.abrirPaquete', { sector: nombre })}
                        className="inline-flex min-h-[2.75rem] items-center gap-2.5 rounded-control text-azul-700 hover:underline"
                      >
                        <IconoSector className="h-5 w-5 shrink-0" aria-hidden="true" />
                        {nombre}
                      </Link>
                    )}
                  </th>

                  <td className={`px-4 py-2 text-sm ${vacio ? 'text-tinta-400' : 'text-tinta-600'}`}>
                    {ficha.entidad}
                  </td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums ${vacio ? 'text-tinta-400' : 'text-tinta-900'}`}
                  >
                    {formatearEntero(resumen.totalDanos)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums ${vacio ? 'text-tinta-400' : 'text-tinta-900'}`}
                  >
                    {formatearEntero(resumen.totalMunicipios)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-2 text-right tabular-nums ${
                      vacio ? 'text-tinta-400' : 'font-semibold text-tinta-900'
                    }`}
                  >
                    {formatearPesos(resumen.costoEstimado)}
                  </td>
                  <td className="px-4 py-2">
                    <ProporcionConfianza desglose={resumen.confianza} />
                  </td>
                  <td className="px-4 py-2">
                    <DistintivoEstadoPaquete estado={estado} />
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-azul-700 bg-papel-hueco">
              <td colSpan={7} className="px-4 py-3">
                <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <li className="flex items-center gap-2 text-tinta-700">
                    <IconoListos className="h-5 w-5 shrink-0 text-azul-700" aria-hidden="true" />
                    <span className="font-bold tabular-nums text-tinta-900">{listos}</span>
                    {t('ungrd.panel.paquetesListos')}
                  </li>
                  <li className="flex items-center gap-2 text-tinta-700">
                    <IconoEnviados className="h-5 w-5 shrink-0 text-seguro-600" aria-hidden="true" />
                    <span className="font-bold tabular-nums text-tinta-900">{enviados}</span>
                    {t('ungrd.panel.paquetesEnviados')}
                  </li>
                  <li className="flex items-center gap-2 text-tinta-700">
                    <IconoBloqueados
                      className="h-5 w-5 shrink-0 text-espera-600"
                      aria-hidden="true"
                    />
                    <span className="font-bold tabular-nums text-tinta-900">{bloqueados}</span>
                    {t('ungrd.panel.paquetesBloqueados')}
                  </li>
                </ul>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Ficha>
  );
}
