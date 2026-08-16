import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Satellite,
  MapPin,
  TrendingUp,
  Truck,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import { listReportes } from '@/shared/api/reportes';
import { SeverityBadge, StatusBadge } from '@/shared/components/StatusBadge';
import EmergencyIcon from '@/shared/components/EmergencyIcon';
import TrustBadge from '@/shared/components/TrustBadge';
import type { ReportStatus } from '@/shared/types';

function formatTimeAgo(iso: string, t: TFunction): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return t('time.lessThanOneHourShort');
  if (hours < 24) return t('time.hoursShort', { hours });
  return t('time.days', { days: Math.floor(hours / 24) });
}

function MobileTriageSection({
  status,
  label,
  color,
  reports,
}: {
  status: ReportStatus;
  label: string;
  color: string;
  reports: ReturnType<typeof listReportes>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(status === 'Reportado');
  const columnReports = reports.filter((r) => r.status === status);

  return (
    <div className={`card border-l-4 ${color.replace('border-t-', 'border-l-')} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-3 text-left"
        aria-expanded={open}
        aria-label={open ? t('manager.collapseColumn', { label }) : t('manager.expandColumn', { label })}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          <span className="badge bg-slate-100 text-slate-500">{columnReports.length}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />}
      </button>
      {open && columnReports.length > 0 && (
        <div className="border-t border-slate-100 p-2 space-y-2">
          {columnReports.map((report) => (
            <div key={report.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <EmergencyIcon type={report.type} size="sm" />
                <SeverityBadge severity={report.prioridad} />
                <StatusBadge status={report.status} />
                <TrustBadge level={report.trustLevel} />
              </div>
              <p className="text-xs font-semibold text-slate-800 line-clamp-2">{report.title}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="h-3 w-3 shrink-0" />
                {formatTimeAgo(report.createdAt, t)}
                {report.satelliteVerified && <Satellite className="h-3 w-3 ml-1 text-emerald-500" />}
              </p>
            </div>
          ))}
        </div>
      )}
      {open && columnReports.length === 0 && (
        <div className="border-t border-slate-100 p-4 text-center text-xs text-slate-300">
          {t('manager.emptyColumn')}
        </div>
      )}
    </div>
  );
}

export default function ManagerDashboard() {
  const { t } = useTranslation();
  const mockReports = listReportes();

  const columns: { status: ReportStatus; label: string; color: string }[] = [
    { status: 'Reportado', label: t('manager.colReported'), color: 'border-t-slate-400' },
    { status: 'Verificado', label: t('manager.colVerified'), color: 'border-t-ungrd-400' },
    { status: 'Asignado', label: t('manager.colAssigned'), color: 'border-t-amber-400' },
    { status: 'EnAtencion', label: t('manager.colInCare'), color: 'border-t-blue-400' },
    { status: 'Atendido', label: t('manager.colAttended'), color: 'border-t-indigo-400' },
    { status: 'Cerrado', label: t('manager.colClosed'), color: 'border-t-emerald-400' },
  ];

  const statCards = [
    { label: t('manager.statReports'), value: t('manager.statReportsValue'), icon: TrendingUp, color: 'text-ungrd-600 bg-ungrd-50' },
    { label: t('manager.statActive'), value: t('manager.statActiveValue'), icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: t('manager.statResolvedToday'), value: t('manager.statResolvedValue'), icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: t('manager.statAvgTime'), value: t('manager.statAvgTimeValue'), icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: t('manager.statToVerify'), value: t('manager.statToVerifyValue'), icon: Satellite, color: 'text-gold-700 bg-gold-50' },
    { label: t('manager.statResources'), value: t('manager.statResourcesValue'), icon: Truck, color: 'text-slate-600 bg-slate-100' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="border-b border-slate-200 bg-white px-4 py-4 lg:px-8 lg:py-5">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-800 truncate lg:text-2xl">
                {t('manager.title')}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                {t('manager.subtitle')}
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 shrink-0 sm:px-3 sm:py-1.5 sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {t('manager.online')}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8 lg:py-6">
        <div className="grid grid-cols-3 gap-2 mb-6 sm:gap-3 lg:grid-cols-6 lg:mb-8">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8 ${color}`}>
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <ArrowUpRight className="h-3 w-3 text-slate-300 hidden sm:block" />
              </div>
              <p className="text-base font-bold text-slate-800 sm:text-xl">{value}</p>
              <p className="text-[10px] text-slate-500 sm:text-xs">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-1">
            <h2 className="mb-2 text-sm font-bold text-slate-800 sm:mb-3 sm:text-base">{t('manager.opsMap')}</h2>
            <div className="card overflow-hidden">
              <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 sm:h-80">
                <div className="text-center">
                  <MapPin className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-xs text-slate-400">{t('manager.mapHint')}</p>
                </div>
                <div className="absolute left-[25%] top-[35%] h-3 w-3 rounded-full bg-red-500 ring-4 ring-red-500/20 animate-pulse" />
                <div className="absolute left-[60%] top-[20%] h-3 w-3 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
                <div className="absolute left-[75%] top-[55%] h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                <div className="absolute left-[40%] top-[70%] h-3 w-3 rounded-full bg-orange-500 ring-4 ring-orange-500/20 animate-pulse" />
              </div>
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 sm:p-3">
                <div className="flex flex-wrap gap-2 text-[11px] sm:gap-3 sm:text-xs">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> {t('manager.legendCritical')}</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> {t('manager.legendHigh')}</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> {t('manager.legendMedium')}</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {t('manager.legendResolved')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h2 className="mb-2 text-sm font-bold text-slate-800 sm:mb-3 sm:text-base">{t('manager.triageBoard')}</h2>

            <div className="space-y-2 lg:hidden">
              {columns.map(({ status, label, color }) => (
                <MobileTriageSection key={status} status={status} label={label} color={color} reports={mockReports} />
              ))}
            </div>

            <div className="hidden lg:flex gap-3 overflow-x-auto pb-2">
              {columns.map(({ status, label, color }) => {
                const reports = mockReports.filter((r) => r.status === status);
                return (
                  <div key={status} className="min-w-[180px] flex-1">
                    <div className={`card border-t-4 ${color}`}>
                      <div className="flex items-center justify-between p-3 border-b border-slate-100">
                        <span className="text-sm font-semibold text-slate-700">{label}</span>
                        <span className="badge bg-slate-100 text-slate-500">{reports.length}</span>
                      </div>
                      <div className="p-2 space-y-2 min-h-[120px]">
                        {reports.map((report) => (
                          <div key={report.id} className="rounded-xl border border-slate-200 bg-white p-3 hover:shadow-sm transition-shadow">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <EmergencyIcon type={report.type} size="sm" />
                              <SeverityBadge severity={report.prioridad} />
                              <StatusBadge status={report.status} />
                              <TrustBadge level={report.trustLevel} />
                            </div>
                            <p className="text-xs font-semibold text-slate-800 line-clamp-2">{report.title}</p>
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(report.createdAt, t)}
                              {report.satelliteVerified && <Satellite className="h-3 w-3 ml-1 text-emerald-500" />}
                            </p>
                          </div>
                        ))}
                        {reports.length === 0 && (
                          <div className="flex items-center justify-center h-20 text-xs text-slate-300">{t('manager.emptyColumn')}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
