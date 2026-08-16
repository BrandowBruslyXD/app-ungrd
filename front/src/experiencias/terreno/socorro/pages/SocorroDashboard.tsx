import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
} from '@/shared/mocks/mockSocorro';
import type { Habitability } from '@/shared/types/edan';
import EstadoVacio from '@/experiencias/terreno/comunes/EstadoVacio';

const habitabilityColors: Record<Habitability, string> = {
  habitable: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
  uso_restringido: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  no_habitable: 'bg-red-50 text-red-800 ring-1 ring-red-200',
};

const statusColors = {
  en_atencion: 'bg-red-100 text-red-800',
  controlado: 'bg-amber-100 text-amber-800',
  cerrado: 'bg-emerald-100 text-emerald-800',
};

export default function SocorroDashboard() {
  const { t } = useTranslation();
  const [expandedIncident, setExpandedIncident] = useState<string | null>(mockIncidentLogs[0]?.id ?? null);
  const profile = mockSocorroProfile;
  const stats = mockSocorroStats;

  const statCards = [
    { key: 'incidentsToday', value: stats.incidentsToday, icon: Activity, color: 'text-blue-700' },
    { key: 'incidentsActive', value: stats.incidentsActive, icon: AlertTriangle, color: 'text-red-700' },
    { key: 'assessmentsToday', value: stats.assessmentsToday, icon: ClipboardList, color: 'text-emerald-700' },
    { key: 'personsEvacuated', value: stats.personsEvacuated, icon: Users, color: 'text-amber-700' },
    { key: 'notHabitable', value: stats.housingsNotHabitable, icon: Home, color: 'text-red-700' },
    { key: 'restricted', value: stats.housingsRestricted, icon: Home, color: 'text-amber-700' },
  ] as const;

  const acciones = [
    {
      to: '/socorro/incidente',
      titulo: t('socorro.registerIncident'),
      pista: t('socorro.registerIncidentHint'),
      icono: Plus,
      estilo: 'border-red-300 bg-red-50/60',
      iconoEstilo: 'bg-red-100 text-red-700',
    },
    {
      to: '/socorro/evaluacion',
      titulo: t('socorro.evaluateHousing'),
      pista: t('socorro.evaluateHousingHint'),
      icono: Home,
      estilo: 'border-blue-300 bg-blue-50/60',
      iconoEstilo: 'bg-blue-100 text-blue-700',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-2xl bg-gradient-to-r from-ungrd-600 to-ungrd-700 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Flame className="h-7 w-7 text-gold-400" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-base text-ungrd-100">{t(`socorro.entities.${profile.entity}`)}</p>
              <h1 className="text-2xl font-bold">{profile.name}</h1>
              <p className="mt-0.5 text-sm text-ungrd-100">
                {t('socorro.badgeLine', {
                  badge: profile.badge,
                  municipio: profile.assignedMunicipio,
                  departamento: profile.assignedDepartamento,
                })}
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-gold-400" aria-hidden="true" />
            {t('socorro.roleBadge')}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map(({ key, value, icon: Icon, color }) => (
          <div key={key} className="card p-4">
            <Icon className={`mb-2 h-5 w-5 ${color}`} aria-hidden="true" />
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-0.5 text-sm text-slate-600">{t(`socorro.stats.${key}`)}</p>
          </div>
        ))}
      </section>

      {/* Una columna en celular: a 390 px, dos tarjetas dejan 53 px de texto y el título se parte
          en cinco líneas. */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {acciones.map(({ to, titulo, pista, icono: Icono, estilo, iconoEstilo }) => (
          <Link
            key={to}
            to={to}
            className={`card card-hover flex items-center gap-4 border-2 border-dashed p-5 ${estilo} min-h-toque`}
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconoEstilo}`}>
              <Icono className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-semibold text-slate-900">{titulo}</span>
              <span className="mt-0.5 block text-base text-slate-600">{pista}</span>
            </span>
          </Link>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-slate-900">{t('socorro.incidentsTitle')}</h2>
        {mockIncidentLogs.length === 0 ? (
          <EstadoVacio
            icono={Activity}
            titulo={t('socorro.emptyIncidentsTitle')}
            descripcion={t('socorro.emptyIncidentsBody')}
            accion={
              <Link to="/socorro/incidente" className="btn-primary w-full sm:w-auto">
                <Plus className="h-5 w-5" aria-hidden="true" />
                {t('socorro.registerIncident')}
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {mockIncidentLogs.map((inc) => {
              const isExpanded = expandedIncident === inc.id;
              const relatedAssessments = mockHabitabilityAssessments.filter(
                (a) => a.incidentLogId === inc.id,
              );
              const conteos = [
                { label: t('socorro.injured'), value: inc.personsInjured, color: 'text-red-700' },
                { label: t('socorro.dead'), value: inc.personsDead, color: 'text-slate-900' },
                { label: t('socorro.missing'), value: inc.personsMissing, color: 'text-amber-700' },
                { label: t('socorro.evacuated'), value: inc.personsEvacuated, color: 'text-blue-700' },
              ];

              return (
                <div key={inc.id} className="card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedIncident(isExpanded ? null : inc.id)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded
                      ? t('socorro.a11y.collapseIncident', { id: inc.id })
                      : t('socorro.a11y.expandIncident', { id: inc.id })}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-50 min-h-toque"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ungrd-100">
                        <Activity className="h-6 w-6 text-ungrd-700" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-base font-semibold text-slate-900">{inc.id}</span>
                          <span className={`badge ${statusColors[inc.status]}`}>
                            {t(`socorro.status.${inc.status}`)}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-base text-slate-700">
                          {t('socorro.incidentLine', {
                            evento: t(`census.eventTypes.${inc.eventType}`),
                            lugar: inc.location,
                          })}
                        </span>
                      </span>
                    </span>
                    {isExpanded
                      ? <ChevronUp className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
                      : <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />}
                  </button>

                  {isExpanded && (
                    <div className="animate-fade-in border-t border-slate-100 bg-slate-50/60 p-4">
                      <p className="text-base leading-relaxed text-slate-800">{inc.description}</p>

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {conteos.map(({ label, value, color }) => (
                          <div key={label} className="rounded-lg bg-white p-3 text-center">
                            <p className={`text-xl font-bold ${color}`}>{value}</p>
                            <p className="text-sm text-slate-600">{label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {inc.municipio}, {inc.departamento}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {new Date(inc.createdAt).toLocaleDateString('es-CO')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {t('socorro.familiesCount', { count: inc.familiesAffected })}
                        </span>
                        {inc.linkedReportId && (
                          <span className="flex items-center gap-1">
                            <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                            {t('socorro.linkedTo', { id: inc.linkedReportId })}
                          </span>
                        )}
                      </div>

                      {relatedAssessments.length > 0 && (
                        <div className="mt-4">
                          <h3 className="field-label">
                            {t('socorro.assessmentsTitle', { count: relatedAssessments.length })}
                          </h3>
                          <ul className="space-y-2">
                            {relatedAssessments.map((a) => (
                              <li key={a.id} className="flex flex-col gap-2 rounded-lg bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-base font-semibold text-slate-900">{a.address}</p>
                                  <p className="mt-0.5 text-base text-slate-700">{a.notes}</p>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                  <span className={`badge ${habitabilityColors[a.habitability]}`}>
                                    {t(`habitability.verdicts.${a.habitability}`)}
                                  </span>
                                  {a.evacuationNotificationIssued && (
                                    <span className="badge bg-red-100 text-red-800 ring-1 ring-red-200">
                                      {t('socorro.evacuatedBadge')}
                                    </span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
