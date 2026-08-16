import { useState } from 'react';
import { Link } from 'react-router-dom';
import Foto from '@/components/ui/Foto';
import { FOTOS } from '@/lib/fotos';
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
} from '@/mocks/mockSocorro';
import type { Habitability } from '@/types/edan';

const habitabilityColors: Record<Habitability, { bg: string; text: string; ring: string }> = {
  habitable: { bg: 'bg-seguro-50', text: 'text-seguro-700', ring: 'ring-seguro-200' },
  uso_restringido: { bg: 'bg-espera-50', text: 'text-espera-700', ring: 'ring-espera-200' },
  no_habitable: { bg: 'bg-alerta-50', text: 'text-alerta-700', ring: 'ring-alerta-200' },
};

const statusColors = {
  en_atencion: 'bg-alerta-100 text-alerta-700',
  controlado: 'bg-espera-100 text-espera-700',
  cerrado: 'bg-seguro-100 text-seguro-700',
};

export default function SocorroDashboard() {
  const { t } = useTranslation();
  const [expandedIncident, setExpandedIncident] = useState<string | null>(mockIncidentLogs[0]?.id ?? null);
  const profile = mockSocorroProfile;
  const stats = mockSocorroStats;

  const statCards = [
    { key: 'incidentsToday', value: stats.incidentsToday, icon: Activity, color: 'text-azul-600' },
    { key: 'incidentsActive', value: stats.incidentsActive, icon: AlertTriangle, color: 'text-alerta-600' },
    { key: 'assessmentsToday', value: stats.assessmentsToday, icon: ClipboardList, color: 'text-seguro-600' },
    { key: 'personsEvacuated', value: stats.personsEvacuated, icon: Users, color: 'text-espera-600' },
    { key: 'notHabitable', value: stats.housingsNotHabitable, icon: Home, color: 'text-alerta-600' },
    { key: 'restricted', value: stats.housingsRestricted, icon: Home, color: 'text-espera-600' },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:py-10 animate-fade-in">
      <div className="sobre-oscuro relative isolate mb-6 overflow-hidden rounded-ficha bg-azul-800 p-5 text-white">
        <div className="absolute inset-0 -z-10">
          <Foto fuente={FOTOS.rescateInundacion} alt="" proporcion="panoramica" className="h-full w-full [&>img]:h-full" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-azul-900/95 via-azul-800/85 to-azul-700/60" />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Flame className="h-7 w-7 text-oro-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-azul-200">{t(`socorro.entities.${profile.entity}`)}</p>
              <h1 className="text-xl font-bold">{profile.name}</h1>
              <p className="mt-0.5 text-xs text-azul-200">
                {t('socorro.badgeLine', {
                  badge: profile.badge,
                  municipio: profile.assignedMunicipio,
                  departamento: profile.assignedDepartamento,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-oro-400" aria-hidden="true" />
              {t('socorro.roleBadge')}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {statCards.map(({ key, value, icon: Icon, color }) => (
          <div key={key} className="ficha p-4">
            <Icon className={`h-5 w-5 ${color} mb-2`} aria-hidden="true" />
            <p className="text-2xl font-bold text-tinta-900">{value}</p>
            <p className="text-xs text-tinta-500 mt-0.5">{t(`socorro.stats.${key}`)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link
          to="/socorro/incidente"
          className="ficha ficha-pulsable p-5 flex items-center gap-4 border-2 border-dashed border-alerta-200 bg-alerta-50/50"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-alerta-100">
            <Plus className="h-6 w-6 text-alerta-600" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold text-tinta-900">{t('socorro.registerIncident')}</p>
            <p className="text-xs text-tinta-500 mt-0.5">{t('socorro.registerIncidentHint')}</p>
          </div>
        </Link>
        <Link
          to="/socorro/evaluacion"
          className="ficha ficha-pulsable p-5 flex items-center gap-4 border-2 border-dashed border-azul-200 bg-azul-50/50"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-azul-100">
            <Home className="h-6 w-6 text-azul-600" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold text-tinta-900">{t('socorro.evaluateHousing')}</p>
            <p className="text-xs text-tinta-500 mt-0.5">{t('socorro.evaluateHousingHint')}</p>
          </div>
        </Link>
      </div>

      <h2 className="text-lg font-bold text-tinta-900 mb-3">{t('socorro.incidentsTitle')}</h2>
      <div className="space-y-3 mb-8">
        {mockIncidentLogs.map((inc) => {
          const isExpanded = expandedIncident === inc.id;
          const relatedAssessments = mockHabitabilityAssessments.filter(
            (a) => a.incidentLogId === inc.id,
          );
          return (
            <div key={inc.id} className="ficha overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedIncident(isExpanded ? null : inc.id)}
                aria-expanded={isExpanded}
                aria-label={isExpanded
                  ? t('socorro.a11y.collapseIncident', { id: inc.id })
                  : t('socorro.a11y.expandIncident', { id: inc.id })}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-tinta-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-azul-100">
                    <Activity className="h-5 w-5 text-azul-600" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-tinta-900 text-sm">{inc.id}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[inc.status]}`}>
                        {t(`socorro.status.${inc.status}`)}
                      </span>
                    </div>
                    <p className="text-xs text-tinta-500 mt-0.5 truncate">
                      {t(`census.eventTypes.${inc.eventType}`)} -- {inc.location}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-tinta-400 shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-tinta-400 shrink-0" aria-hidden="true" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-tinta-100 bg-tinta-50/50 p-4 animate-fade-in">
                  <p className="text-sm text-tinta-700 leading-relaxed">{inc.description}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg bg-white p-3 text-center">
                      <p className="text-lg font-bold text-alerta-600">{inc.personsInjured}</p>
                      <p className="text-xs text-tinta-500">{t('socorro.injured')}</p>
                    </div>
                    <div className="rounded-lg bg-white p-3 text-center">
                      <p className="text-lg font-bold text-tinta-900">{inc.personsDead}</p>
                      <p className="text-xs text-tinta-500">{t('socorro.dead')}</p>
                    </div>
                    <div className="rounded-lg bg-white p-3 text-center">
                      <p className="text-lg font-bold text-espera-600">{inc.personsMissing}</p>
                      <p className="text-xs text-tinta-500">{t('socorro.missing')}</p>
                    </div>
                    <div className="rounded-lg bg-white p-3 text-center">
                      <p className="text-lg font-bold text-azul-600">{inc.personsEvacuated}</p>
                      <p className="text-xs text-tinta-500">{t('socorro.evacuated')}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-tinta-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />{inc.municipio}, {inc.departamento}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />{new Date(inc.createdAt).toLocaleDateString('es-CO')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" aria-hidden="true" />{t('socorro.familiesCount', { count: inc.familiesAffected })}
                    </span>
                    {inc.linkedReportId && (
                      <span className="flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3" aria-hidden="true" />{t('socorro.linkedTo', { id: inc.linkedReportId })}
                      </span>
                    )}
                  </div>

                  {relatedAssessments.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-tinta-600 mb-2">
                        {t('socorro.assessmentsTitle', { count: relatedAssessments.length })}
                      </p>
                      <div className="space-y-2">
                        {relatedAssessments.map((a) => {
                          const hc = habitabilityColors[a.habitability];
                          return (
                            <div key={a.id} className="rounded-lg bg-white p-3 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-tinta-700 truncate">{a.address}</p>
                                <p className="text-xs text-tinta-500 mt-0.5 truncate">{a.notes}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${hc.bg} ${hc.text} ${hc.ring}`}>
                                  {t(`habitability.verdicts.${a.habitability}`)}
                                </span>
                                {a.evacuationNotificationIssued && (
                                  <span className="inline-flex items-center rounded-full bg-alerta-100 px-2 py-0.5 text-xs font-medium text-alerta-700 ring-1 ring-alerta-200">
                                    {t('socorro.evacuatedBadge')}
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
