import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Save, Loader2 } from 'lucide-react';
import type { CensusWizardState, WizardFamily, WizardPerson, Parentesco } from '@/types/edan';
import StepOperationContext from '@/components/census/StepOperationContext';
import StepHousingVisit from '@/components/census/StepHousingVisit';
import StepPeopleRegistration from '@/components/census/StepPeopleRegistration';
import StepDamageAssessment from '@/components/census/StepDamageAssessment';
import StepNeedsAssessment from '@/components/census/StepNeedsAssessment';
import StepConsentReview from '@/components/census/StepConsentReview';

const STEPS = [
  { number: 1, title: 'Contexto', short: 'Op.' },
  { number: 2, title: 'Vivienda', short: 'Viv.' },
  { number: 3, title: 'Personas', short: 'Pers.' },
  { number: 4, title: 'Daños', short: 'Daños' },
  { number: 5, title: 'Necesidades', short: 'Nec.' },
  { number: 6, title: 'Revisión', short: 'Enviar' },
];

function createBlankPerson(): WizardPerson {
  return {
    id: crypto.randomUUID(),
    documentType: 'CC',
    documentNumber: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    sexo: 'M',
    parentesco: 'jefe_hogar' as Parentesco,
    grupoEtnico: 'ninguno',
    discapacidad: 'ninguna',
    condicionSalud: 'ileso',
    healthNotes: '',
    isPregnant: false,
    isLactating: false,
    isMinorUnaccompanied: false,
  };
}

function createBlankFamily(): WizardFamily {
  return {
    id: crypto.randomUUID(),
    persons: [createBlankPerson()],
    needs: [],
    needNotes: '',
  };
}

const INITIAL_STATE: CensusWizardState = {
  eventType: '',
  eventDate: new Date().toISOString().split('T')[0],
  departamento: '',
  municipio: '',
  zone: 'urbano',
  zoneName: '',
  address: '',
  coordinates: null,
  numberOfFamilies: 1,
  housingType: 'casa',
  ownershipType: 'propia',
  waterAffected: false,
  sewerAffected: false,
  electricityAffected: false,
  families: [createBlankFamily()],
  damageAggregate: 'sin_dano',
  damageStructural: '',
  damageNotes: '',
  affectedGoods: [],
  consentGranted: false,
};

export default function FieldCensusWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<CensusWizardState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const syncFamilies = (count: number, current: WizardFamily[]): WizardFamily[] => {
    if (count > current.length) {
      return [...current, ...Array.from({ length: count - current.length }, createBlankFamily)];
    }
    return current.slice(0, count);
  };

  const update = (partial: Partial<CensusWizardState>) => {
    setData((prev) => {
      const next = { ...prev, ...partial };
      if (partial.numberOfFamilies !== undefined && partial.numberOfFamilies !== prev.numberOfFamilies) {
        next.families = syncFamilies(partial.numberOfFamilies, prev.families);
      }
      return next;
    });
  };

  const validations = useMemo(() => {
    const v: Record<number, boolean> = {};
    v[1] = !!data.eventType && !!data.eventDate && !!data.departamento && !!data.municipio && !!data.zoneName;
    v[2] = !!data.address && data.numberOfFamilies >= 1;
    v[3] = data.families.every(
      (f) =>
        f.persons.length >= 1 &&
        f.persons.every((p) => !!p.firstName && !!p.lastName) &&
        f.persons.filter((p) => p.parentesco === 'jefe_hogar').length === 1
    );
    v[4] = !!data.damageAggregate;
    v[5] = data.families.every((f) => f.needs.length >= 1);
    v[6] = data.consentGranted;
    return v;
  }, [data]);

  const canProceed = validations[step] ?? false;

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center animate-scale-in">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Censo EDAN registrado</h1>
        <p className="mt-2 text-slate-500">
          {data.families.length} familia(s) y{' '}
          {data.families.reduce((sum, f) => sum + f.persons.length, 0)} persona(s) en {data.address}.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => { setData(INITIAL_STATE); setStep(1); setSubmitted(false); }}
            className="btn-primary"
          >
            Nuevo censo
          </button>
          <button onClick={() => navigate('/rescatista')} className="btn-secondary">
            Volver al panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 animate-fade-in">
      {/* Header */}
      <div className="mb-5">
        <button
          onClick={() => (step === 1 ? navigate('/rescatista') : setStep(step - 1))}
          className="mb-2 flex items-center gap-1 text-sm text-ungrd-600 hover:text-ungrd-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 1 ? 'Volver al panel' : 'Paso anterior'}
        </button>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Censo EDAN de Campo</h1>
        <p className="mt-0.5 text-sm text-slate-500">Evaluación de Daños y Análisis de Necesidades</p>
      </div>

      {/* Step indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((s) => (
            <div key={s.number} className="flex flex-1 flex-col items-center">
              <div className="relative flex w-full items-center justify-center">
                {s.number > 1 && (
                  <div className={`absolute left-0 right-1/2 top-1/2 h-0.5 -translate-y-1/2 ${step >= s.number ? 'bg-ungrd-500' : 'bg-slate-200'}`} />
                )}
                {s.number < STEPS.length && (
                  <div className={`absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2 ${step > s.number ? 'bg-ungrd-500' : 'bg-slate-200'}`} />
                )}
                <div className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors sm:h-8 sm:w-8 ${
                  step === s.number
                    ? 'bg-ungrd-600 text-white ring-4 ring-ungrd-100'
                    : step > s.number
                      ? 'bg-ungrd-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                }`}>
                  {step > s.number ? <Check className="h-3.5 w-3.5" /> : s.number}
                </div>
              </div>
              <span className={`mt-1 text-[10px] font-medium sm:text-xs ${step === s.number ? 'text-ungrd-700' : 'text-slate-400'}`}>
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{s.short}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
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

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {step < 6 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canProceed || submitting}
            className="btn-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Registrar Censo
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
