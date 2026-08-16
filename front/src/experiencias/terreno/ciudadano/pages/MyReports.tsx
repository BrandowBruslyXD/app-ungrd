import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, MapPin, Clock, Plus, Satellite, FileText, Eye, Home } from 'lucide-react';
import { listMisReportes } from '@/shared/api/reportes';
import { StatusBadge, SeverityBadge } from '@/shared/components/StatusBadge';
import EmergencyIcon from '@/shared/components/EmergencyIcon';
import TrustBadge from '@/shared/components/TrustBadge';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function MyReports() {
  const { t } = useTranslation();
  const mockReports = listMisReportes();

  const stats = [
    { value: mockReports.length, label: t('myReports.total'), icon: FileText, color: 'text-ungrd-600 bg-ungrd-50' },
    { value: mockReports.filter((r) => r.status !== 'Cerrado').length, label: t('myReports.active'), icon: Clock, color: 'text-gold-700 bg-gold-50' },
    { value: mockReports.filter((r) => r.satelliteVerified).length, label: t('myReports.verified'), icon: Satellite, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:py-12 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('myReports.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('myReports.subtitle')}</p>
        </div>
        <Link to="/reportar" className="btn-primary" aria-label={t('myReports.newReport')}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t('myReports.newReport')}</span>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {stats.map(({ value, label, icon: Icon, color }) => (
          <div key={label} className="card p-4 text-center">
            <Icon className={`mx-auto h-5 w-5 mb-1.5 ${color.split(' ')[0]}`} />
            <p className={`text-xl font-bold ${color.split(' ')[0]}`}>{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {mockReports.map((report) => (
          <Link
            key={report.id}
            to={`/reporte/${report.id}`}
            className="card-hover flex items-center gap-4 p-4 group"
          >
            <EmergencyIcon type={report.type} />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-xs font-mono text-slate-400">{report.id}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                  report.reportType === 'testigo'
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-red-50 text-red-600'
                }`}>
                  {report.reportType === 'testigo' ? <Eye className="h-3 w-3" /> : <Home className="h-3 w-3" />}
                  {report.reportType === 'testigo' ? t('myReports.witness') : t('myReports.affected')}
                </span>
                <TrustBadge level={report.trustLevel} />
              </div>
              <p className="text-sm font-semibold text-slate-800 group-hover:text-ungrd-600 transition-colors truncate">
                {report.title}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={report.status} />
                <SeverityBadge severity={report.prioridad} />
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[140px]">{report.location}</span>
                </span>
              </div>
            </div>

            <div className="hidden shrink-0 text-right sm:block">
              <p className="text-xs text-slate-400">{formatDate(report.createdAt)}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('myReports.updates', { count: report.timeline.length })}
              </p>
            </div>

            <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-ungrd-500 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
