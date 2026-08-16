import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Save, Loader2 } from 'lucide-react';
import { CENSUS_STEP_COUNT, useFieldCensus } from '@/experiencias/terreno/brigada/hooks/useFieldCensus';
import StepOperationContext from '@/experiencias/terreno/brigada/components/census/StepOperationContext';
import StepHousingVisit from '@/experiencias/terreno/brigada/components/census/StepHousingVisit';
import StepPeopleRegistration from '@/experiencias/terreno/brigada/components/census/StepPeopleRegistration';
import StepDamageAssessment from '@/experiencias/terreno/brigada/components/census/StepDamageAssessment';
import StepNeedsAssessment from '@/experiencias/terreno/brigada/components/census/StepNeedsAssessment';
import StepConsentReview from '@/experiencias/terreno/brigada/components/census/StepConsentReview';
import PasosAsistente from '@/experiencias/terreno/comunes/PasosAsistente';
import PieAsistente from '@/experiencias/terreno/comunes/PieAsistente';

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
      <div className="animate-scale-in py-12 text-center" aria-live="polite">
        <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-10 w-10 text-emerald-700" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold text-slate-900">{t('census.success.title')}</h1>
        <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-slate-600">
          {t('census.success.summary', {
            families: data.families.length,
            persons: totalPersons,
            address: data.address,
          })}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="btn-primary btn-lg">
            {t('census.newCensus')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/brigada')}
            className="btn-secondary w-full sm:w-auto"
          >
            {t('census.backToPanel')}
          </button>
        </div>
      </div>
    );
  }

  const pasos = STEP_NUMBERS.map((number) => ({
    clave: String(number),
    etiqueta: t(`census.steps.${number}.title`),
    etiquetaCorta: t(`census.steps.${number}.short`),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('census.title')}</h1>
        <p className="mt-1 text-base text-slate-600">{t('census.subtitle')}</p>
      </div>

      <PasosAsistente pasos={pasos} actual={step} />

      <div className="card-pad">
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

      <PieAsistente
        atras={{
          etiqueta: step === 1 ? t('census.backToPanel') : t('census.previous'),
          onClick: () => (step === 1 ? navigate('/brigada') : goPrev()),
        }}
      >
        {step < CENSUS_STEP_COUNT ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed}
            className="btn-primary btn-lg"
          >
            {t('census.next')}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed || submitting}
            className="btn-accent btn-lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                {t('census.submitting')}
              </>
            ) : (
              <>
                <Save className="h-5 w-5" aria-hidden="true" />
                {t('census.submit')}
              </>
            )}
          </button>
        )}
      </PieAsistente>
    </div>
  );
}
