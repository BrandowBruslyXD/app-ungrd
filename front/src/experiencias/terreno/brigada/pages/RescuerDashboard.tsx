import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ClipboardCheck,
  Plus,
  MapPin,
  Users,
  Home,
  CloudOff,
  AlertTriangle,
  ChevronRight,
  Shield,
  Clock,
  BadgeCheck,
} from 'lucide-react';
import {
  mockRescuer,
  mockOperations,
  mockHousingVisits,
  mockFamilies,
  mockPersons,
  mockRescuerStats,
  mockCalamityDeclarations,
} from '@/shared/mocks/mockEdan';

export default function RescuerDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'activas' | 'cerradas'>('activas');

  const activeOps = mockOperations.filter((o) => o.status === 'en_curso');
  const closedOps = mockOperations.filter((o) => o.status === 'cerrada');
  const displayOps = activeTab === 'activas' ? activeOps : closedOps;

  const activeDeclaration = mockCalamityDeclarations.find(
    (d) => d.municipio === mockRescuer.assignedMunicipio && d.active
  );

  const stats = mockRescuerStats;
  const injuredCount = mockPersons.filter((p) => p.condicionSalud === 'herido').length;
  const vulnerableCount = mockPersons.filter(
    (p) => p.isPregnant || p.isLactating || p.isMinorUnaccompanied || p.discapacidad !== 'ninguna'
  ).length;

  const statCards = [
    { key: 'visitsToday', value: stats.totalVisitsToday, icon: Home, color: 'bg-blue-50 text-blue-600' },
    { key: 'families', value: stats.totalFamilies, icon: Users, color: 'bg-emerald-50 text-emerald-600' },
    { key: 'persons', value: stats.totalPersons, icon: ClipboardCheck, color: 'bg-ungrd-50 text-ungrd-600' },
    { key: 'pendingSync', value: stats.pendingSync, icon: CloudOff, color: 'bg-amber-50 text-amber-600' },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 animate-fade-in">
      <div className="mb-5 rounded-2xl border border-ungrd-200 bg-gradient-to-r from-ungrd-600 to-ungrd-700 p-4 text-white shadow-md sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/20 sm:h-12 sm:w-12">
              <Shield className="h-5 w-5 text-gold-400 sm:h-6 sm:w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate sm:text-xl">{mockRescuer.name}</h1>
              <p className="mt-0.5 text-sm text-ungrd-200">{mockRescuer.entity}</p>
              <div className="mt-1 flex flex-col gap-1 text-xs text-ungrd-100 sm:flex-row sm:gap-3">
                <span className="flex items-center gap-1">
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-gold-400" aria-hidden="true" />
                  <span className="truncate">{mockRescuer.cmgrdAccreditation}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {mockRescuer.assignedZone}, {mockRescuer.assignedMunicipio}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/rescatista/censo')}
            className="btn-accent shrink-0"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            {t('rescuer.newCensus')}
          </button>
        </div>
      </div>

      {activeDeclaration && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-gold-300 bg-gold-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gold-800">
              {t('rescuer.calamityActive', { municipio: activeDeclaration.municipio })}
            </p>
            <p className="mt-0.5 text-xs text-gold-700 truncate">
              {t('rescuer.calamityUntil', {
                decreto: activeDeclaration.decretoNumber,
                date: new Date(activeDeclaration.expiryDate).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }),
              })}
            </p>
          </div>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {statCards.map((s) => (
          <div key={s.key} className="card p-3 sm:p-4">
            <div className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${s.color}`}>
              <s.icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-xl font-bold text-slate-900 sm:text-2xl">{s.value}</p>
            <p className="text-[11px] text-slate-500 sm:text-xs">{t(`rescuer.stats.${s.key}`)}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="card border-l-4 border-l-red-400 p-3 sm:p-4">
          <p className="text-[11px] font-medium text-red-600 sm:text-xs">{t('rescuer.injured')}</p>
          <p className="mt-0.5 text-xl font-bold text-red-700">{injuredCount}</p>
        </div>
        <div className="card border-l-4 border-l-orange-400 p-3 sm:p-4">
          <p className="text-[11px] font-medium text-orange-600 sm:text-xs">{t('rescuer.vulnerable')}</p>
          <p className="mt-0.5 text-xl font-bold text-orange-700">{vulnerableCount}</p>
        </div>
        <div className="card border-l-4 border-l-ungrd-400 p-3 sm:p-4">
          <p className="text-[11px] font-medium text-ungrd-600 sm:text-xs">{t('rescuer.activeOps')}</p>
          <p className="mt-0.5 text-xl font-bold text-ungrd-700">{activeOps.length}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">{t('rescuer.operations')}</h2>
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            {(['activas', 'cerradas'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab ? 'bg-white text-ungrd-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'activas'
                  ? t('rescuer.tabActive', { count: activeOps.length })
                  : t('rescuer.tabClosed', { count: closedOps.length })}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {displayOps.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              {activeTab === 'activas' ? t('rescuer.emptyActive') : t('rescuer.emptyClosed')}
            </div>
          ) : (
            displayOps.map((op) => {
              const opVisits = mockHousingVisits.filter((v) => v.operationId === op.id);
              const opFamilyCount = mockFamilies.filter((f) => opVisits.some((v) => v.id === f.housingVisitId)).length;
              const opPersonCount = mockPersons.filter((p) =>
                mockFamilies.filter((f) => opVisits.some((v) => v.id === f.housingVisitId)).some((f) => f.id === p.familyId)
              ).length;

              return (
                <div key={op.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors sm:gap-4 sm:px-5 sm:py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ungrd-50 text-ungrd-600 sm:h-10 sm:w-10">
                    <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900">{op.id}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        op.status === 'en_curso' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {op.status === 'en_curso' ? t('rescuer.statusInProgress') : t('rescuer.statusClosed')}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 truncate">
                      {t(`census.eventTypes.${op.eventType}`)} -- {op.zoneName}, {op.municipio}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {new Date(op.eventDate).toLocaleDateString('es-CO')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Home className="h-3 w-3" aria-hidden="true" />
                        {t('rescuer.visitCount', { count: opVisits.length })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" aria-hidden="true" />
                        {t('rescuer.familyPersonCount', { families: opFamilyCount, persons: opPersonCount })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-5 card">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">{t('rescuer.recentTitle')}</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {mockHousingVisits.map((visit) => {
            const visitFamilies = mockFamilies.filter((f) => f.housingVisitId === visit.id);
            const visitPersons = mockPersons.filter((p) => visitFamilies.some((f) => f.id === p.familyId));
            return (
              <div key={visit.id} className="px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800 truncate">{visit.address}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    visit.damageAggregate === 'destruida' ? 'bg-red-100 text-red-700'
                      : visit.damageAggregate === 'averiada' ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                  }`}>
                    {t(`census.damageAggregate.${visit.damageAggregate}`)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {t('rescuer.recentMeta', {
                    families: visitFamilies.length,
                    persons: visitPersons.length,
                    time: new Date(visit.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                  })}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
