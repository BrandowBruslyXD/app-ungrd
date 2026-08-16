import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CitizenReportType, EmergencyType } from '@/shared/types';

export type ReportSeverity = 'leve' | 'moderado' | 'grave';

export interface ReportWizardForm {
  type: EmergencyType | '';
  description: string;
  severity: ReportSeverity | '';
  hasPhoto: boolean;
  location: string;
  useGps: boolean;
  contactPhone: string;
  householdSize: number;
  isHabitable: boolean;
  urgentNeed: string;
}

export const INITIAL_REPORT_FORM: ReportWizardForm = {
  type: '',
  description: '',
  severity: '',
  hasPhoto: false,
  location: '',
  useGps: false,
  contactPhone: '',
  householdSize: 1,
  isHabitable: true,
  urgentNeed: '',
};

export const AFECTADO_STEP_KEYS = [
  'reportType',
  'whatHappened',
  'yourSituation',
  'whereAreYou',
  'importantNotice',
] as const;

export const TESTIGO_STEP_KEYS = [
  'reportType',
  'whatDidYouSee',
  'tellUsMore',
  'whereItHappens',
] as const;

export function canProceed(args: {
  step: number;
  reportType: CitizenReportType | null;
  form: ReportWizardForm;
  disclaimerAccepted: boolean;
}): boolean {
  const isAfectado = args.reportType === 'afectado';

  if (args.step === 0) {
    return args.reportType !== null;
  }
  if (args.step === 1) {
    return Boolean(args.form.type);
  }
  if (args.step === 2) {
    return isAfectado ? args.form.description.length >= 10 : args.form.severity !== '';
  }
  if (args.step === 3) {
    return Boolean(args.form.location || args.form.useGps);
  }
  if (args.step === 4) {
    return args.disclaimerAccepted;
  }
  return false;
}

function createTrackingId(): string {
  return `CR-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export function useReportWizard() {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState<CitizenReportType | null>(null);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [reportId, setReportId] = useState('');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [form, setForm] = useState<ReportWizardForm>(INITIAL_REPORT_FORM);

  const isAfectado = reportType === 'afectado';
  const stepKeys = isAfectado ? AFECTADO_STEP_KEYS : TESTIGO_STEP_KEYS;
  const totalSteps = stepKeys.length;

  const canGoNext = useMemo(
    () => canProceed({ step, reportType, form, disclaimerAccepted }),
    [step, reportType, form, disclaimerAccepted],
  );

  function updateForm(patch: Partial<ReportWizardForm>): void {
    setForm((current) => ({ ...current, ...patch }));
  }

  function goBack(): void {
    if (step > 0) {
      setStep(step - 1);
      return;
    }
    navigate('/');
  }

  function goNext(): void {
    if (!canGoNext || step >= totalSteps - 1) {
      return;
    }
    setStep(step + 1);
  }

  function handleSubmit(): void {
    if (submitted || !canGoNext) {
      return;
    }
    setReportId(createTrackingId());
    setSubmitted(true);
  }

  return {
    reportType,
    setReportType,
    step,
    submitted,
    reportId,
    disclaimerAccepted,
    setDisclaimerAccepted,
    form,
    updateForm,
    isAfectado,
    stepKeys,
    totalSteps,
    canProceed: canGoNext,
    goBack,
    goNext,
    handleSubmit,
    goToMyReports: () => navigate('/mis-reportes'),
    goHome: () => navigate('/'),
  };
}
