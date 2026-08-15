import {
  AlertTriangle,
  Satellite,
  MessageSquare,
  Building,
  Bell,
  MapPin,
} from 'lucide-react';
import { mockAlerts } from '@/data/mock';
import { SeverityBadge } from '@/components/shared/StatusBadge';
import type { Alert } from '@/types';

const sourceConfig: Record<Alert['source'], { label: string; icon: typeof Satellite; color: string }> = {
  citizen: { label: 'Reporte ciudadano', icon: AlertTriangle, color: 'text-ungrd-600 bg-ungrd-50' },
  satellite: { label: 'Datos satelitales', icon: Satellite, color: 'text-emerald-600 bg-emerald-50' },
  social_media: { label: 'Redes sociales (IA)', icon: MessageSquare, color: 'text-gold-700 bg-gold-50' },
  official: { label: 'Alerta oficial', icon: Building, color: 'text-red-600 bg-red-50' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Alerts() {
  const activeAlerts = mockAlerts.filter((a) => a.active);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:py-12 animate-fade-in">
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 shrink-0 sm:h-10 sm:w-10">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Alertas Activas</h1>
          <p className="text-sm text-slate-500">
            {activeAlerts.length} alerta{activeAlerts.length !== 1 ? 's' : ''} en tu zona
          </p>
        </div>
      </div>

      {/* Source legend */}
      <div className="mb-6 flex flex-wrap gap-2">
        {Object.entries(sourceConfig).map(([key, { label, icon: Icon, color }]) => (
          <span key={key} className={`badge ${color}`}>
            <Icon className="h-3 w-3" />
            {label}
          </span>
        ))}
      </div>

      <div className="space-y-4">
        {activeAlerts.map((alert) => {
          const source = sourceConfig[alert.source];
          const SourceIcon = source.icon;
          const isCritical = alert.severity === 'critica';

          return (
            <div
              key={alert.id}
              className={`card p-3 sm:p-5 ${
                isCritical
                  ? 'border-red-200 bg-red-50/30 ring-1 ring-red-100'
                  : ''
              }`}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${source.color}`}
                >
                  <SourceIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <SeverityBadge severity={alert.severity} />
                    <span className={`badge ${source.color}`}>{source.label}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800">{alert.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                    {alert.description}
                  </p>
                  <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 sm:mt-3 sm:flex-row sm:gap-4">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{alert.location}</span>
                    </span>
                    <span className="shrink-0">{formatDate(alert.createdAt)}</span>
                  </div>
                </div>
              </div>
              {isCritical && (
                <div className="mt-4 rounded-lg bg-red-100/60 p-3">
                  <p className="text-xs font-semibold text-red-700">
                    Acción requerida: Si estás en la zona indicada, toma precauciones y sigue las instrucciones de las autoridades.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
