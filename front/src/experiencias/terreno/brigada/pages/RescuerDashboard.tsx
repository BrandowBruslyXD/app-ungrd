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
import EstadoVacio from '@/experiencias/terreno/comunes/EstadoVacio';

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
    { key: 'visitsToday', value: stats.totalVisitsToday, icon: Home, color: 'bg-blue-50 text-blue-700' },
    { key: 'families', value: stats.totalFamilies, icon: Users, color: 'bg-emerald-50 text-emerald-700' },
    { key: 'persons', value: stats.totalPersons, icon: ClipboardCheck, color: 'bg-ungrd-50 text-ungrd-700' },
    { key: 'pendingSync', value: stats.pendingSync, icon: CloudOff, color: 'bg-amber-50 text-amber-700' },
  ] as const;

  const resumen = [
    { label: t('rescuer.injured'), value: injuredCount, borde: 'border-l-red-500', color: 'text-red-700' },
    { label: t('rescuer.vulnerable'), value: vulnerableCount, borde: 'border-l-orange-500', color: 'text-orange-700' },
    { label: t('rescuer.activeOps'), value: activeOps.length, borde: 'border-l-ungrd-500', color: 'text-ungrd-700' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-2xl bg-gradient-to-r from-ungrd-600 to-ungrd-700 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-500/20">
              <Shield className="h-6 w-6 text-gold-400" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">{mockRescuer.name}</h1>
              <p className="mt-0.5 text-base text-ungrd-100">{mockRescuer.entity}</p>
              <div className="mt-1.5 flex flex-col gap-1 text-sm text-ungrd-100 sm:flex-row sm:gap-4">
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-gold-400" aria-hidden="true" />
                  <span className="truncate">{mockRescuer.cmgrdAccreditation}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {mockRescuer.assignedZone}, {mockRescuer.assignedMunicipio}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/brigada/censo')}
            className="btn-accent btn-lg shrink-0"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            {t('rescuer.newCensus')}
          </button>
        </div>
      </section>

      {activeDeclaration && (
        <div className="flex items-start gap-3 rounded-xl border border-gold-300 bg-gold-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold-800" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-base font-semibold text-gold-900">
              {t('rescuer.calamityActive', { municipio: activeDeclaration.municipio })}
            </p>
            {/* gold-800 y no gold-700: la vigencia del decreto se lee al sol y tiene que pasar AA. */}
            <p className="mt-0.5 text-base text-gold-800">
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

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.key} className="card p-4">
            <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${s.color}`}>
              <s.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-600">{t(`rescuer.stats.${s.key}`)}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-3 gap-3">
        {resumen.map(({ label, value, borde, color }) => (
          <div key={label} className={`card border-l-4 p-4 ${borde}`}>
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className={`mt-0.5 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <h2 className="text-xl font-semibold text-slate-900">{t('rescuer.operations')}</h2>
          <div className="flex rounded-xl bg-slate-100 p-1">
            {(['activas', 'cerradas'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                aria-pressed={activeTab === tab}
                className={`rounded-lg px-4 text-sm font-semibold transition-colors min-h-toque ${
                  activeTab === tab ? 'bg-white text-ungrd-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'activas'
                  ? t('rescuer.tabActive', { count: activeOps.length })
                  : t('rescuer.tabClosed', { count: closedOps.length })}
              </button>
            ))}
          </div>
        </div>

        {displayOps.length === 0 ? (
          <p className="px-5 py-10 text-center text-base text-slate-600">
            {activeTab === 'activas' ? t('rescuer.emptyActive') : t('rescuer.emptyClosed')}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {displayOps.map((op) => {
              const opVisits = mockHousingVisits.filter((v) => v.operationId === op.id);
              const opFamilies = mockFamilies.filter((f) => opVisits.some((v) => v.id === f.housingVisitId));
              const opPersonCount = mockPersons.filter((p) => opFamilies.some((f) => f.id === p.familyId)).length;

              return (
                <li key={op.id} className="flex items-start gap-3 px-4 py-4 sm:gap-4 sm:px-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ungrd-50 text-ungrd-600">
                    <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-base font-semibold text-slate-900">{op.id}</p>
                      <span className={`badge ${
                        op.status === 'en_curso' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {op.status === 'en_curso' ? t('rescuer.statusInProgress') : t('rescuer.statusClosed')}
                      </span>
                    </div>
                    <p className="mt-0.5 text-base text-slate-700">
                      {t('rescuer.opLine', {
                        evento: t(`census.eventTypes.${op.eventType}`),
                        zona: op.zoneName,
                        municipio: op.municipio,
                      })}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {new Date(op.eventDate).toLocaleDateString('es-CO')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {t('rescuer.visitCount', { count: opVisits.length })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {t('rescuer.familyPersonCount', { families: opFamilies.length, persons: opPersonCount })}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <h2 className="text-xl font-semibold text-slate-900">{t('rescuer.recentTitle')}</h2>
        </div>
        {mockHousingVisits.length === 0 ? (
          <div className="p-4">
            <EstadoVacio
              icono={Home}
              titulo={t('rescuer.emptyRecentTitle')}
              descripcion={t('rescuer.emptyRecentBody')}
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {mockHousingVisits.map((visit) => {
              const visitFamilies = mockFamilies.filter((f) => f.housingVisitId === visit.id);
              const visitPersons = mockPersons.filter((p) => visitFamilies.some((f) => f.id === p.familyId));
              return (
                <li key={visit.id} className="px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-base font-semibold text-slate-900">{visit.address}</p>
                    <span className={`badge shrink-0 ${
                      visit.damageAggregate === 'destruida' ? 'bg-red-100 text-red-800'
                        : visit.damageAggregate === 'averiada' ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {t(`census.damageAggregate.${visit.damageAggregate}`)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {t('rescuer.recentMeta', {
                      families: visitFamilies.length,
                      persons: visitPersons.length,
                      time: new Date(visit.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                    })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
