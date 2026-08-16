import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, MapPin, Clock, Plus, Satellite, FileText, Eye, Home } from 'lucide-react';
import { useReportesDemo } from '@/shared/hooks/useReportesDemo';
import { aReporteLegado } from '@/shared/hooks/reporteLegado';
import { StatusBadge, SeverityBadge } from '@/shared/components/StatusBadge';
import EmergencyIcon from '@/shared/components/EmergencyIcon';
import TrustBadge from '@/shared/components/TrustBadge';
import EncabezadoPantalla from '@/experiencias/terreno/comunes/EncabezadoPantalla';
import EstadoVacio from '@/experiencias/terreno/comunes/EstadoVacio';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function MyReports() {
  const { t } = useTranslation();
  const { reportes, obtenerExtras } = useReportesDemo();

  /**
   * Sale del estado compartido, no de los mocks: así el reporte que el ciudadano acaba de enviar
   * aparece aquí, y los avances del gestor se ven sin recargar. Lo más reciente va primero.
   */
  const misReportes = useMemo(
    () =>
      [...reportes]
        .sort((uno, otro) => new Date(otro.creadoEn).getTime() - new Date(uno.creadoEn).getTime())
        .map((detalle) => aReporteLegado(detalle, t, obtenerExtras(detalle.codigo))),
    [reportes, obtenerExtras, t],
  );

  const stats = [
    {
      value: misReportes.length,
      label: t('myReports.total'),
      icon: FileText,
      color: 'text-ungrd-600',
    },
    {
      value: misReportes.filter((r) => r.status !== 'Cerrado').length,
      label: t('myReports.active'),
      icon: Clock,
      // gold-800 y no gold-700: sobre blanco el 700 se queda en 3,3:1 y no pasa AA.
      color: 'text-gold-800',
    },
    {
      value: misReportes.filter((r) => r.satelliteVerified).length,
      label: t('myReports.verified'),
      icon: Satellite,
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <EncabezadoPantalla
        titulo={t('myReports.title')}
        descripcion={t('myReports.subtitle')}
        accion={
          <Link to="/reportar" className="btn-primary btn-lg">
            <Plus className="h-5 w-5" aria-hidden="true" />
            {t('myReports.newReport')}
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ value, label, icon: Icon, color }) => (
          <div key={label} className="card p-4 text-center">
            <Icon className={`mx-auto mb-1.5 h-6 w-6 ${color}`} aria-hidden="true" />
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-slate-600">{label}</p>
          </div>
        ))}
      </div>

      {misReportes.length === 0 ? (
        <EstadoVacio
          icono={FileText}
          titulo={t('myReports.emptyTitle')}
          descripcion={t('myReports.emptyBody')}
          accion={
            <Link to="/reportar" className="btn-primary btn-lg">
              <Plus className="h-5 w-5" aria-hidden="true" />
              {t('myReports.newReport')}
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {misReportes.map((report) => (
            <Link
              key={report.id}
              to={`/reportes/${report.id}`}
              className="card-hover group flex items-center gap-4 p-4 min-h-toque"
            >
              <EmergencyIcon type={report.type} />

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-slate-600">{report.id}</span>
                  <span
                    className={`badge ${
                      report.reportType === 'testigo'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {report.reportType === 'testigo' ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <Home className="h-3.5 w-3.5" aria-hidden="true" />}
                    {report.reportType === 'testigo' ? t('myReports.witness') : t('myReports.affected')}
                  </span>
                  <TrustBadge level={report.trustLevel} />
                </div>
                <p className="truncate text-lg font-semibold text-slate-900 transition-colors group-hover:text-ungrd-700">
                  {report.title}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <StatusBadge status={report.status} />
                  <SeverityBadge severity={report.prioridad} />
                  <span className="flex items-center gap-1 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="max-w-[160px] truncate">{report.location}</span>
                  </span>
                </div>
              </div>

              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-sm text-slate-500">{formatDate(report.createdAt)}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {t('myReports.updates', { count: report.timeline.length })}
                </p>
              </div>

              <ChevronRight className="h-6 w-6 shrink-0 text-slate-400 transition-colors group-hover:text-ungrd-600" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
