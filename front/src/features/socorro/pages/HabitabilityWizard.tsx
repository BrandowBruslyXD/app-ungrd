import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Home,
  AlertTriangle,
  ShieldAlert,
  FileWarning,
  Users,
} from 'lucide-react';
import type { Habitability, HousingDamageAggregate } from '@/types/edan';
import { HABITABILITY_STEP_COUNT, useHabitability } from '@/hooks/useHabitability';
import type { HabitabilityForm } from '@/hooks/useHabitability';

const STEP_NUMBERS = [1, 2, 3] as const;

const HOUSING_TYPE_KEYS: readonly Exclude<HabitabilityForm['housingType'], ''>[] = [
  'casa',
  'apartamento',
  'habitacion',
  'improvisada',
  'otro',
];

const VERDICTS: readonly {
  value: Habitability;
  color: string;
  iconColor: string;
}[] = [
  { value: 'habitable', color: 'border-seguro-300 bg-seguro-50 text-seguro-800', iconColor: 'bg-seguro-200 text-seguro-700' },
  { value: 'uso_restringido', color: 'border-espera-300 bg-espera-50 text-espera-800', iconColor: 'bg-espera-200 text-espera-700' },
  { value: 'no_habitable', color: 'border-alerta-300 bg-alerta-50 text-alerta-800', iconColor: 'bg-alerta-200 text-alerta-700' },
];

const DAMAGE_OPTIONS: readonly { value: HousingDamageAggregate; color: string }[] = [
  { value: 'sin_dano', color: 'border-seguro-200 bg-seguro-50 text-seguro-700' },
  { value: 'averiada', color: 'border-espera-200 bg-espera-50 text-espera-700' },
  { value: 'destruida', color: 'border-alerta-200 bg-alerta-50 text-alerta-700' },
];

const VERDICT_BADGE: Record<Habitability, string> = {
  habitable: 'bg-seguro-50 text-seguro-700 ring-seguro-200',
  uso_restringido: 'bg-espera-50 text-espera-700 ring-espera-200',
  no_habitable: 'bg-alerta-50 text-alerta-700 ring-alerta-200',
};

export default function HabitabilityWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    step,
    form,
    update,
    activeIncidents,
    canProceed,
    submitted,
    resultId,
    submit,
    reset,
    adjustOccupants,
    goNext,
    goPrev,
  } = useHabitability();

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center animate-scale-in" aria-live="polite">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-seguro-100">
          <Check className="h-10 w-10 text-seguro-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-tinta-900">{t('habitability.successTitle')}</h1>
        <p className="mt-3 text-base text-tinta-500 leading-relaxed">
          {t('habitability.successText')}
          {form.habitability === 'no_habitable' ? ` ${t('habitability.successEvacuation')}` : ''}
        </p>
        <div className="mt-6 ficha p-5">
          <p className="text-sm text-tinta-500">{t('habitability.assessmentCode')}</p>
          <p className="mt-1 text-2xl font-bold text-azul-600 tracking-wide">{resultId}</p>
          {form.habitability && (
            <div className="mt-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ${VERDICT_BADGE[form.habitability]}`}>
                {t(`habitability.verdicts.${form.habitability}`)}
              </span>
            </div>
          )}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="btn-primary">
            {t('habitability.evaluateAnother')}
          </button>
          <button type="button" onClick={() => navigate('/socorro')} className="btn-secondary">
            {t('habitability.backToPanel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:py-12 animate-fade-in">
      <h1 className="text-xl font-bold text-tinta-900 lg:text-2xl mb-1">{t('habitability.title')}</h1>
      <p className="text-sm text-tinta-500 mb-6">{t('habitability.subtitle')}</p>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEP_NUMBERS.map((number) => (
            <div key={number} className="flex items-center gap-2">
              <div
                aria-current={step === number ? 'step' : undefined}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  step === number ? 'bg-azul-600 text-white shadow-sm' : step > number ? 'bg-oro-100 text-oro-700' : 'bg-tinta-100 text-tinta-400'
                }`}
              >
                {step > number ? <Check className="h-4 w-4" aria-hidden="true" /> : number}
              </div>
              <span className={`hidden text-sm font-medium sm:block ${step === number ? 'text-tinta-900' : 'text-tinta-400'}`}>
                {t(`habitability.steps.${number}`)}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-tinta-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-azul-600 transition-all duration-500"
            style={{ width: `${((step - 1) / (HABITABILITY_STEP_COUNT - 1)) * 100}%` }}
          />
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4 animate-slide-up">
          <div>
            <label htmlFor="hab-incident" className="block text-sm font-medium text-tinta-700 mb-1.5">
              {t('habitability.relatedIncident')}
            </label>
            <select
              id="hab-incident"
              value={form.incidentLogId}
              onChange={(e) => update({ incidentLogId: e.target.value })}
              className="campo"
            >
              <option value="">{t('habitability.selectIncident')}</option>
              {activeIncidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.id} - {inc.location}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="hab-address" className="block text-sm font-medium text-tinta-700 mb-1.5">
              <MapPin className="inline h-4 w-4 mr-1" aria-hidden="true" />
              {t('habitability.address')}
            </label>
            <input
              id="hab-address"
              type="text"
              value={form.address}
              onChange={(e) => update({ address: e.target.value })}
              placeholder={t('habitability.addressPlaceholder')}
              className="campo"
            />
          </div>

          <div>
            <p className="block text-sm font-medium text-tinta-700 mb-1.5">
              <Home className="inline h-4 w-4 mr-1" aria-hidden="true" />
              {t('habitability.housingType')}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {HOUSING_TYPE_KEYS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update({ housingType: value })}
                  className={`rounded-xl border-2 p-3 text-center text-sm transition-all ${
                    form.housingType === value
                      ? 'border-azul-400 bg-azul-50 text-azul-700 font-semibold'
                      : 'border-tinta-200 bg-white text-tinta-600 hover:bg-tinta-50'
                  }`}
                >
                  {t(`habitability.housingTypes.${value}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium text-tinta-700 mb-1.5">
              <Users className="inline h-4 w-4 mr-1" aria-hidden="true" />
              {t('habitability.occupants')}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => adjustOccupants(-1)}
                aria-label={t('habitability.a11y.decreaseOccupants')}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-tinta-300 text-tinta-600 hover:bg-tinta-50"
              >
                -
              </button>
              <span className="w-12 text-center text-lg font-bold text-tinta-900">{form.occupantsPresent}</span>
              <button
                type="button"
                onClick={() => adjustOccupants(1)}
                aria-label={t('habitability.a11y.increaseOccupants')}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-tinta-300 text-tinta-600 hover:bg-tinta-50"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 animate-slide-up">
          <div>
            <p className="block text-sm font-medium text-tinta-700 mb-2">{t('habitability.verdict')}</p>
            <div className="grid gap-3">
              {VERDICTS.map(({ value, color, iconColor }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update({ habitability: value })}
                  className={`flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                    form.habitability === value
                      ? `${color} border-current ring-2 ring-current/20`
                      : 'border-tinta-200 bg-white text-tinta-600 hover:bg-tinta-50'
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    form.habitability === value ? iconColor : 'bg-tinta-100 text-tinta-400'
                  }`}>
                    {value === 'habitable' ? <Check className="h-5 w-5" aria-hidden="true" /> :
                     value === 'uso_restringido' ? <AlertTriangle className="h-5 w-5" aria-hidden="true" /> :
                     <ShieldAlert className="h-5 w-5" aria-hidden="true" />}
                  </div>
                  <div>
                    <p className="font-bold">{t(`habitability.verdicts.${value}`)}</p>
                    <p className="text-sm mt-0.5 opacity-80">{t(`habitability.verdictDesc.${value}`)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium text-tinta-700 mb-2">{t('habitability.damageCategory')}</p>
            <div className="grid grid-cols-3 gap-2">
              {DAMAGE_OPTIONS.map(({ value, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update({ damageAggregate: value })}
                  className={`rounded-xl border-2 p-3 text-center text-sm transition-all ${
                    form.damageAggregate === value ? `${color} border-current font-semibold` : 'border-tinta-200 bg-white text-tinta-600 hover:bg-tinta-50'
                  }`}
                >
                  {t(`census.damageAggregate.${value}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="hab-structural" className="flex items-center gap-3 cursor-pointer rounded-xl border border-tinta-200 bg-tinta-50 p-4 transition-colors hover:bg-tinta-100">
              <input
                id="hab-structural"
                type="checkbox"
                checked={form.needsStructuralInspection}
                onChange={(e) => update({ needsStructuralInspection: e.target.checked })}
                className="h-5 w-5 rounded border-tinta-300 text-azul-600 focus:ring-azul-500"
              />
              <div>
                <span className="text-sm font-medium text-tinta-700">{t('habitability.structuralInspection')}</span>
                <p className="text-xs text-tinta-500 mt-0.5">{t('habitability.structuralInspectionHint')}</p>
              </div>
            </label>
          </div>

          <div>
            <label htmlFor="hab-notes" className="block text-sm font-medium text-tinta-700 mb-1.5">
              {t('habitability.notes')}
            </label>
            <textarea
              id="hab-notes"
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder={t('habitability.notesPlaceholder')}
              rows={3}
              className="campo-area"
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 animate-slide-up">
          {form.habitability === 'no_habitable' && (
            <div className="rounded-2xl border-2 border-alerta-300 bg-alerta-50 p-5">
              <div className="flex items-start gap-3">
                <FileWarning className="h-6 w-6 text-alerta-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="font-bold text-alerta-800">{t('habitability.notHabitableTitle')}</h3>
                  <p className="text-sm text-alerta-700 mt-1 leading-relaxed">{t('habitability.notHabitableText')}</p>
                </div>
              </div>
            </div>
          )}

          <label htmlFor="hab-evacuation" className="flex items-center gap-3 cursor-pointer rounded-xl border border-tinta-200 bg-white p-4 transition-colors hover:bg-tinta-50">
            <input
              id="hab-evacuation"
              type="checkbox"
              checked={form.evacuationNotificationIssued}
              onChange={(e) => update({ evacuationNotificationIssued: e.target.checked })}
              className="h-5 w-5 rounded border-tinta-300 text-alerta-600 focus:ring-alerta-500"
            />
            <div>
              <span className="text-sm font-medium text-tinta-700">{t('habitability.evacuationIssued')}</span>
              <p className="text-xs text-tinta-500 mt-0.5">{t('habitability.evacuationIssuedHint')}</p>
            </div>
          </label>

          <label htmlFor="hab-shelter" className="flex items-center gap-3 cursor-pointer rounded-xl border border-tinta-200 bg-white p-4 transition-colors hover:bg-tinta-50">
            <input
              id="hab-shelter"
              type="checkbox"
              checked={form.temporaryShelterActivated}
              onChange={(e) => update({ temporaryShelterActivated: e.target.checked })}
              className="h-5 w-5 rounded border-tinta-300 text-azul-600 focus:ring-azul-500"
            />
            <div>
              <span className="text-sm font-medium text-tinta-700">{t('habitability.shelterActivated')}</span>
              <p className="text-xs text-tinta-500 mt-0.5">{t('habitability.shelterActivatedHint')}</p>
            </div>
          </label>

          <div className="ficha p-5 mt-4">
            <h3 className="font-bold text-tinta-900 mb-3">{t('habitability.summaryTitle')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-tinta-500">{t('habitability.summaryAddress')}</span>
                <span className="font-medium text-tinta-700 text-right max-w-[60%]">{form.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tinta-500">{t('habitability.summaryType')}</span>
                <span className="font-medium text-tinta-700">
                  {form.housingType ? t(`habitability.housingTypes.${form.housingType}`) : t('habitability.emptyValue')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tinta-500">{t('habitability.summaryHabitability')}</span>
                {form.habitability && (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${VERDICT_BADGE[form.habitability]}`}>
                    {t(`habitability.verdicts.${form.habitability}`)}
                  </span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-tinta-500">{t('habitability.summaryDamage')}</span>
                <span className="font-medium text-tinta-700">
                  {form.damageAggregate ? t(`census.damageAggregate.${form.damageAggregate}`) : t('habitability.emptyValue')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-tinta-500">{t('habitability.summaryOccupants')}</span>
                <span className="font-medium text-tinta-700">{form.occupantsPresent}</span>
              </div>
              {form.needsStructuralInspection && (
                <div className="flex justify-between">
                  <span className="text-tinta-500">{t('habitability.summaryInspection')}</span>
                  <span className="font-medium text-espera-600">{t('habitability.inspectionRequired')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-azul-200 bg-azul-50 p-4">
            <p className="text-sm text-azul-800">{t('habitability.edanNote')}</p>
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
          {step > 1 ? t('habitability.previous') : t('habitability.cancel')}
        </button>

        {step < HABITABILITY_STEP_COUNT ? (
          <button type="button" onClick={goNext} disabled={!canProceed} className="btn-primary">
            {t('habitability.next')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={submit} className="btn-primary">
            {t('habitability.submit')} <Check className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
