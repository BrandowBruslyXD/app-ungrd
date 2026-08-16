import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Save, Loader2 } from 'lucide-react';
import { CENSUS_STEP_COUNT, useFieldCensus } from '@/experiencias/terreno/brigada/hooks/useFieldCensus';
import StepOperationContext from '@/experiencias/terreno/brigada/components/census/StepOperationContext';
import StepHousingVisit from '@/experiencias/terreno/brigada/components/census/StepHousingVisit';
import StepPeopleRegistration from '@/experiencias/terreno/brigada/components/census/StepPeopleRegistration';
import StepDamageAssessment from '@/experiencias/terreno/brigada/components/census/StepDamageAssessment';
import StepNeedsAssessment from '@/experiencias/terreno/brigada/components/census/StepNeedsAssessment';
import StepConsentReview from '@/experiencias/terreno/brigada/components/census/StepConsentReview';

const STEP_NUMBERS = [1, 2, 3, 4, 5, 6] as const;

export default function FieldCensusWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    step,
    data,
    update,
    submitting,
    submitted,
    canProceed,
    totalPersons,
    handleSubmit,
    reset,
    goNext,
    goPrev,
    createBlankPerson,
  } = useFieldCensus();

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center animate-scale-in" aria-live="polite">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-10 w-10 text-emerald-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{t('census.success.title')}</h1>
        <p className="mt-2 text-slate-500">
          {t('census.success.summary', {
            families: data.families.length,
            persons: totalPersons,
            address: data.address,
          })}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="btn-primary">
            {t('census.newCensus')}
          </button>
          <button type="button" onClick={() => navigate('/rescatista')} className="btn-secondary">
            {t('census.backToPanel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 animate-fade-in">
      <div className="mb-5">
        <button
          type="button"
          onClick={() => (step === 1 ? navigate('/rescatista') : goPrev())}
          className="mb-2 flex items-center gap-1 text-sm text-ungrd-600 hover:text-ungrd-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {step === 1 ? t('census.backToPanel') : t('census.previousStep')}
        </button>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{t('census.title')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('census.subtitle')}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between">
          {STEP_NUMBERS.map((number) => (
            <div key={number} className="flex flex-1 flex-col items-center">
              <div className="relative flex w-full items-center justify-center">
                {number > 1 && (
                  <div className={`absolute left-0 right-1/2 top-1/2 h-0.5 -translate-y-1/2 ${step >= number ? 'bg-ungrd-500' : 'bg-slate-200'}`} />
                )}
                {number < CENSUS_STEP_COUNT && (
                  <div className={`absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2 ${step > number ? 'bg-ungrd-500' : 'bg-slate-200'}`} />
                )}
                <div
                  aria-current={step === number ? 'step' : undefined}
                  className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors sm:h-8 sm:w-8 ${
                    step === number
                      ? 'bg-ungrd-600 text-white ring-4 ring-ungrd-100'
                      : step > number
                        ? 'bg-ungrd-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step > number ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : number}
                </div>
              </div>
              <span className={`mt-1 text-[10px] font-medium sm:text-xs ${step === number ? 'text-ungrd-700' : 'text-slate-400'}`}>
                <span className="hidden sm:inline">{t(`census.steps.${number}.title`)}</span>
                <span className="sm:hidden">{t(`census.steps.${number}.short`)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        {step === 1 && <StepOperationContext data={data} update={update} />}
        {step === 2 && <StepHousingVisit data={data} update={update} />}
        {step === 3 && (
          <StepPeopleRegistration
            families={data.families}
            onUpdateFamilies={(families) => update({ families })}
            createBlankPerson={createBlankPerson}
          />
        )}
        {step === 4 && <StepDamageAssessment data={data} update={update} />}
        {step === 5 && (
          <StepNeedsAssessment
            families={data.families}
            onUpdateFamilies={(families) => update({ families })}
          />
        )}
        {step === 6 && <StepConsentReview data={data} update={update} />}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 1}
          className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('census.previous')}</span>
        </button>

        {step < CENSUS_STEP_COUNT ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('census.next')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed || submitting}
            className="btn-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('census.submitting')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                {t('census.submit')}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
