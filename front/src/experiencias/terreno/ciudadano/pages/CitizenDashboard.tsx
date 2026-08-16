import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  FileText,
  HandHeart,
  Bell,
  ChevronRight,
  MapPin,
  Clock,
  Satellite,
  TrendingUp,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import { listAlertas } from '@/shared/api/reportes';
import { useReportesDemo } from '@/shared/hooks/useReportesDemo';
import { aReporteLegado } from '@/shared/hooks/reporteLegado';
import { SeverityBadge, StatusBadge } from '@/shared/components/StatusBadge';
import EmergencyIcon from '@/shared/components/EmergencyIcon';
import EstadoVacio from '@/experiencias/terreno/comunes/EstadoVacio';

function formatTimeAgo(iso: string, t: TFunction): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return t('time.lessThanOneHour');
  if (hours < 24) return t('time.hoursAgo', { hours });
  const days = Math.floor(hours / 24);
  return t('time.days', { days });
}

export default function CitizenDashboard() {
  const { t } = useTranslation();
  const { reportes, obtenerExtras } = useReportesDemo();
  const mockAlerts = listAlertas();

  /**
   * Los mismos reportes que ve «Mis reportes» y que atiende el gestor: sale del estado compartido
   * para que el inicio no muestre un estado viejo después de que la sala de crisis lo cambió.
   */
  const misReportes = useMemo(
    () =>
      [...reportes]
        .sort((uno, otro) => new Date(otro.creadoEn).getTime() - new Date(uno.creadoEn).getTime())
        .map((detalle) => aReporteLegado(detalle, t, obtenerExtras(detalle.codigo))),
    [reportes, obtenerExtras, t],
  );
  const activeReports = misReportes.filter((r) => r.status !== 'Cerrado');
  const alertaCritica = mockAlerts.find((a) => a.prioridad === 'Alta' && a.active);

  const quickActions = [
    {
      to: '/reportar',
      label: t('citizen.reportEmergency'),
      description: t('citizen.reportEmergencyDesc'),
      icon: AlertTriangle,
      color: 'bg-red-600',
    },
    {
      to: '/mis-reportes',
      label: t('citizen.myReports'),
      description: t('citizen.myReportsDesc'),
      icon: FileText,
      color: 'bg-ungrd-600',
    },
    {
      to: '/ayudas',
      label: t('citizen.availableAid'),
      description: t('citizen.availableAidDesc'),
      icon: HandHeart,
      color: 'bg-emerald-600',
    },
    {
      to: '/alertas',
      label: t('citizen.activeAlerts'),
      description: t('citizen.activeAlertsDesc'),
      icon: Bell,
      color: 'bg-ungrd-800',
    },
  ];

  const trustStats = [
    { value: t('citizen.attendedValue'), label: t('citizen.reportsAttended'), color: 'text-ungrd-600' },
    { value: t('citizen.verifiedValue'), label: t('citizen.verified'), color: 'text-emerald-600' },
    // gold-800: el 700 sobre blanco no llega al contraste mínimo de texto.
    { value: t('citizen.spendingValue'), label: t('citizen.spendingTracked'), color: 'text-gold-800' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ungrd-800 via-ungrd-900 to-ungrd-950 p-6 sm:p-8">
        <div className="absolute inset-0 opacity-10" aria-hidden="true">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-gold-400 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-gold-500 blur-3xl" />
        </div>
        <div className="relative">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gold-400">
            <Satellite className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('citizen.satelliteMonitoring')}
          </p>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{t('citizen.heroTitle')}</h1>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-ungrd-100">
            {t('citizen.heroSubtitle')}
          </p>
          <div className="mt-4 flex flex-col gap-2 text-base text-ungrd-100 sm:flex-row sm:gap-6">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 shrink-0 text-gold-400" aria-hidden="true" />
              {t('citizen.activeReports', { count: misReportes.length })}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 shrink-0 text-gold-400" aria-hidden="true" />
              {t('citizen.responseTime')}
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quickActions.map(({ to, label, description, icon: Icon, color }) => (
          <Link key={to} to={to} className="card-hover group flex flex-col gap-3 p-4">
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm ${color}`}>
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold leading-tight text-slate-900 transition-colors group-hover:text-ungrd-700">
                {label}
              </span>
              <span className="mt-1 block text-sm leading-snug text-slate-600">{description}</span>
            </span>
          </Link>
        ))}
      </section>

      {alertaCritica && (
        <Link
          to="/alertas"
          className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 transition-colors hover:bg-red-100 min-h-toque"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600">
            <AlertTriangle className="h-6 w-6 text-white" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold text-red-900">{t('citizen.criticalAlert')}</span>
            <span className="block truncate text-base text-red-800">{alertaCritica.title}</span>
          </span>
          <ChevronRight className="h-6 w-6 shrink-0 text-red-600" aria-hidden="true" />
        </Link>
      )}

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h2 className="mb-3 text-xl font-semibold text-slate-900">{t('citizen.zoneMap')}</h2>
          <div className="card overflow-hidden">
            <div className="relative flex h-56 items-center justify-center bg-gradient-to-br from-ungrd-50 to-slate-100 sm:h-72">
              <div className="text-center">
                <MapPin className="mx-auto h-10 w-10 text-ungrd-300" aria-hidden="true" />
                <p className="mt-2 text-base text-slate-600">{t('citizen.interactiveMap')}</p>
              </div>
              <span className="absolute left-[30%] top-[40%] h-3 w-3 animate-pulse rounded-full bg-red-600 shadow-lg ring-4 ring-red-500/20" aria-hidden="true" />
              <span className="absolute left-[55%] top-[25%] h-3 w-3 rounded-full bg-orange-500 shadow-lg ring-4 ring-orange-500/20" aria-hidden="true" />
              <span className="absolute left-[70%] top-[60%] h-3 w-3 rounded-full bg-gold-500 shadow-lg ring-4 ring-gold-500/20" aria-hidden="true" />
              <span className="absolute left-[20%] top-[65%] h-3 w-3 rounded-full bg-emerald-600 shadow-lg ring-4 ring-emerald-500/20" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">{t('citizen.nearbyEmergencies')}</h2>
            <Link
              to="/mis-reportes"
              className="inline-flex items-center text-base font-medium text-ungrd-700 hover:text-ungrd-800 min-h-toque"
            >
              {t('citizen.seeAll')}
            </Link>
          </div>
          {activeReports.length === 0 ? (
            <EstadoVacio
              icono={FileText}
              titulo={t('citizen.emptyNearbyTitle')}
              descripcion={t('citizen.emptyNearbyBody')}
              accion={
                <Link to="/reportar" className="btn-primary btn-lg">
                  {t('citizen.emptyNearbyAction')}
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {activeReports.map((report) => (
                <Link
                  key={report.id}
                  to={`/reportes/${report.id}`}
                  className="card-hover group flex items-start gap-3 p-4 min-h-toque"
                >
                  <EmergencyIcon type={report.type} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold text-slate-900 transition-colors group-hover:text-ungrd-700">
                      {report.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-sm text-slate-600">
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{report.location}</span>
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={report.status} />
                      <SeverityBadge severity={report.prioridad} />
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-slate-500">
                    {formatTimeAgo(report.createdAt, t)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {trustStats.map(({ value, label, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${color} sm:text-3xl`}>{value}</p>
            <p className="mt-1 text-sm text-slate-600">{label}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
