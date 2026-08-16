import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { TFunction } from 'i18next';
import type { CitizenReportType, EmergencyType, Prioridad, Report } from '@/shared/types';
import type { ReporteDetalle } from '@/shared/types/contrato';
import { useRegistrarReporte, type ExtrasCiudadano } from '@/shared/hooks/useReportesDemo';
import type { EstadoNavegacionSeguimiento } from './useSeguimientoReporte';

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

/**
 * Genera el código público del reporte con el formato del contrato: `RPT-AAAA-MM-DD-NNNN`.
 *
 * Se llama una sola vez al enviar. El consecutivo real lo asigna el backend; mientras tanto es
 * aleatorio, pero nunca puede recalcularse en un render: el ciudadano vería un código distinto
 * cada vez.
 */
export function generarCodigoSeguimiento(fecha: Date): string {
  const anio = String(fecha.getFullYear());
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const consecutivo = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `RPT-${anio}-${mes}-${dia}-${consecutivo}`;
}

const PRIORIDAD_POR_GRAVEDAD: Record<ReportSeverity, Prioridad> = {
  leve: 'Baja',
  moderado: 'Media',
  grave: 'Alta',
};

/**
 * Coordenadas de la demo. La app todavía no lee el GPS del dispositivo, así que marcar «usar mi
 * ubicación» ubica el reporte en el punto de referencia de Bogotá en vez de dejarlo sin mapa.
 */
const COORDENADAS_DEMO = { lat: 4.710989, lng: -74.072092 };

/** Arma el reporte que verá el ciudadano en el seguimiento apenas envía el formulario. */
function construirReporte(args: {
  codigo: string;
  reportType: CitizenReportType;
  tipo: EmergencyType;
  form: ReportWizardForm;
  ahora: Date;
  t: TFunction;
}): Report {
  const { codigo, reportType, tipo, form, ahora, t } = args;
  const esAfectado = reportType === 'afectado';
  const fecha = ahora.toISOString();
  const gravedad = form.severity === '' ? null : form.severity;

  return {
    id: codigo,
    type: tipo,
    reportType,
    title: t(`emergencyType.${tipo}`),
    description: form.description,
    status: 'Reportado',
    // Quien se declara afectado entra como prioridad alta hasta que una entidad lo verifique.
    prioridad: esAfectado || gravedad === null ? 'Alta' : PRIORIDAD_POR_GRAVEDAD[gravedad],
    trustLevel: 'autorreportado',
    location: form.location.trim() === '' ? t('wizard.created.gpsLocation') : form.location.trim(),
    coordinates: COORDENADAS_DEMO,
    createdAt: fecha,
    updatedAt: fecha,
    satelliteVerified: false,
    timeline: [
      {
        id: `${codigo}-1`,
        date: fecha,
        title: t('wizard.created.timelineTitle'),
        description: t('wizard.created.timelineBody'),
        type: 'report',
      },
    ],
    contactPhone: esAfectado ? form.contactPhone : undefined,
    householdSize: esAfectado ? form.householdSize : undefined,
    isHabitable: esAfectado ? form.isHabitable : undefined,
    urgentNeed: esAfectado ? form.urgentNeed : undefined,
  };
}

/** Municipio de la demo: el asistente todavía no pregunta por él y el contrato lo exige. */
const MUNICIPIO_DEMO = 'Bogotá';

/** Quién firma el reporte en la demo. En producción sale del token, nunca del cliente. */
const REPORTADO_POR_DEMO = 'María R.';

/**
 * Arma el reporte con la forma del contrato para sumarlo al estado compartido.
 *
 * Es lo que hace que el reporte aparezca en «Mis reportes» y en la cola del gestor: sin esto el
 * código generado no existiría en ninguna fuente de datos y la cadena del pitch se cortaría aquí.
 */
function construirDetalle(reporte: Report, t: TFunction): ReporteDetalle {
  return {
    codigo: reporte.id,
    tipo: reporte.type,
    // Un testigo puede enviar sin describir: antes que dejar la fila en blanco, va el tipo.
    descripcion: reporte.description.trim() === '' ? reporte.title : reporte.description.trim(),
    latitud: reporte.coordinates.lat,
    longitud: reporte.coordinates.lng,
    direccion: reporte.location,
    municipio: MUNICIPIO_DEMO,
    urlFoto: null,
    estado: 'Reportado',
    prioridad: reporte.prioridad,
    creadoEn: reporte.createdAt,
    reportadoPor: REPORTADO_POR_DEMO,
    cronologia: [
      {
        estado: 'Reportado',
        nota: t('wizard.created.timelineBody'),
        fecha: reporte.createdAt,
        responsable: t('wizard.created.timelineResponsable'),
      },
    ],
    verificacionSatelital: null,
    transparencia: [],
  };
}

/** Los datos que el ciudadano declaró y que el contrato todavía no transporta. */
function extraerExtras(reporte: Report): ExtrasCiudadano {
  return {
    reportType: reporte.reportType,
    contactPhone: reporte.contactPhone,
    householdSize: reporte.householdSize,
    isHabitable: reporte.isHabitable,
    urgentNeed: reporte.urgentNeed,
  };
}

export function useReportWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const registrarReporte = useRegistrarReporte();
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

  /**
   * Cierra el reporte: genera el código una sola vez, lo suma al estado compartido y lleva al
   * ciudadano a su seguimiento.
   *
   * Registrarlo es lo que abre la cadena del pitch: desde aquí el reporte ya existe para «Mis
   * reportes» y para la cola del gestor. Además viaja en el estado de navegación, que es lo único
   * que le dice al seguimiento que se acaba de crear para mostrar el aviso de confirmación.
   */
  function handleSubmit(): void {
    if (submitted || !canGoNext || reportType === null || form.type === '') {
      return;
    }
    const ahora = new Date();
    const codigo = generarCodigoSeguimiento(ahora);
    const reporteCreado = construirReporte({
      codigo,
      reportType,
      tipo: form.type,
      form,
      ahora,
      t,
    });

    registrarReporte(construirDetalle(reporteCreado, t), extraerExtras(reporteCreado));

    setReportId(codigo);
    setSubmitted(true);
    navigate(`/reportes/${codigo}`, {
      state: { reporteCreado } satisfies EstadoNavegacionSeguimiento,
    });
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
  };
}
