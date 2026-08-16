import { Trans, useTranslation } from 'react-i18next';
import {
  Droplets,
  Mountain,
  Flame,
  AlertTriangle,
  Camera,
  MapPin,
  ArrowRight,
  Upload,
  LocateFixed,
  Eye,
  Home,
  ShieldAlert,
  Phone,
  Users,
  Heart,
} from 'lucide-react';
import type { EmergencyType } from '@/shared/types';
import { useReportWizard } from '@/experiencias/terreno/ciudadano/hooks/useReportWizard';
import PasosAsistente from '@/experiencias/terreno/comunes/PasosAsistente';
import PieAsistente from '@/experiencias/terreno/comunes/PieAsistente';
import Contador from '@/experiencias/terreno/comunes/Contador';

const emergencyTypeMeta: { type: EmergencyType; icon: typeof Droplets; color: string }[] = [
  { type: 'Inundacion', icon: Droplets, color: 'border-ungrd-200 bg-ungrd-50 text-ungrd-700 hover:border-ungrd-400' },
  { type: 'Deslizamiento', icon: Mountain, color: 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400' },
  { type: 'Incendio', icon: Flame, color: 'border-red-200 bg-red-50 text-red-700 hover:border-red-400' },
  { type: 'ViaAfectada', icon: MapPin, color: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400' },
  { type: 'ColapsoEstructural', icon: AlertTriangle, color: 'border-orange-200 bg-orange-50 text-orange-800 hover:border-orange-400' },
  { type: 'Otro', icon: AlertTriangle, color: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400' },
];

export default function ReportWizard() {
  const { t } = useTranslation();
  const wizard = useReportWizard();
  const {
    reportType,
    setReportType,
    step,
    disclaimerAccepted,
    setDisclaimerAccepted,
    form,
    updateForm,
    isAfectado,
    stepKeys,
    totalSteps,
    canProceed,
    goBack,
    goNext,
    handleSubmit,
  } = wizard;

  // El primer paso elige testigo o afectado y no cuenta como paso del formulario: la barra de
  // progreso empieza cuando el ciudadano ya sabe qué está llenando.
  const pasos = stepKeys.slice(1).map((key) => ({
    clave: key,
    etiqueta: t(`wizard.steps.${key}`),
    etiquetaCorta: t(`wizard.stepsShort.${key}`),
  }));

  // Al enviar no hay pantalla de confirmación: el asistente lleva directo al seguimiento del
  // reporte, que es donde el ciudadano ve avanzar su caso.
  return (
    <div className="space-y-6 animate-fade-in">
      {step > 0 && <PasosAsistente pasos={pasos} actual={step} />}

      {step === 0 && (
        <div className="animate-slide-up space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('wizard.type.title')}</h1>
            <p className="mt-2 text-base text-slate-600">{t('wizard.type.subtitle')}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setReportType('testigo')}
              className={`flex flex-col items-start gap-4 rounded-2xl border-2 p-6 text-left transition-all duration-200 ${
                reportType === 'testigo'
                  ? 'border-ungrd-500 bg-ungrd-50 ring-2 ring-ungrd-200'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                reportType === 'testigo' ? 'bg-ungrd-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <Eye className="h-7 w-7" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xl font-bold text-slate-900">{t('wizard.type.witnessTitle')}</span>
                <span className="mt-1 block text-base leading-relaxed text-slate-600">{t('wizard.type.witnessBody')}</span>
              </span>
              <span className={`badge badge-lg ${
                reportType === 'testigo' ? 'bg-ungrd-100 text-ungrd-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {t('wizard.type.witnessBadge')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setReportType('afectado')}
              className={`flex flex-col items-start gap-4 rounded-2xl border-2 p-6 text-left transition-all duration-200 ${
                reportType === 'afectado'
                  ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                reportType === 'afectado' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <Home className="h-7 w-7" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xl font-bold text-slate-900">{t('wizard.type.affectedTitle')}</span>
                <span className="mt-1 block text-base leading-relaxed text-slate-600">{t('wizard.type.affectedBody')}</span>
              </span>
              <span className={`badge badge-lg ${
                reportType === 'afectado' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {t('wizard.type.affectedBadge')}
              </span>
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="animate-slide-up space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isAfectado ? t('wizard.emergency.affectedTitle') : t('wizard.emergency.witnessTitle')}
            </h1>
            <p className="mt-2 text-base text-slate-600">{t('wizard.emergency.subtitle')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {emergencyTypeMeta.map(({ type, icon: Icon, color }) => (
              <button
                key={type}
                type="button"
                onClick={() => updateForm({ type })}
                aria-pressed={form.type === type}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all duration-200 ${
                  form.type === type
                    ? `${color} border-current ring-2 ring-current/20`
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-8 w-8" aria-hidden="true" />
                <span className="text-base font-semibold">{t(`emergencyType.${type}`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-slide-up space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isAfectado ? t('wizard.details.affectedTitle') : t('wizard.details.witnessTitle')}
            </h1>
            <p className="mt-2 text-base text-slate-600">
              {isAfectado ? t('wizard.details.affectedSubtitle') : t('wizard.details.witnessSubtitle')}
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="report-description" className="field-label">
                {t('wizard.details.description')}
              </label>
              <textarea
                id="report-description"
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder={isAfectado ? t('wizard.details.placeholderAffected') : t('wizard.details.placeholderWitness')}
                rows={4}
                className="textarea-field"
              />
              <p className="field-hint" aria-live="polite">
                {form.description.length < 10
                  ? t('wizard.details.minChars', { count: form.description.length })
                  : t('wizard.details.goodDescription')}
              </p>
            </div>

            {isAfectado && (
              <>
                <div>
                  <label htmlFor="contact-phone" className="field-label">
                    <Phone className="mr-1 inline h-4 w-4" aria-hidden="true" />
                    {t('wizard.details.contactPhone')}
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => updateForm({ contactPhone: e.target.value })}
                    placeholder={t('wizard.details.phonePlaceholder')}
                    className="input-field"
                  />
                </div>

                <div>
                  <p id="household-size-label" className="field-label">
                    <Users className="mr-1 inline h-4 w-4" aria-hidden="true" />
                    {t('wizard.details.householdSize')}
                  </p>
                  <div role="group" aria-labelledby="household-size-label">
                    <Contador
                      valor={form.householdSize}
                      onCambiar={(delta) => updateForm({ householdSize: Math.max(1, form.householdSize + delta) })}
                      enMinimo={form.householdSize <= 1}
                      etiquetaDisminuir={t('wizard.details.decreaseHousehold')}
                      etiquetaAumentar={t('wizard.details.increaseHousehold')}
                    />
                  </div>
                </div>

                <div>
                  <p className="field-label">
                    <Home className="mr-1 inline h-4 w-4" aria-hidden="true" />
                    {t('wizard.details.isHabitable')}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateForm({ isHabitable: true })}
                      aria-pressed={form.isHabitable}
                      className={`rounded-xl border-2 p-3 text-center text-base font-semibold transition-all min-h-toque ${
                        form.isHabitable
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t('wizard.details.habitableYes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm({ isHabitable: false })}
                      aria-pressed={!form.isHabitable}
                      className={`rounded-xl border-2 p-3 text-center text-base font-semibold transition-all min-h-toque ${
                        !form.isHabitable
                          ? 'border-red-500 bg-red-50 text-red-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t('wizard.details.habitableNo')}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="field-label">
                    <Heart className="mr-1 inline h-4 w-4" aria-hidden="true" />
                    {t('wizard.details.urgentNeed')}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: 'alimentos', labelKey: 'wizard.details.needFood' },
                      { value: 'albergue', labelKey: 'wizard.details.needShelter' },
                      { value: 'medica', labelKey: 'wizard.details.needMedical' },
                      { value: 'rescate', labelKey: 'wizard.details.needRescue' },
                    ] as const).map(({ value, labelKey }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateForm({ urgentNeed: value })}
                        aria-pressed={form.urgentNeed === value}
                        className={`rounded-xl border-2 p-3 text-left text-base transition-all min-h-toque ${
                          form.urgentNeed === value
                            ? 'border-ungrd-500 bg-ungrd-50 font-semibold text-ungrd-800'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {t(labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!isAfectado && (
              <>
                <div>
                  <p className="field-label">
                    {t('wizard.details.howSevere')}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'leve', labelKey: 'wizard.details.severityMild', descKey: 'wizard.details.severityMildDesc', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                      { value: 'moderado', labelKey: 'wizard.details.severityModerate', descKey: 'wizard.details.severityModerateDesc', color: 'border-gold-500 bg-gold-50 text-gold-900' },
                      { value: 'grave', labelKey: 'wizard.details.severitySevere', descKey: 'wizard.details.severitySevereDesc', color: 'border-red-500 bg-red-50 text-red-800' },
                    ] as const).map(({ value, labelKey, descKey, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateForm({ severity: value })}
                        aria-pressed={form.severity === value}
                        className={`rounded-xl border-2 p-3 text-center transition-all ${
                          form.severity === value
                            ? color
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-base font-semibold">{t(labelKey)}</span>
                        <span className="mt-0.5 block text-sm leading-snug opacity-90">{t(descKey)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="field-label">
                    {t('wizard.details.photoOptional')}
                  </p>
                  <button
                    type="button"
                    onClick={() => updateForm({ hasPhoto: !form.hasPhoto })}
                    aria-pressed={form.hasPhoto}
                    className={`flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors ${
                      form.hasPhoto
                        ? 'border-ungrd-400 bg-ungrd-50'
                        : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {form.hasPhoto ? (
                      <>
                        <Camera className="h-6 w-6 text-ungrd-600" aria-hidden="true" />
                        <span className="text-base font-semibold text-ungrd-700">{t('wizard.details.photoSelected')}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-slate-500" aria-hidden="true" />
                        <span className="text-base text-slate-700">{t('wizard.details.photoUpload')}</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-slide-up space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isAfectado ? t('wizard.location.affectedTitle') : t('wizard.location.witnessTitle')}
            </h1>
            <p className="mt-2 text-base text-slate-600">
              {isAfectado ? t('wizard.location.affectedSubtitle') : t('wizard.location.witnessSubtitle')}
            </p>
          </div>

          <div className="space-y-5">
            <button
              type="button"
              onClick={() => updateForm({ useGps: !form.useGps, location: '' })}
              aria-pressed={form.useGps}
              className={`flex w-full items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                form.useGps ? 'border-ungrd-500 bg-ungrd-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                form.useGps ? 'bg-ungrd-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <LocateFixed className="h-6 w-6" aria-hidden="true" />
              </span>
              <span>
                <span className={`block text-base font-semibold ${form.useGps ? 'text-ungrd-800' : 'text-slate-800'}`}>
                  {t('wizard.location.useGps')}
                </span>
                <span className="mt-0.5 block text-base text-slate-600">
                  {form.useGps ? t('wizard.location.gpsDetected') : t('wizard.location.gpsHint')}
                </span>
              </span>
            </button>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-600">{t('wizard.location.orAddress')}</span>
              <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
            </div>

            <div>
              <label htmlFor="report-location" className="field-label">
                {t('wizard.location.addressLabel')}
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <input
                  id="report-location"
                  type="text"
                  value={form.location}
                  onChange={(e) => updateForm({ location: e.target.value, useGps: false })}
                  placeholder={isAfectado ? t('wizard.location.placeholderAffected') : t('wizard.location.placeholderWitness')}
                  className="input-field pl-10"
                />
              </div>
              <p className="mt-1.5 text-sm text-slate-600">
                {isAfectado ? t('wizard.location.hintAffected') : t('wizard.location.hintWitness')}
              </p>
            </div>

            {isAfectado && (
              <div>
                <p className="field-label">
                  {t('wizard.location.damagePhoto')}
                </p>
                <button
                  type="button"
                  onClick={() => updateForm({ hasPhoto: !form.hasPhoto })}
                  aria-pressed={form.hasPhoto}
                  className={`flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors ${
                    form.hasPhoto
                      ? 'border-ungrd-400 bg-ungrd-50'
                      : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {form.hasPhoto ? (
                    <>
                      <Camera className="h-6 w-6 text-ungrd-600" aria-hidden="true" />
                      <span className="text-base font-semibold text-ungrd-700">{t('wizard.details.photoSelected')}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-slate-500" aria-hidden="true" />
                      <span className="text-base text-slate-700">{t('wizard.location.damagePhotoUpload')}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 4 && isAfectado && (
        <div className="animate-slide-up space-y-6">
          <h1 className="text-2xl font-bold text-slate-900">{t('wizard.disclaimer.title')}</h1>

          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-200">
                  <ShieldAlert className="h-6 w-6 text-amber-900" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-amber-900">{t('wizard.disclaimer.notCensusTitle')}</h2>
                  <div className="mt-3 space-y-3 text-base leading-relaxed text-amber-900">
                    <p>
                      <Trans i18nKey="wizard.disclaimer.body1" components={{ strong: <strong /> }} />
                    </p>
                    <p>
                      <Trans i18nKey="wizard.disclaimer.body2" components={{ strong: <strong /> }} />
                    </p>
                    <p>
                      <Trans i18nKey="wizard.disclaimer.body3" components={{ strong: <strong /> }} />
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="text-lg font-semibold text-slate-900">{t('wizard.disclaimer.whatNext')}</h2>
              <ol className="mt-3 space-y-2.5 text-base leading-relaxed text-slate-700">
                {(['step1', 'step2', 'step3', 'step4'] as const).map((key, index) => (
                  <li key={key} className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ungrd-100 text-sm font-bold text-ungrd-800">
                      {index + 1}
                    </span>
                    {t(`wizard.disclaimer.${key}`)}
                  </li>
                ))}
              </ol>
            </div>

            <label
              htmlFor="disclaimer-accepted"
              className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 transition-colors hover:border-ungrd-300"
            >
              <input
                id="disclaimer-accepted"
                type="checkbox"
                checked={disclaimerAccepted}
                onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                className="mt-0.5 h-6 w-6 shrink-0 rounded border-slate-400 text-ungrd-600 focus:ring-ungrd-500"
              />
              <span className="text-base leading-relaxed text-slate-800">
                <Trans i18nKey="wizard.disclaimer.accept" components={{ strong: <strong /> }} />
              </span>
            </label>
          </div>
        </div>
      )}

      <PieAsistente atras={{ etiqueta: step > 0 ? t('wizard.nav.back') : t('wizard.nav.cancel'), onClick: goBack }}>
        {step < totalSteps - 1 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed}
            className="btn-primary btn-lg"
          >
            {t('wizard.nav.next')}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed}
            className={`${isAfectado ? 'btn-danger' : 'btn-primary'} btn-lg`}
          >
            {isAfectado ? t('wizard.nav.submitVisit') : t('wizard.nav.submitNotice')}
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </PieAsistente>
    </div>
  );
}
