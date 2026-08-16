import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Save, Loader2, WifiOff } from 'lucide-react';
import { CENSUS_STEP_COUNT, useFieldCensus } from '@/hooks/useFieldCensus';
import StepOperationContext from '@/components/census/StepOperationContext';
import StepHousingVisit from '@/components/census/StepHousingVisit';
import StepPeopleRegistration from '@/components/census/StepPeopleRegistration';
import StepDamageAssessment from '@/components/census/StepDamageAssessment';
import StepNeedsAssessment from '@/components/census/StepNeedsAssessment';
import StepConsentReview from '@/components/census/StepConsentReview';
import IndicadorPasos from '@/components/ui/IndicadorPasos';
import Aviso from '@/components/ui/Aviso';
import TalonSeguimiento from '@/components/ui/TalonSeguimiento';
import { useTituloPagina } from '@/hooks/useTituloPagina';

/**
 * Asistente del censo EDAN de campo.
 *
 * Seis pasos que siguen la jerarquía del RUD —operación, vivienda, familia,
 * persona— para que la planilla salga en el formato que la alcaldía ya sabe
 * recibir, sin traducción de por medio.
 *
 * El indicador de avance dejó de ser la fila de seis circulitos numerados: en un
 * teléfono de 360px cada rótulo quedaba en 10px y truncado («Op.», «Viv.»,
 * «Pers.»), justo lo que no puede leer alguien trabajando bajo la lluvia.
 */
export default function FieldCensusWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    step,
    data,
    update,
    submitting,
    submitted,
    codigo,
    fallosDePersistencia,
    canProceed,
    totalPersons,
    problemasDeDocumento,
    handleSubmit,
    reset,
    goNext,
    goPrev,
    createBlankPerson,
  } = useFieldCensus();

  useTituloPagina(t('meta.census.title'), t('meta.census.description'));

  if (submitted) {
    return (
      <div className="animate-scale-in mx-auto max-w-xl px-4 py-10" aria-live="polite">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-seguro-100">
            <Check className="h-8 w-8 text-seguro-600" strokeWidth={3} aria-hidden="true" />
          </span>
          <h1 className="text-2xl">{t('census.success.title')}</h1>
        </div>

        {fallosDePersistencia ? (
          <div className="mb-5">
            <Aviso tono="alerta" urgente>
              {t('census.success.couldNotSave')}
            </Aviso>
          </div>
        ) : (
          <div className="mb-5">
            <Aviso tono="espera" titulo={t('census.success.pendingSyncTitle')}>
              {t('census.success.pendingSyncBody')}
            </Aviso>
          </div>
        )}

        {/* El folio del censo también es un talón: el brigadista lo dicta por
            radio y el digitador de la alcaldía lo busca con él. */}
        <TalonSeguimiento codigo={codigo} nivelConfianza="censado" conAdvertenciaCenso={false} />

        <p className="mt-5 leading-relaxed text-tinta-700">
          {t('census.success.summary', {
            families: data.families.length,
            persons: totalPersons,
            address: data.address,
          })}
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="btn-primary flex-1">
            {t('census.newCensus')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/rescatista')}
            className="btn-secondary flex-1"
          >
            {t('census.backToPanel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-3xl px-4 pb-32 pt-6 lg:pb-12">
      <div className="mb-2">
        <h1 className="text-2xl">{t('census.title')}</h1>
        <p className="mt-1 text-tinta-600">{t('census.subtitle')}</p>
      </div>

      {/* Se avisa desde el principio: lo capturado vive en el teléfono hasta
          que haya señal. Es la diferencia entre confiar en la herramienta y
          seguir llevando el papel por si acaso. */}
      <div className="mb-6 flex items-center gap-2.5 font-semibold text-tinta-600">
        <WifiOff className="h-5 w-5 shrink-0" aria-hidden="true" />
        {t('census.worksOffline')}
      </div>

      <div className="mb-7">
        <IndicadorPasos
          paso={step}
          total={CENSUS_STEP_COUNT}
          titulo={t(`census.steps.${step}.title`)}
        />
      </div>

      <div className="ficha p-4 sm:p-5">
        {step === 1 && <StepOperationContext data={data} update={update} />}
        {step === 2 && <StepHousingVisit data={data} update={update} />}
        {step === 3 && (
          <StepPeopleRegistration
            families={data.families}
            onUpdateFamilies={(families) => update({ families })}
            createBlankPerson={createBlankPerson}
            problemasDeDocumento={problemasDeDocumento}
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-papel-borde bg-white/95 backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 lg:px-0 lg:py-0">
          <button
            type="button"
            onClick={() => (step === 1 ? navigate('/rescatista') : goPrev())}
            className="btn-secondary shrink-0"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">
              {step === 1 ? t('census.backToPanel') : t('census.previous')}
            </span>
          </button>

          {step < CENSUS_STEP_COUNT ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed}
              className="btn-primary min-h-control-lg flex-1"
            >
              {t('census.next')}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed || submitting}
              className="btn-accent min-h-control-lg flex-1"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-5 w-5" aria-hidden="true" />
              )}
              {submitting ? t('census.submitting') : t('census.submit')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
