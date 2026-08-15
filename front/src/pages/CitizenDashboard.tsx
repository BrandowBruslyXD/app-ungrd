import { Link } from 'react-router-dom';
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
import { mockReports, mockAlerts } from '@/data/mock';
import { SeverityBadge, StatusBadge } from '@/components/shared/StatusBadge';
import EmergencyIcon from '@/components/shared/EmergencyIcon';

const quickActions = [
  {
    to: '/reportar',
    label: 'Reportar emergencia',
    description: 'Foto, ubicación y descripción',
    icon: AlertTriangle,
    color: 'bg-red-500 shadow-red-200',
  },
  {
    to: '/mis-reportes',
    label: 'Mis reportes',
    description: 'Seguimiento de tus reportes',
    icon: FileText,
    color: 'bg-ungrd-600 shadow-ungrd-200',
  },
  {
    to: '/ayudas',
    label: 'Ayudas disponibles',
    description: 'Subsidios, trámites y documentos',
    icon: HandHeart,
    color: 'bg-emerald-500 shadow-emerald-200',
  },
  {
    to: '/alertas',
    label: 'Alertas activas',
    description: `${mockAlerts.filter((a) => a.active).length} alertas en tu zona`,
    icon: Bell,
    color: 'bg-gold-500 shadow-gold-200 text-ungrd-900',
  },
];

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Hace menos de 1h';
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function CitizenDashboard() {
  const activeReports = mockReports.filter((r) => r.status !== 'resuelto');

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ungrd-800 via-ungrd-900 to-ungrd-950 px-4 py-10 lg:px-8 lg:py-16">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-gold-400 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-gold-500 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-gold-400 mb-3">
            <Satellite className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider">Monitoreo activo satelital</span>
          </div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            Tu comunidad, protegida.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ungrd-200 leading-relaxed sm:text-base lg:text-lg">
            Reporta emergencias, recibe ayuda y haz seguimiento en tiempo real.
          </p>
          <div className="mt-4 flex flex-col gap-2 text-sm text-ungrd-300 sm:flex-row sm:gap-4">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 shrink-0 text-gold-400" />
              {mockReports.length} reportes activos
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 shrink-0 text-gold-400" />
              Respuesta: 2h 14min
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Quick Actions */}
        <section className="-mt-8 relative z-10 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
          {quickActions.map(({ to, label, description, icon: Icon, color }) => (
            <Link
              key={to}
              to={to}
              className="card-hover group flex flex-col gap-2.5 p-3 sm:p-4 lg:p-5"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg sm:h-11 sm:w-11 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 group-hover:text-ungrd-600 transition-colors sm:text-sm leading-tight">
                  {label}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 hidden sm:block">{description}</p>
              </div>
            </Link>
          ))}
        </section>

        {/* Active Alerts Banner */}
        {mockAlerts.some((a) => a.severity === 'critica' && a.active) && (
          <Link
            to="/alertas"
            className="mt-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 transition-colors hover:bg-red-100 sm:mt-6 sm:p-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500 shadow-sm sm:h-10 sm:w-10">
              <AlertTriangle className="h-4 w-4 text-white sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-800">Alerta Crítica Activa</p>
              <p className="truncate text-xs text-red-600 sm:text-sm">
                {mockAlerts.find((a) => a.severity === 'critica')?.title}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-red-400" />
          </Link>
        )}

        {/* Map placeholder + nearby emergencies */}
        <section className="mt-6 grid gap-6 lg:grid-cols-5 sm:mt-8">
          <div className="lg:col-span-3">
            <h2 className="mb-3 text-base font-bold text-slate-800 sm:text-lg">Mapa de tu zona</h2>
            <div className="card overflow-hidden">
              <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-ungrd-50 to-slate-100 sm:h-64 lg:h-80">
                <div className="text-center">
                  <MapPin className="mx-auto h-8 w-8 text-ungrd-200 sm:h-10 sm:w-10" />
                  <p className="mt-2 text-xs text-slate-400 sm:text-sm">
                    Mapa interactivo con emergencias cercanas
                  </p>
                </div>
                <div className="absolute left-[30%] top-[40%] h-3 w-3 rounded-full bg-red-500 shadow-lg ring-4 ring-red-500/20 animate-pulse" />
                <div className="absolute left-[55%] top-[25%] h-3 w-3 rounded-full bg-orange-500 shadow-lg ring-4 ring-orange-500/20" />
                <div className="absolute left-[70%] top-[60%] h-3 w-3 rounded-full bg-gold-500 shadow-lg ring-4 ring-gold-500/20" />
                <div className="absolute left-[20%] top-[65%] h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-lg ring-4 ring-emerald-500/20" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-800 sm:text-lg">Emergencias cercanas</h2>
              <Link to="/mis-reportes" className="text-xs font-medium text-ungrd-600 hover:text-ungrd-700 sm:text-sm">
                Ver todas
              </Link>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {activeReports.map((report) => (
                <Link
                  key={report.id}
                  to={`/reporte/${report.id}`}
                  className="card-hover flex items-start gap-3 p-3 group sm:p-4"
                >
                  <EmergencyIcon type={report.type} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-ungrd-600 transition-colors truncate">
                      {report.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{report.location}</span>
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={report.status} />
                      <SeverityBadge severity={report.severity} />
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400 mt-0.5">
                    {formatTimeAgo(report.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Trust indicators */}
        <section className="mt-8 mb-10 grid grid-cols-3 gap-2 sm:gap-4 sm:mt-10 sm:mb-12">
          {[
            { value: '1,247', label: 'Reportes atendidos', color: 'text-ungrd-600' },
            { value: '94%', label: 'Verificados', color: 'text-emerald-600' },
            { value: '$2.1B', label: 'Gasto rastreado', color: 'text-gold-700' },
          ].map(({ value, label, color }) => (
            <div key={label} className="card p-3 text-center sm:p-4 lg:p-6">
              <p className={`text-lg font-bold ${color} sm:text-2xl lg:text-3xl`}>{value}</p>
              <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs lg:text-sm">{label}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
