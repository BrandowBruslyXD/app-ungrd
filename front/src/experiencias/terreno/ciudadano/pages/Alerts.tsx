import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Satellite,
  MessageSquare,
  Building,
  Bell,
  BellOff,
  MapPin,
} from 'lucide-react';
import { listAlertas } from '@/shared/api/reportes';
import { SeverityBadge } from '@/shared/components/StatusBadge';
import type { Alert } from '@/shared/types';
import EncabezadoPantalla from '@/experiencias/terreno/comunes/EncabezadoPantalla';
import EstadoVacio from '@/experiencias/terreno/comunes/EstadoVacio';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Alerts() {
  const { t } = useTranslation();
  const mockAlerts = listAlertas();
  const activeAlerts = mockAlerts.filter((a) => a.active);

  const sourceConfig: Record<Alert['source'], { label: string; icon: typeof Satellite; color: string }> = {
    citizen: { label: t('alerts.sourceCitizen'), icon: AlertTriangle, color: 'text-ungrd-700 bg-ungrd-50' },
    satellite: { label: t('alerts.sourceSatellite'), icon: Satellite, color: 'text-emerald-700 bg-emerald-50' },
    // gold-800 y no gold-700: el 700 sobre gold-50 no alcanza el contraste mínimo de texto.
    social_media: { label: t('alerts.sourceSocial'), icon: MessageSquare, color: 'text-gold-800 bg-gold-50' },
    official: { label: t('alerts.sourceOfficial'), icon: Building, color: 'text-red-700 bg-red-50' },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <EncabezadoPantalla
        icono={Bell}
        titulo={t('alerts.title')}
        descripcion={t('alerts.inYourZone', { count: activeAlerts.length })}
      />

      {/* La leyenda va rotulada porque, sin título, cuatro insignias bajo el encabezado parecen
          filtros que se pueden tocar. */}
      <section className="card p-4">
        <h2 className="text-base font-semibold text-slate-700">{t('alerts.sourcesTitle')}</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {Object.entries(sourceConfig).map(([key, { label, icon: Icon, color }]) => (
            <li key={key} className={`badge badge-lg ${color}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </section>

      {activeAlerts.length === 0 ? (
        <EstadoVacio
          icono={BellOff}
          titulo={t('alerts.emptyTitle')}
          descripcion={t('alerts.emptyBody')}
        />
      ) : (
        <div className="space-y-4">
          {activeAlerts.map((alert) => {
            const source = sourceConfig[alert.source];
            const SourceIcon = source.icon;
            const isCritical = alert.prioridad === 'Alta';

            return (
              <article
                key={alert.id}
                className={`card p-4 sm:p-5 ${isCritical ? 'border-red-200 bg-red-50/40 ring-1 ring-red-100' : ''}`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${source.color}`}>
                    <SourceIcon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={alert.prioridad} />
                      <span className={`badge badge-lg ${source.color}`}>{source.label}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{alert.title}</h3>
                    <p className="mt-1 text-base leading-relaxed text-slate-700">{alert.description}</p>
                    <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600 sm:mt-3 sm:flex-row sm:gap-4">
                      <span className="flex min-w-0 items-center gap-1">
                        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{alert.location}</span>
                      </span>
                      <span className="shrink-0">{formatDate(alert.createdAt)}</span>
                    </div>
                  </div>
                </div>
                {isCritical && (
                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-100/70 p-3 text-base font-medium leading-relaxed text-red-900">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    {t('alerts.requiredAction')}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
