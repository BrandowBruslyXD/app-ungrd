import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CitizenReportType, EmergencyType } from '@/types';
import type { Coordenadas } from '@/components/ui/MapaUbicacion';
import { guardarRegistro } from '@/lib/almacenamiento';

export type ReportSeverity = 'leve' | 'moderado' | 'grave';

/**
 * Las cuatro necesidades del EDAN, con los nombres que entiende la gente.
 *
 * El valor guardado es la categoría oficial (`AHE alimentaria`, `AHE no
 * alimentaria`, materiales de rehabilitación y subsidio de arriendo) para que el
 * dato no haya que traducirlo a mano río abajo. Lo que cambia es el rótulo, que
 * usa las mismas palabras del guion de la línea telefónica: «alimentos y agua,
 * cobijas y aseo, materiales para reparar, o un lugar donde dormir». Así la
 * persona oye lo mismo por teléfono que lo que lee en pantalla.
 */
export const NECESIDADES_URGENTES = [
  'ahe_alimentaria',
  'ahe_no_alimentaria',
  'materiales_rehabilitacion',
  'subsidio_arriendo',
] as const;

export type NecesidadUrgente = (typeof NECESIDADES_URGENTES)[number];

/** Tope de la foto. El servidor tiene que volver a validarlo: esto es cortesía. */
export const TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024;

export interface ReportWizardForm {
  type: EmergencyType | '';
  description: string;
  severity: ReportSeverity | '';
  /** Nombre del archivo escogido. Vacío si no hay foto. */
  photoName: string;
  /** URL temporal para la vista previa. No se persiste. */
  photoPreview: string;
  location: string;
  /** Punto marcado en el mapa. Vale por sí solo, sin necesidad de dirección. */
  coordinates: Coordenadas | null;
  contactPhone: string;
  householdSize: number;
  isHabitable: boolean;
  urgentNeed: NecesidadUrgente | '';
}

export const INITIAL_REPORT_FORM: ReportWizardForm = {
  type: '',
  description: '',
  severity: '',
  photoName: '',
  photoPreview: '',
  location: '',
  coordinates: null,
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
    // Sirve cualquiera de las dos: un punto en el mapa o una dirección escrita.
    // En vereda muchas veces no hay dirección, y en un barrio el GPS falla bajo
    // techo. Exigir las dos dejaría a alguien sin poder reportar.
    return Boolean(args.form.location.trim() || args.form.coordinates);
  }
  if (args.step === 4) {
    return args.disclaimerAccepted;
  }
  return false;
}

/**
 * Lo que se guarda de un reporte ciudadano.
 *
 * Se separa del formulario porque el tipo de reporte —testigo o afectado— vive
 * fuera de `ReportWizardForm` y sin él el dato no se puede clasificar después.
 */
export interface ReporteGuardado extends ReportWizardForm {
  reportType: CitizenReportType;
}

export function useReportWizard() {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState<CitizenReportType | null>(null);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [reportId, setReportId] = useState('');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [noSePudoGuardar, setNoSePudoGuardar] = useState(false);
  const [errorFoto, setErrorFoto] = useState<'' | 'tipo' | 'tamano'>('');
  const yaEnviado = useRef(false);
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

  /**
   * Acepta la foto solo si es una imagen y no pasa de 5 MB.
   *
   * Las dos comprobaciones son de cortesía —el servidor tiene que repetirlas—
   * pero aquí evitan que alguien en una conexión mala espere una subida de
   * 40 MB que iba a fallar de todos modos.
   */
  function seleccionarFoto(archivo: File | null): void {
    if (!archivo) {
      setErrorFoto('');
      updateForm({ photoName: '', photoPreview: '' });
      return;
    }

    if (!archivo.type.startsWith('image/')) {
      setErrorFoto('tipo');
      return;
    }

    if (archivo.size > TAMANO_MAXIMO_FOTO) {
      setErrorFoto('tamano');
      return;
    }

    setErrorFoto('');
    updateForm({ photoName: archivo.name, photoPreview: URL.createObjectURL(archivo) });
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
  /*
   * La guarda va en una referencia, no en el estado.
   *
   * `submitted` es estado de React y se actualiza por lotes: dos toques dentro
   * del mismo ciclo —lo que pasa con un doble toque real, o con un guante
   * mojado sobre la pantalla— veian ambos `submitted === false` y guardaban dos
   * registros del mismo hecho. Una referencia cambia en el acto.
   */
    if (yaEnviado.current || !canGoNext || reportType === null) {
      return;
    }
    yaEnviado.current = true;


    // Se guarda antes de enseñar el código: si el código existe, el reporte
    // existe. Al revés le entregaríamos a la persona un número que no consulta
    // nada, que es justo lo que el guion del agente telefónico prohíbe hacer.
    const { registro, persistido } = guardarRegistro<ReporteGuardado>('reporte', {
      ...form,
      reportType,
    });

    setReportId(registro.codigo);
    setNoSePudoGuardar(!persistido);
    setSubmitted(true);
  }

  return {
    reportType,
    setReportType,
    step,
    submitted,
    reportId,
    noSePudoGuardar,
    disclaimerAccepted,
    setDisclaimerAccepted,
    form,
    updateForm,
    seleccionarFoto,
    errorFoto,
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
