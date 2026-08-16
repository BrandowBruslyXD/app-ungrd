import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, MapPin, Plus, Eye, Home, Inbox, ClipboardList } from 'lucide-react';
import { useReportes } from '@/hooks/useReportesApi';
import { Cargando, ErrorAlCargar, AvisoSinConexion } from '@/components/ui/EstadoDeCarga';
import { StatusBadge } from '@/components/shared/StatusBadge';
import EmergencyIcon from '@/components/shared/EmergencyIcon';
import TrustBadge from '@/components/shared/TrustBadge';
import BandaPortada from '@/components/ui/BandaPortada';
import { FOTOS } from '@/lib/fotos';
import { useTituloPagina } from '@/hooks/useTituloPagina';

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Listado de los reportes de la persona.
 *
 * Cambios respecto al diseño anterior, todos por la misma razón:
 *
 * - **El código va primero y en grande.** Antes era un `text-xs` gris de 12px
 *   perdido entre otros distintivos. Es el dato con el que la persona consulta
 *   su caso y con el que lo dicta por teléfono; tiene que poder leerlo.
 * - **Fuera los tres contadores de arriba.** «3 totales · 2 activos ·
 *   1 verificado» le sirve a un tablero de gestión, no a alguien que quiere
 *   saber qué pasó con su casa. El espacio se lo lleva la lista.
 * - **El título no se trunca.** Un reporte que dice «Se cayó el muro de
 *   contención de la…» no le sirve a nadie.
 */
export default function MyReports() {
  const { t } = useTranslation();
  const { reportes, cargando, error, sinConexion, reintentar } = useReportes();

  useTituloPagina(t('meta.myReports.title'), t('meta.myReports.description'));

  return (
    <div className="animate-fade-in mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <div className="mb-7">
        <BandaPortada
          titulo={t('myReports.title')}
          descripcion={t('myReports.subtitle')}
          foto={FOTOS.laderaNubes}
          alt="Ladera cubierta de nubes bajas en el Quindío."
          icono={ClipboardList}
        >
          <Link to="/reportar" className="btn-accent min-h-control w-full px-6 lg:w-auto">
            <Plus className="h-6 w-6" aria-hidden="true" />
            {t('myReports.newReport')}
          </Link>
        </BandaPortada>
      </div>

      {sinConexion && <AvisoSinConexion />}

      {error && !reportes.length && (
        <div className="mb-6">
          <ErrorAlCargar mensaje={error} onReintentar={reintentar} />
        </div>
      )}

      {cargando ? (
        <Cargando filas={3} etiqueta="Cargando tus reportes" />
      ) : reportes.length === 0 ? (
        <div className="ficha p-8 text-center">
          <Inbox className="mx-auto h-12 w-12 text-tinta-300" aria-hidden="true" />
          <p className="mt-4 text-lg font-bold">{t('myReports.emptyTitle')}</p>
          <p className="mt-2 text-tinta-600">{t('myReports.emptyBody')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reportes.map((reporte) => (
            <li key={reporte.id}>
              <Link
                to={`/reporte/${reporte.id}`}
                className="ficha-pulsable group flex items-start gap-4 p-4 sm:p-5"
              >
                <EmergencyIcon type={reporte.type} />

                <div className="min-w-0 flex-1">
                  <p className="break-all font-mono text-sm font-bold text-azul-700">{reporte.id}</p>

                  <p className="mt-1 font-bold leading-snug group-hover:text-azul-700">
                    {reporte.title}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={reporte.status} />
                    <TrustBadge level={reporte.trustLevel} />
                    <span className="distintivo bg-tinta-100 text-tinta-700">
                      {reporte.reportType === 'testigo' ? (
                        <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                      {reporte.reportType === 'testigo'
                        ? t('myReports.witness')
                        : t('myReports.affected')}
                    </span>
                  </div>

                  {reporte.location && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-tinta-600">
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {reporte.location}
                    </p>
                  )}

                  <p className="mt-1 text-sm text-tinta-500">{formatearFecha(reporte.createdAt)}</p>
                </div>

                <ChevronRight
                  className="mt-1 h-6 w-6 shrink-0 text-tinta-300 group-hover:text-azul-600"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
