import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Check,
  MapPin,
  LocateFixed,
  Users,
  AlertTriangle,
  Activity,
  Link2,
} from 'lucide-react';
import { EDAN_EVENT_TYPES } from '@/shared/types/edan';
import type { EdanEventType, IncidentStatus } from '@/shared/types/edan';
import { COLOMBIAN_DEPARTMENTS } from '@/shared/mocks/mockEdan';
import { INCIDENT_STEP_COUNT, useIncidentLog } from '@/experiencias/terreno/socorro/hooks/useIncidentLog';
import type { IncidentPersonCountKey } from '@/experiencias/terreno/socorro/hooks/useIncidentLog';
import PasosAsistente from '@/experiencias/terreno/comunes/PasosAsistente';
import PieAsistente from '@/experiencias/terreno/comunes/PieAsistente';
import Contador from '@/experiencias/terreno/comunes/Contador';

const STEP_NUMBERS = [1, 2, 3, 4] as const;

const STATUS_OPTIONS: readonly IncidentStatus[] = ['en_atencion', 'controlado', 'cerrado'];

const STATUS_COLORS: Record<IncidentStatus, string> = {
  en_atencion: 'border-red-500 bg-red-50 text-red-800',
  controlado: 'border-amber-500 bg-amber-50 text-amber-900',
  cerrado: 'border-emerald-500 bg-emerald-50 text-emerald-800',
};

const COUNT_FIELDS: readonly { key: IncidentPersonCountKey; icon: typeof Activity; color: string }[] = [
  { key: 'personsInjured', icon: Activity, color: 'text-red-700' },
  { key: 'personsDead', icon: AlertTriangle, color: 'text-slate-900' },
  { key: 'personsMissing', icon: Users, color: 'text-amber-700' },
  { key: 'personsEvacuated', icon: Users, color: 'text-blue-700' },
];

const COUNT_LABEL_KEYS: Record<IncidentPersonCountKey, string> = {
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
      <div className="animate-scale-in py-12 text-center" aria-live="polite">
        <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-10 w-10 text-emerald-700" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold text-slate-900">{t('incident.successTitle')}</h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-slate-600">{t('incident.successText')}</p>
        <div className="card mx-auto mt-6 max-w-sm p-5">
          <p className="text-base text-slate-600">{t('incident.incidentNumber')}</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-ungrd-700">{resultId}</p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => navigate('/socorro/evaluacion')}
            className="btn-primary btn-lg"
          >
            {t('incident.evaluateHousings')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/socorro')}
            className="btn-secondary w-full sm:w-auto"
          >
            {t('incident.backToPanel')}
          </button>
        </div>
      </div>
    );
  }

  const pasos = STEP_NUMBERS.map((number) => ({
    clave: String(number),
    etiqueta: t(`incident.steps.${number}`),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('incident.title')}</h1>
        <p className="mt-1 text-base text-slate-600">{t('incident.subtitle')}</p>
      </div>

      <PasosAsistente pasos={pasos} actual={step} />

      {step === 1 && (
        <div className="animate-slide-up space-y-5">
          <div>
            <label htmlFor="incident-event-type" className="field-label">
              {t('incident.eventType')}
            </label>
            <select
              id="incident-event-type"
              value={form.eventType}
              onChange={(e) => update({ eventType: e.target.value as EdanEventType })}
              className="select-field"
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
            <label htmlFor="incident-event-date" className="field-label">
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
            <label htmlFor="incident-linked-report" className="field-label">
              <Link2 className="mr-1 inline h-4 w-4" aria-hidden="true" />
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
            <p className="mt-1 text-base text-slate-600">{t('incident.linkedReportHint')}</p>
          </div>
          <div>
            <p className="field-label">{t('incident.statusLabel')}</p>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update({ status: value })}
                  aria-pressed={form.status === value}
                  className={`rounded-xl border-2 px-2 text-center text-base transition-all min-h-toque ${
                    form.status === value
                      ? `${STATUS_COLORS[value]} font-semibold`
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
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
        <div className="animate-slide-up space-y-5">
          {/* Una columna en celular: «Norte de Santander» no cabe en medio ancho de 390 px. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="incident-departamento" className="field-label">
                {t('incident.departamento')}
              </label>
              <select
                id="incident-departamento"
                value={form.departamento}
                onChange={(e) => update({ departamento: e.target.value, municipio: '' })}
                className="select-field"
              >
                <option value="">{t('incident.selectPlaceholder')}</option>
                {COLOMBIAN_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="incident-municipio" className="field-label">
                {t('incident.municipio')}
              </label>
              <select
                id="incident-municipio"
                value={form.municipio}
                onChange={(e) => update({ municipio: e.target.value })}
                className="select-field disabled:cursor-not-allowed disabled:bg-slate-100"
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
            <label htmlFor="incident-location" className="field-label">
              {t('incident.specificLocation')}
            </label>
            <button
              type="button"
              onClick={() => update({ useGps: !form.useGps, location: '' })}
              aria-pressed={form.useGps}
              className={`mb-3 flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                form.useGps ? 'border-ungrd-500 bg-ungrd-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <LocateFixed className={`h-6 w-6 shrink-0 ${form.useGps ? 'text-ungrd-700' : 'text-slate-500'}`} aria-hidden="true" />
              <span className={`text-base ${form.useGps ? 'font-semibold text-ungrd-800' : 'text-slate-700'}`}>
                {form.useGps ? t('incident.gpsOn') : t('incident.useGps')}
              </span>
            </button>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
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
        <div className="animate-slide-up space-y-5">
          <div>
            <label htmlFor="incident-description" className="field-label">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {COUNT_FIELDS.map(({ key, icon: Icon, color }) => {
              const label = t(COUNT_LABEL_KEYS[key]);
              return (
                <div key={key} className="card flex items-center justify-between gap-3 p-4">
                  <p className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-800">
                    <Icon className={`h-5 w-5 shrink-0 ${color}`} aria-hidden="true" />
                    {label}
                  </p>
                  <Contador
                    valor={form[key]}
                    onCambiar={(delta) => adjustCount(key, delta)}
                    enMinimo={form[key] <= 0}
                    etiquetaDisminuir={t('incident.a11y.decrease', { label })}
                    etiquetaAumentar={t('incident.a11y.increase', { label })}
                  />
                </div>
              );
            })}
          </div>

          <div className="card flex items-center justify-between gap-3 p-4">
            <p className="min-w-0 text-base font-semibold text-slate-800">{t('incident.familiesAffected')}</p>
            <Contador
              valor={form.familiesAffected}
              onCambiar={(delta) => adjustCount('familiesAffected', delta)}
              enMinimo={form.familiesAffected <= 0}
              etiquetaDisminuir={t('incident.a11y.decrease', { label: t('incident.familiesAffected') })}
              etiquetaAumentar={t('incident.a11y.increase', { label: t('incident.familiesAffected') })}
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="animate-slide-up space-y-4">
          <div className="card p-5">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">{t('incident.summaryTitle')}</h2>
            <dl className="space-y-2 text-base">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">{t('incident.summaryEvent')}</dt>
                <dd className="text-right font-medium text-slate-900">
                  {form.eventType ? t(`census.eventTypes.${form.eventType}`) : t('incident.emptyValue')}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">{t('incident.summaryDate')}</dt>
                <dd className="text-right font-medium text-slate-900">{form.eventDate}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">{t('incident.summaryLocation')}</dt>
                <dd className="text-right font-medium text-slate-900">{form.municipio}, {form.departamento}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">{t('incident.summaryAddress')}</dt>
                <dd className="max-w-[60%] text-right font-medium text-slate-900">
                  {form.location || t('incident.summaryGps')}
                </dd>
              </div>
              {form.linkedReportId && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">{t('incident.summaryLinked')}</dt>
                  <dd className="text-right font-mono font-medium text-ungrd-700">{form.linkedReportId}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t('incident.injured'), value: form.personsInjured, color: 'text-red-700' },
              { label: t('incident.dead'), value: form.personsDead, color: 'text-slate-900' },
              { label: t('incident.missing'), value: form.personsMissing, color: 'text-amber-700' },
              { label: t('incident.evacuated'), value: form.personsEvacuated, color: 'text-blue-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-3 text-center">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-sm text-slate-600">{label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-base leading-relaxed text-blue-900">
              <strong>{t('incident.trustLevel')}</strong> {t('incident.trustText')}{' '}
              <span className="badge mx-1 bg-blue-100 text-blue-800 ring-1 ring-blue-200">
                {t('incident.verifiedBadge')}
              </span>{' '}
              {t('incident.trustSuffix')}
            </p>
          </div>
        </div>
      )}

      <PieAsistente
        atras={{
          etiqueta: step > 1 ? t('incident.previous') : t('incident.cancel'),
          onClick: () => (step > 1 ? goPrev() : navigate('/socorro')),
        }}
      >
        {step < INCIDENT_STEP_COUNT ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed}
            className="btn-primary btn-lg"
          >
            {t('incident.next')}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={submit} className="btn-primary btn-lg">
            {t('incident.submit')}
            <Check className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </PieAsistente>
    </div>
  );
}
