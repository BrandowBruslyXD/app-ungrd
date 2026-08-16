import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Check,
  MapPin,
  Home,
  AlertTriangle,
  ShieldAlert,
  FileWarning,
  Users,
} from 'lucide-react';
import type { Habitability, HousingDamageAggregate } from '@/shared/types/edan';
import { HABITABILITY_STEP_COUNT, useHabitability } from '@/experiencias/terreno/socorro/hooks/useHabitability';
import type { HabitabilityForm } from '@/experiencias/terreno/socorro/hooks/useHabitability';
import PasosAsistente from '@/experiencias/terreno/comunes/PasosAsistente';
import PieAsistente from '@/experiencias/terreno/comunes/PieAsistente';
import Contador from '@/experiencias/terreno/comunes/Contador';

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
  { value: 'habitable', color: 'border-emerald-500 bg-emerald-50 text-emerald-900', iconColor: 'bg-emerald-200 text-emerald-800' },
  { value: 'uso_restringido', color: 'border-amber-500 bg-amber-50 text-amber-900', iconColor: 'bg-amber-200 text-amber-900' },
  { value: 'no_habitable', color: 'border-red-500 bg-red-50 text-red-900', iconColor: 'bg-red-200 text-red-800' },
];

const DAMAGE_OPTIONS: readonly { value: HousingDamageAggregate; color: string }[] = [
  { value: 'sin_dano', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
  { value: 'averiada', color: 'border-amber-500 bg-amber-50 text-amber-900' },
  { value: 'destruida', color: 'border-red-500 bg-red-50 text-red-800' },
];

const VERDICT_BADGE: Record<Habitability, string> = {
  habitable: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  uso_restringido: 'bg-amber-50 text-amber-900 ring-amber-200',
  no_habitable: 'bg-red-50 text-red-800 ring-red-200',
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
      <div className="animate-scale-in py-12 text-center" aria-live="polite">
        <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-10 w-10 text-emerald-700" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold text-slate-900">{t('habitability.successTitle')}</h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-slate-600">
          {t('habitability.successText')}
          {form.habitability === 'no_habitable' ? ` ${t('habitability.successEvacuation')}` : ''}
        </p>
        <div className="card mx-auto mt-6 max-w-sm p-5">
          <p className="text-base text-slate-600">{t('habitability.assessmentCode')}</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-ungrd-700">{resultId}</p>
          {form.habitability && (
            <p className="mt-3">
              <span className={`badge text-base ring-1 ${VERDICT_BADGE[form.habitability]}`}>
                {t(`habitability.verdicts.${form.habitability}`)}
              </span>
            </p>
          )}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="btn-primary btn-lg">
            {t('habitability.evaluateAnother')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/socorro')}
            className="btn-secondary w-full sm:w-auto"
          >
            {t('habitability.backToPanel')}
          </button>
        </div>
      </div>
    );
  }

  const pasos = STEP_NUMBERS.map((number) => ({
    clave: String(number),
    etiqueta: t(`habitability.steps.${number}`),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('habitability.title')}</h1>
        <p className="mt-1 text-base text-slate-600">{t('habitability.subtitle')}</p>
      </div>

      <PasosAsistente pasos={pasos} actual={step} />

      {step === 1 && (
        <div className="animate-slide-up space-y-5">
          <div>
            <label htmlFor="hab-incident" className="field-label">
              {t('habitability.relatedIncident')}
            </label>
            <select
              id="hab-incident"
              value={form.incidentLogId}
              onChange={(e) => update({ incidentLogId: e.target.value })}
              className="select-field"
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
            <label htmlFor="hab-address" className="field-label">
              <MapPin className="mr-1 inline h-4 w-4" aria-hidden="true" />
              {t('habitability.address')}
            </label>
            <input
              id="hab-address"
              type="text"
              value={form.address}
              onChange={(e) => update({ address: e.target.value })}
              placeholder={t('habitability.addressPlaceholder')}
              className="input-field"
            />
          </div>

          <div>
            <p className="field-label">
              <Home className="mr-1 inline h-4 w-4" aria-hidden="true" />
              {t('habitability.housingType')}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {HOUSING_TYPE_KEYS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update({ housingType: value })}
                  aria-pressed={form.housingType === value}
                  className={`rounded-xl border-2 px-2 text-center text-base transition-all min-h-toque ${
                    form.housingType === value
                      ? 'border-ungrd-500 bg-ungrd-50 font-semibold text-ungrd-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {t(`habitability.housingTypes.${value}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p id="hab-occupants-label" className="field-label">
              <Users className="mr-1 inline h-4 w-4" aria-hidden="true" />
              {t('habitability.occupants')}
            </p>
            <div role="group" aria-labelledby="hab-occupants-label">
              <Contador
                valor={form.occupantsPresent}
                onCambiar={adjustOccupants}
                enMinimo={form.occupantsPresent <= 0}
                etiquetaDisminuir={t('habitability.a11y.decreaseOccupants')}
                etiquetaAumentar={t('habitability.a11y.increaseOccupants')}
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-slide-up space-y-5">
          <div>
            <p className="field-label">{t('habitability.verdict')}</p>
            <div className="grid gap-3">
              {VERDICTS.map(({ value, color, iconColor }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update({ habitability: value })}
                  aria-pressed={form.habitability === value}
                  className={`flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                    form.habitability === value
                      ? `${color} ring-2 ring-current/20`
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    form.habitability === value ? iconColor : 'bg-slate-100 text-slate-500'
                  }`}>
                    {value === 'habitable' ? <Check className="h-6 w-6" aria-hidden="true" /> :
                     value === 'uso_restringido' ? <AlertTriangle className="h-6 w-6" aria-hidden="true" /> :
                     <ShieldAlert className="h-6 w-6" aria-hidden="true" />}
                  </span>
                  <span>
                    <span className="block text-lg font-bold">{t(`habitability.verdicts.${value}`)}</span>
                    <span className="mt-0.5 block text-base leading-relaxed opacity-90">
                      {t(`habitability.verdictDesc.${value}`)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="field-label">{t('habitability.damageCategory')}</p>
            <div className="grid grid-cols-3 gap-2">
              {DAMAGE_OPTIONS.map(({ value, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update({ damageAggregate: value })}
                  aria-pressed={form.damageAggregate === value}
                  className={`rounded-xl border-2 px-2 text-center text-base transition-all min-h-toque ${
                    form.damageAggregate === value ? `${color} font-semibold` : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {t(`census.damageAggregate.${value}`)}
                </button>
              ))}
            </div>
          </div>

          <label
            htmlFor="hab-structural"
            className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 transition-colors hover:border-ungrd-300"
          >
            <input
              id="hab-structural"
              type="checkbox"
              checked={form.needsStructuralInspection}
              onChange={(e) => update({ needsStructuralInspection: e.target.checked })}
              className="mt-0.5 h-6 w-6 shrink-0 rounded border-slate-400 text-ungrd-600 focus:ring-ungrd-500"
            />
            <span>
              <span className="block text-base font-semibold text-slate-900">{t('habitability.structuralInspection')}</span>
              <span className="mt-0.5 block text-base leading-relaxed text-slate-700">
                {t('habitability.structuralInspectionHint')}
              </span>
            </span>
          </label>

          <div>
            <label htmlFor="hab-notes" className="field-label">
              {t('habitability.notes')}
            </label>
            <textarea
              id="hab-notes"
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder={t('habitability.notesPlaceholder')}
              rows={3}
              className="textarea-field"
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-slide-up space-y-4">
          {form.habitability === 'no_habitable' && (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <FileWarning className="mt-0.5 h-6 w-6 shrink-0 text-red-700" aria-hidden="true" />
                <div>
                  <h2 className="text-lg font-bold text-red-900">{t('habitability.notHabitableTitle')}</h2>
                  <p className="mt-1 text-base leading-relaxed text-red-900">{t('habitability.notHabitableText')}</p>
                </div>
              </div>
            </div>
          )}

          <label
            htmlFor="hab-evacuation"
            className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 transition-colors hover:border-red-300"
          >
            <input
              id="hab-evacuation"
              type="checkbox"
              checked={form.evacuationNotificationIssued}
              onChange={(e) => update({ evacuationNotificationIssued: e.target.checked })}
              className="mt-0.5 h-6 w-6 shrink-0 rounded border-slate-400 text-red-600 focus:ring-red-500"
            />
            <span>
              <span className="block text-base font-semibold text-slate-900">{t('habitability.evacuationIssued')}</span>
              <span className="mt-0.5 block text-base leading-relaxed text-slate-700">
                {t('habitability.evacuationIssuedHint')}
              </span>
            </span>
          </label>

          <label
            htmlFor="hab-shelter"
            className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 transition-colors hover:border-blue-300"
          >
            <input
              id="hab-shelter"
              type="checkbox"
              checked={form.temporaryShelterActivated}
              onChange={(e) => update({ temporaryShelterActivated: e.target.checked })}
              className="mt-0.5 h-6 w-6 shrink-0 rounded border-slate-400 text-blue-600 focus:ring-blue-500"
            />
            <span>
              <span className="block text-base font-semibold text-slate-900">{t('habitability.shelterActivated')}</span>
              <span className="mt-0.5 block text-base leading-relaxed text-slate-700">
                {t('habitability.shelterActivatedHint')}
              </span>
            </span>
          </label>

          <div className="card p-5">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">{t('habitability.summaryTitle')}</h2>
            <dl className="space-y-2 text-base">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">{t('habitability.summaryAddress')}</dt>
                <dd className="max-w-[60%] text-right font-medium text-slate-900">{form.address}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">{t('habitability.summaryType')}</dt>
                <dd className="text-right font-medium text-slate-900">
                  {form.housingType ? t(`habitability.housingTypes.${form.housingType}`) : t('habitability.emptyValue')}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-600">{t('habitability.summaryHabitability')}</dt>
                <dd className="text-right">
                  {form.habitability && (
                    <span className={`badge ring-1 ${VERDICT_BADGE[form.habitability]}`}>
                      {t(`habitability.verdicts.${form.habitability}`)}
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">{t('habitability.summaryDamage')}</dt>
                <dd className="text-right font-medium text-slate-900">
                  {form.damageAggregate ? t(`census.damageAggregate.${form.damageAggregate}`) : t('habitability.emptyValue')}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">{t('habitability.summaryOccupants')}</dt>
                <dd className="text-right font-medium text-slate-900">{form.occupantsPresent}</dd>
              </div>
              {form.needsStructuralInspection && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">{t('habitability.summaryInspection')}</dt>
                  <dd className="text-right font-medium text-amber-800">{t('habitability.inspectionRequired')}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-base leading-relaxed text-blue-900">{t('habitability.edanNote')}</p>
          </div>
        </div>
      )}

      <PieAsistente
        atras={{
          etiqueta: step > 1 ? t('habitability.previous') : t('habitability.cancel'),
          onClick: () => (step > 1 ? goPrev() : navigate('/socorro')),
        }}
      >
        {step < HABITABILITY_STEP_COUNT ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed}
            className="btn-primary btn-lg"
          >
            {t('habitability.next')}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={submit} className="btn-primary btn-lg">
            {t('habitability.submit')}
            <Check className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </PieAsistente>
    </div>
  );
}
