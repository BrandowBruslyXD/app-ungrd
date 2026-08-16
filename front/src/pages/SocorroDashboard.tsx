import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Home,
  AlertTriangle,
  Users,
  Activity,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Plus,
  ClipboardList,
  ShieldCheck,
  BadgeCheck,
} from 'lucide-react';
import {
  mockSocorroProfile,
  mockIncidentLogs,
  mockHabitabilityAssessments,
  mockSocorroStats,
} from '@/mocks/mockSocorro';
import { EVENT_TYPE_LABELS, HABITABILITY_LABELS, SOCORRO_ENTITY_LABELS } from '@/types/edan';
import type { Habitability } from '@/types/edan';

const habitabilityColors: Record<Habitability, { bg: string; text: string; ring: string }> = {
  habitable: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  uso_restringido: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  no_habitable: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' },
};

const statusLabels = {
  en_atencion: 'En atención',
  controlado: 'Controlado',
  cerrado: 'Cerrado',
};

const statusColors = {
  en_atencion: 'bg-red-100 text-red-700',
  controlado: 'bg-amber-100 text-amber-700',
  cerrado: 'bg-emerald-100 text-emerald-700',
};

export default function SocorroDashboard() {
  const [expandedIncident, setExpandedIncident] = useState<string | null>(mockIncidentLogs[0]?.id ?? null);
  const profile = mockSocorroProfile;
  const stats = mockSocorroStats;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:py-10 animate-fade-in">
      {/* Profile Card */}
      <div className="card p-5 mb-6 bg-gradient-to-r from-ungrd-600 to-ungrd-700 text-white border-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Flame className="h-7 w-7 text-gold-400" />
            </div>
            <div>
              <p className="text-sm text-ungrd-200">{SOCORRO_ENTITY_LABELS[profile.entity]}</p>
              <h1 className="text-xl font-bold">{profile.name}</h1>
              <p className="mt-0.5 text-xs text-ungrd-200">
                Placa: {profile.badge} -- {profile.assignedMunicipio}, {profile.assignedDepartamento}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-gold-400" />
              Organismo de Socorro
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Incidentes hoy', value: stats.incidentsToday, icon: Activity, color: 'text-blue-600' },
          { label: 'Incidentes activos', value: stats.incidentsActive, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Evaluaciones hoy', value: stats.assessmentsToday, icon: ClipboardList, color: 'text-emerald-600' },
          { label: 'Personas evacuadas', value: stats.personsEvacuated, icon: Users, color: 'text-amber-600' },
          { label: 'No habitables', value: stats.housingsNotHabitable, icon: Home, color: 'text-red-600' },
          { label: 'Uso restringido', value: stats.housingsRestricted, icon: Home, color: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <Icon className={`h-5 w-5 ${color} mb-2`} />
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link
          to="/socorro/incidente"
          className="card card-hover p-5 flex items-center gap-4 border-2 border-dashed border-red-200 bg-red-50/50"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <Plus className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="font-bold text-slate-800">Registrar incidente</p>
            <p className="text-xs text-slate-500 mt-0.5">Bitácora de atención</p>
          </div>
        </Link>
        <Link
          to="/socorro/evaluacion"
          className="card card-hover p-5 flex items-center gap-4 border-2 border-dashed border-blue-200 bg-blue-50/50"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <Home className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-slate-800">Evaluar vivienda</p>
            <p className="text-xs text-slate-500 mt-0.5">Habitabilidad y daño</p>
          </div>
        </Link>
      </div>

      {/* Incidents List */}
      <h2 className="text-lg font-bold text-slate-800 mb-3">Incidentes atendidos</h2>
      <div className="space-y-3 mb-8">
        {mockIncidentLogs.map((inc) => {
          const isExpanded = expandedIncident === inc.id;
          const relatedAssessments = mockHabitabilityAssessments.filter(
            (a) => a.incidentLogId === inc.id,
          );
          return (
            <div key={inc.id} className="card overflow-hidden">
              <button
                onClick={() => setExpandedIncident(isExpanded ? null : inc.id)}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ungrd-100">
                    <Activity className="h-5 w-5 text-ungrd-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">{inc.id}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[inc.status]}`}>
                        {statusLabels[inc.status]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {EVENT_TYPE_LABELS[inc.eventType]} -- {inc.location}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 animate-fade-in">
                  <p className="text-sm text-slate-700 leading-relaxed">{inc.description}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg bg-white p-3 text-center">
                      <p className="text-lg font-bold text-red-600">{inc.personsInjured}</p>
                      <p className="text-xs text-slate-500">Heridos</p>
                    </div>
                    <div className="rounded-lg bg-white p-3 text-center">
                      <p className="text-lg font-bold text-slate-800">{inc.personsDead}</p>
                      <p className="text-xs text-slate-500">Fallecidos</p>
                    </div>
                    <div className="rounded-lg bg-white p-3 text-center">
                      <p className="text-lg font-bold text-amber-600">{inc.personsMissing}</p>
                      <p className="text-xs text-slate-500">Desaparecidos</p>
                    </div>
                    <div className="rounded-lg bg-white p-3 text-center">
                      <p className="text-lg font-bold text-blue-600">{inc.personsEvacuated}</p>
                      <p className="text-xs text-slate-500">Evacuados</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{inc.municipio}, {inc.departamento}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />{new Date(inc.createdAt).toLocaleDateString('es-CO')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />{inc.familiesAffected} familias
                    </span>
                    {inc.linkedReportId && (
                      <span className="flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3" />Vinculado a {inc.linkedReportId}
                      </span>
                    )}
                  </div>

                  {/* Related assessments */}
                  {relatedAssessments.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-600 mb-2">
                        Evaluaciones de vivienda ({relatedAssessments.length})
                      </p>
                      <div className="space-y-2">
                        {relatedAssessments.map((a) => {
                          const hc = habitabilityColors[a.habitability];
                          return (
                            <div key={a.id} className="rounded-lg bg-white p-3 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">{a.address}</p>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{a.notes}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${hc.bg} ${hc.text} ${hc.ring}`}>
                                  {HABITABILITY_LABELS[a.habitability]}
                                </span>
                                {a.evacuationNotificationIssued && (
                                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
                                    Evacuada
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
