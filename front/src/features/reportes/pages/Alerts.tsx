import { useTranslation } from 'react-i18next';
import { AlertTriangle, Satellite, MessageSquare, Building, MapPin, BellOff, Bell } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { listAlertas } from '@/api/reportes';
import { SeverityBadge } from '@/components/shared/StatusBadge';
import BandaPortada from '@/components/ui/BandaPortada';
import { FOTOS } from '@/lib/fotos';
import Aviso from '@/components/ui/Aviso';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import type { Alert } from '@/types';

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Alertas activas de la zona.
 *
 * El origen de cada alerta se muestra siempre, y no es un detalle: no vale lo
 * mismo un aviso que mandó un vecino que uno que confirmó un satélite o que
 * emitió la alcaldía. Es la misma lógica del nivel de confianza de los reportes,
 * aplicada aquí.
 */
export default function Alerts() {
  const { t } = useTranslation();
  const alertas = listAlertas().filter((a) => a.active);

  useTituloPagina(t('meta.alerts.title'), t('meta.alerts.description'));

  const origenes: Record<Alert['source'], { etiqueta: string; icono: LucideIcon; clases: string }> = {
    citizen: {
      etiqueta: t('alerts.sourceCitizen'),
      icono: AlertTriangle,
      clases: 'bg-tinta-100 text-tinta-700',
    },
    satellite: {
      etiqueta: t('alerts.sourceSatellite'),
      icono: Satellite,
      clases: 'bg-seguro-50 text-seguro-700',
    },
    social_media: {
      etiqueta: t('alerts.sourceSocial'),
      icono: MessageSquare,
      clases: 'bg-espera-50 text-espera-700',
    },
    official: {
      etiqueta: t('alerts.sourceOfficial'),
      icono: Building,
      clases: 'bg-azul-50 text-azul-700',
    },
  };

  return (
    <div className="animate-fade-in mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <div className="mb-7">
        <BandaPortada
          titulo={t('alerts.title')}
          descripcion={t('alerts.inYourZone', { count: alertas.length })}
          foto={FOTOS.montanasNubladas}
          alt="Cordillera bajo un cielo encapotado en el Valle del Cauca."
          icono={Bell}
        />
      </div>

      {alertas.length === 0 ? (
        <div className="ficha p-8 text-center">
          <BellOff className="mx-auto h-12 w-12 text-tinta-300" aria-hidden="true" />
          <p className="mt-4 text-lg font-bold">{t('alerts.emptyTitle')}</p>
          <p className="mt-2 text-tinta-600">{t('alerts.emptyBody')}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {alertas.map((alerta) => {
            const origen = origenes[alerta.source];
            const IconoOrigen = origen.icono;
            const critica = alerta.prioridad === 'Alta';

            return (
              <li key={alerta.id}>
                <article
                  className={`ficha overflow-hidden ${critica ? 'border-l-4 border-l-alerta-600' : ''}`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-4">
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-control ${origen.clases}`}
                        aria-hidden="true"
                      >
                        <IconoOrigen className="h-6 w-6" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <SeverityBadge severity={alerta.prioridad} />
                          <span className={`distintivo ${origen.clases}`}>{origen.etiqueta}</span>
                        </div>

                        <h2 className="text-lg leading-snug">{alerta.title}</h2>
                        <p className="mt-2 leading-relaxed text-tinta-700">{alerta.description}</p>

                        <p className="mt-3 flex items-center gap-2 font-semibold">
                          <MapPin className="h-5 w-5 shrink-0 text-tinta-500" aria-hidden="true" />
                          {alerta.location}
                        </p>
                        <p className="mt-1 text-sm text-tinta-500">
                          {formatearFecha(alerta.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {critica && (
                    <div className="border-t border-papel-borde">
                      <Aviso tono="alerta">{t('alerts.requiredAction')}</Aviso>
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
