import { useState } from 'react';
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
import { mockReports } from '@/data/mock';
import { StatusBadge, SeverityBadge } from '@/components/shared/StatusBadge';
import EmergencyIcon from '@/components/shared/EmergencyIcon';
import TrustBadge from '@/components/shared/TrustBadge';
import type { ReportStatus } from '@/types';

const columns: { status: ReportStatus; label: string; color: string }[] = [
  { status: 'recibido', label: 'Nuevos', color: 'border-t-slate-400' },
  { status: 'verificando', label: 'En verificación', color: 'border-t-ungrd-400' },
  { status: 'confirmado', label: 'Confirmados', color: 'border-t-amber-400' },
  { status: 'en_atencion', label: 'En atención', color: 'border-t-blue-400' },
  { status: 'resuelto', label: 'Resueltos', color: 'border-t-emerald-400' },
];

const statCards = [
  { label: 'Reportes', value: '1,247', icon: TrendingUp, color: 'text-ungrd-600 bg-ungrd-50' },
  { label: 'Activas', value: '23', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  { label: 'Resueltos hoy', value: '8', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  { label: 'Tiempo prom.', value: '2h 14m', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  { label: 'Por verificar', value: '15', icon: Satellite, color: 'text-gold-700 bg-gold-50' },
  { label: 'Recursos', value: '47', icon: Truck, color: 'text-slate-600 bg-slate-100' },
];

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return '<1h';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function MobileTriageSection({ status, label, color }: { status: ReportStatus; label: string; color: string }) {
  const [open, setOpen] = useState(status === 'recibido');
  const reports = mockReports.filter((r) => r.status === status);

  return (
    <div className={`card border-l-4 ${color.replace('border-t-', 'border-l-')} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          <span className="badge bg-slate-100 text-slate-500">{reports.length}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && reports.length > 0 && (
        <div className="border-t border-slate-100 p-2 space-y-2">
          {reports.map((report) => (
            <div key={report.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <EmergencyIcon type={report.type} size="sm" />
                <SeverityBadge severity={report.severity} />
                <TrustBadge level={report.trustLevel} />
              </div>
              <p className="text-xs font-semibold text-slate-800 line-clamp-2">{report.title}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="h-3 w-3 shrink-0" />
                {formatTimeAgo(report.createdAt)}
                {report.satelliteVerified && <Satellite className="h-3 w-3 ml-1 text-emerald-500" />}
              </p>
            </div>
          ))}
        </div>
      )}
      {open && reports.length === 0 && (
        <div className="border-t border-slate-100 p-4 text-center text-xs text-slate-300">
          Sin reportes
        </div>
      )}
    </div>
  );
}

export default function ManagerDashboard() {
  return (
    <div className="animate-fade-in">
      {/* Top bar */}
      <div className="border-b border-slate-200 bg-white px-4 py-4 lg:px-8 lg:py-5">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-800 truncate lg:text-2xl">
                Panel de Emergencias
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                Triage para gestores y autoridades
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 shrink-0 sm:px-3 sm:py-1.5 sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              En línea
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8 lg:py-6">
        {/* Stats */}
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

        {/* Map + Triage */}
        <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          {/* Map */}
          <div className="lg:col-span-1">
            <h2 className="mb-2 text-sm font-bold text-slate-800 sm:mb-3 sm:text-base">Mapa operativo</h2>
            <div className="card overflow-hidden">
              <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 sm:h-80">
                <div className="text-center">
                  <MapPin className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-xs text-slate-400">Reportes, satélite, recursos</p>
                </div>
                <div className="absolute left-[25%] top-[35%] h-3 w-3 rounded-full bg-red-500 ring-4 ring-red-500/20 animate-pulse" />
                <div className="absolute left-[60%] top-[20%] h-3 w-3 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
                <div className="absolute left-[75%] top-[55%] h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                <div className="absolute left-[40%] top-[70%] h-3 w-3 rounded-full bg-orange-500 ring-4 ring-orange-500/20 animate-pulse" />
              </div>
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 sm:p-3">
                <div className="flex flex-wrap gap-2 text-[11px] sm:gap-3 sm:text-xs">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Crítico</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Alto</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Medio</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Resuelto</span>
                </div>
              </div>
            </div>
          </div>

          {/* Triage - accordion on mobile, kanban on desktop */}
          <div className="lg:col-span-2">
            <h2 className="mb-2 text-sm font-bold text-slate-800 sm:mb-3 sm:text-base">Tablero de triage</h2>

            {/* Mobile: accordion */}
            <div className="space-y-2 lg:hidden">
              {columns.map(({ status, label, color }) => (
                <MobileTriageSection key={status} status={status} label={label} color={color} />
              ))}
            </div>

            {/* Desktop: kanban */}
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
                          <div key={report.id} className="rounded-xl border border-slate-200 bg-white p-3 hover:shadow-sm transition-shadow cursor-pointer">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <EmergencyIcon type={report.type} size="sm" />
                              <SeverityBadge severity={report.severity} />
                              <TrustBadge level={report.trustLevel} />
                            </div>
                            <p className="text-xs font-semibold text-slate-800 line-clamp-2">{report.title}</p>
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(report.createdAt)}
                              {report.satelliteVerified && <Satellite className="h-3 w-3 ml-1 text-emerald-500" />}
                            </p>
                          </div>
                        ))}
                        {reports.length === 0 && (
                          <div className="flex items-center justify-center h-20 text-xs text-slate-300">Sin reportes</div>
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
