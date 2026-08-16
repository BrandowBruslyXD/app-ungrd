import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  LocateFixed,
  Users,
  AlertTriangle,
  Activity,
  Link2,
} from 'lucide-react';
import { EDAN_EVENT_TYPES } from '@/types/edan';
import type { EdanEventType, IncidentStatus } from '@/types/edan';
import { COLOMBIAN_DEPARTMENTS } from '@/mocks/mockEdan';
import { INCIDENT_STEP_COUNT, useIncidentLog } from '@/hooks/useIncidentLog';
import type { IncidentCountKey } from '@/hooks/useIncidentLog';

const STEP_NUMBERS = [1, 2, 3, 4] as const;

const STATUS_OPTIONS: readonly IncidentStatus[] = ['en_atencion', 'controlado', 'cerrado'];

const STATUS_COLORS: Record<IncidentStatus, string> = {
  en_atencion: 'border-red-200 bg-red-50 text-red-700',
  controlado: 'border-amber-200 bg-amber-50 text-amber-700',
  cerrado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const COUNT_FIELDS: readonly { key: IncidentCountKey; icon: typeof Activity; color: string }[] = [
  { key: 'personsInjured', icon: Activity, color: 'text-red-600' },
  { key: 'personsDead', icon: AlertTriangle, color: 'text-slate-800' },
  { key: 'personsMissing', icon: Users, color: 'text-amber-600' },
  { key: 'personsEvacuated', icon: Users, color: 'text-blue-600' },
];

const COUNT_LABEL_KEYS: Record<Exclude<IncidentCountKey, 'familiesAffected'>, string> = {
  personsInjured: 'incident.injured',
  personsDead: 'incident.dead',
  personsMissing: 'incident.missing',
  personsEvacuated: 'incident.evacuated',
};

export default function IncidentLogWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    step,
    form,
    update,
    municipalities,
    canProceed,
    submitted,
    resultId,
    submit,
    adjustCount,
    goNext,
    goPrev,
  } = useIncidentLog();

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center animate-scale-in" aria-live="polite">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-10 w-10 text-emerald-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">{t('incident.successTitle')}</h1>
        <p className="mt-3 text-base text-slate-500 leading-relaxed">{t('incident.successText')}</p>
        <div className="mt-6 card p-5">
          <p className="text-sm text-slate-500">{t('incident.incidentNumber')}</p>
          <p className="mt-1 text-2xl font-bold text-ungrd-600 tracking-wide">{resultId}</p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => navigate('/socorro/evaluacion')} className="btn-primary">
            {t('incident.evaluateHousings')}
          </button>
          <button type="button" onClick={() => navigate('/socorro')} className="btn-secondary">
            {t('incident.backToPanel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:py-12 animate-fade-in">
      <h1 className="text-xl font-bold text-slate-800 lg:text-2xl mb-1">{t('incident.title')}</h1>
      <p className="text-sm text-slate-500 mb-6">{t('incident.subtitle')}</p>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEP_NUMBERS.map((number) => (
            <div key={number} className="flex items-center gap-2">
              <div
                aria-current={step === number ? 'step' : undefined}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  step === number
                    ? 'bg-ungrd-600 text-white shadow-sm'
                    : step > number
                      ? 'bg-gold-100 text-gold-700'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > number ? <Check className="h-4 w-4" aria-hidden="true" /> : number}
              </div>
              <span className={`hidden text-sm font-medium sm:block ${step === number ? 'text-slate-800' : 'text-slate-400'}`}>
                {t(`incident.steps.${number}`)}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-ungrd-600 transition-all duration-500"
            style={{ width: `${((step - 1) / (INCIDENT_STEP_COUNT - 1)) * 100}%` }}
          />
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4 animate-slide-up">
          <div>
            <label htmlFor="incident-event-type" className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('incident.eventType')}
            </label>
            <select
              id="incident-event-type"
              value={form.eventType}
              onChange={(e) => update({ eventType: e.target.value as EdanEventType })}
              className="input-field"
            >
              <option value="">{t('incident.selectPlaceholder')}</option>
              {EDAN_EVENT_TYPES.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {t(`census.eventTypes.${eventType}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="incident-event-date" className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('incident.eventDate')}
            </label>
            <input
              id="incident-event-date"
              type="date"
              value={form.eventDate}
              onChange={(e) => update({ eventDate: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="incident-linked-report" className="block text-sm font-medium text-slate-700 mb-1.5">
              <Link2 className="inline h-4 w-4 mr-1" aria-hidden="true" />
              {t('incident.linkedReport')}
            </label>
            <input
              id="incident-linked-report"
              type="text"
              value={form.linkedReportId}
              onChange={(e) => update({ linkedReportId: e.target.value })}
              placeholder={t('incident.linkedReportPlaceholder')}
              className="input-field"
            />
            <p className="mt-1 text-xs text-slate-400">{t('incident.linkedReportHint')}</p>
          </div>
          <div>
            <p className="block text-sm font-medium text-slate-700 mb-1.5">{t('incident.statusLabel')}</p>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update({ status: value })}
                  className={`rounded-xl border-2 p-3 text-center text-sm transition-all ${
                    form.status === value
                      ? `${STATUS_COLORS[value]} border-current font-semibold`
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t(`socorro.status.${value}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-slide-up">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="incident-departamento" className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('incident.departamento')}
              </label>
              <select
                id="incident-departamento"
                value={form.departamento}
                onChange={(e) => update({ departamento: e.target.value, municipio: '' })}
                className="input-field"
              >
                <option value="">{t('incident.selectPlaceholder')}</option>
                {COLOMBIAN_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="incident-municipio" className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('incident.municipio')}
              </label>
              <select
                id="incident-municipio"
                value={form.municipio}
                onChange={(e) => update({ municipio: e.target.value })}
                className="input-field"
                disabled={!form.departamento}
              >
                <option value="">{t('incident.selectPlaceholder')}</option>
                {municipalities.map((municipio) => (
                  <option key={municipio} value={municipio}>{municipio}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="incident-location" className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('incident.specificLocation')}
            </label>
            <button
              type="button"
              onClick={() => update({ useGps: !form.useGps, location: '' })}
              className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 transition-all mb-3 ${
                form.useGps ? 'border-ungrd-400 bg-ungrd-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <LocateFixed className={`h-5 w-5 ${form.useGps ? 'text-ungrd-600' : 'text-slate-400'}`} aria-hidden="true" />
              <span className={`text-sm ${form.useGps ? 'text-ungrd-700 font-medium' : 'text-slate-600'}`}>
                {form.useGps ? t('incident.gpsOn') : t('incident.useGps')}
              </span>
            </button>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" aria-hidden="true" />
              <input
                id="incident-location"
                type="text"
                value={form.location}
                onChange={(e) => update({ location: e.target.value, useGps: false })}
                placeholder={t('incident.locationPlaceholder')}
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 animate-slide-up">
          <div>
            <label htmlFor="incident-description" className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('incident.description')}
            </label>
            <textarea
              id="incident-description"
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder={t('incident.descriptionPlaceholder')}
              rows={4}
              className="textarea-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COUNT_FIELDS.map(({ key, icon: Icon, color }) => {
              const label = t(COUNT_LABEL_KEYS[key]);
              return (
                <div key={key} className="card p-3">
                  <Icon className={`h-4 w-4 ${color} mb-1`} aria-hidden="true" />
                  <p className="text-xs text-slate-500 mb-2">{label}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustCount(key, -1)}
                      aria-label={t('incident.a11y.decrease', { label })}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-slate-800">{form[key]}</span>
                    <button
                      type="button"
                      onClick={() => adjustCount(key, 1)}
                      aria-label={t('incident.a11y.increase', { label })}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card p-3">
            <p className="text-xs text-slate-500 mb-2">{t('incident.familiesAffected')}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustCount('familiesAffected', -1)}
                aria-label={t('incident.a11y.decrease', { label: t('incident.familiesAffected') })}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm"
              >
                -
              </button>
              <span className="w-8 text-center font-bold text-slate-800">{form.familiesAffected}</span>
              <button
                type="button"
                onClick={() => adjustCount('familiesAffected', 1)}
                aria-label={t('incident.a11y.increase', { label: t('incident.familiesAffected') })}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 animate-slide-up">
          <div className="card p-5">
            <h3 className="font-bold text-slate-800 mb-3">{t('incident.summaryTitle')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">{t('incident.summaryEvent')}</span>
                <span className="font-medium text-slate-700">
                  {form.eventType ? t(`census.eventTypes.${form.eventType}`) : t('incident.emptyValue')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('incident.summaryDate')}</span>
                <span className="font-medium text-slate-700">{form.eventDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('incident.summaryLocation')}</span>
                <span className="font-medium text-slate-700">{form.municipio}, {form.departamento}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('incident.summaryAddress')}</span>
                <span className="font-medium text-slate-700 text-right max-w-[60%]">
                  {form.location || t('incident.summaryGps')}
                </span>
              </div>
              {form.linkedReportId && (
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('incident.summaryLinked')}</span>
                  <span className="font-medium text-ungrd-600">{form.linkedReportId}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card p-3 text-center">
              <p className="text-lg font-bold text-red-600">{form.personsInjured}</p>
              <p className="text-xs text-slate-500">{t('incident.injured')}</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-lg font-bold text-slate-800">{form.personsDead}</p>
              <p className="text-xs text-slate-500">{t('incident.dead')}</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-lg font-bold text-amber-600">{form.personsMissing}</p>
              <p className="text-xs text-slate-500">{t('incident.missing')}</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-lg font-bold text-blue-600">{form.personsEvacuated}</p>
              <p className="text-xs text-slate-500">{t('incident.evacuated')}</p>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>{t('incident.trustLevel')}</strong> {t('incident.trustText')}{' '}
              <span className="inline-flex items-center mx-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                {t('incident.verifiedBadge')}
              </span>{' '}
              {t('incident.trustSuffix')}
            </p>
          </div>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => (step > 1 ? goPrev() : navigate('/socorro'))}
          className="btn-ghost gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {step > 1 ? t('incident.previous') : t('incident.cancel')}
        </button>

        {step < INCIDENT_STEP_COUNT ? (
          <button type="button" onClick={goNext} disabled={!canProceed} className="btn-primary">
            {t('incident.next')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={submit} className="btn-primary">
            {t('incident.submit')} <Check className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
