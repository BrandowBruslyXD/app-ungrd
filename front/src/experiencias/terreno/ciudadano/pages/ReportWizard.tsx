import { Trans, useTranslation } from 'react-i18next';
import {
  Droplets,
  Mountain,
  Flame,
  AlertTriangle,
  Camera,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Check,
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

const emergencyTypeMeta: { type: EmergencyType; icon: typeof Droplets; color: string }[] = [
  { type: 'Inundacion', icon: Droplets, color: 'border-ungrd-200 bg-ungrd-50 text-ungrd-700 hover:border-ungrd-400' },
  { type: 'Deslizamiento', icon: Mountain, color: 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400' },
  { type: 'Incendio', icon: Flame, color: 'border-red-200 bg-red-50 text-red-700 hover:border-red-400' },
  { type: 'ViaAfectada', icon: MapPin, color: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400' },
  { type: 'ColapsoEstructural', icon: AlertTriangle, color: 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-400' },
  { type: 'Otro', icon: AlertTriangle, color: 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400' },
];

export default function ReportWizard() {
  const { t } = useTranslation();
  const wizard = useReportWizard();
  const {
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
    canProceed,
    goBack,
    goNext,
    handleSubmit,
    goToMyReports,
    goHome,
  } = wizard;

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center animate-scale-in">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">
          {isAfectado ? t('wizard.submitted.affectedTitle') : t('wizard.submitted.witnessTitle')}
        </h1>
        <p className="mt-3 text-base text-slate-500 leading-relaxed">
          {isAfectado ? t('wizard.submitted.affectedBody') : t('wizard.submitted.witnessBody')}
        </p>
        <div className="mt-6 card p-5">
          <p className="text-sm text-slate-500">{t('wizard.submitted.trackingNumber')}</p>
          <p className="mt-1 text-2xl font-bold text-ungrd-600 tracking-wide">{reportId}</p>
          <p className="mt-2 text-xs text-slate-400">{t('wizard.submitted.saveNumber')}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
            <ShieldAlert className="h-3 w-3" />
            {t('wizard.submitted.selfReported')}
          </div>
        </div>
        {isAfectado && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-left">
            <p className="text-sm font-semibold text-blue-800">{t('wizard.submitted.remember')}</p>
            <p className="mt-1 text-sm text-blue-700 leading-relaxed">{t('wizard.submitted.rememberBody')}</p>
          </div>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={goToMyReports} className="btn-primary">
            {t('wizard.submitted.seeMyReports')}
          </button>
          <button type="button" onClick={goHome} className="btn-secondary">
            {t('wizard.submitted.backHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:py-12 animate-fade-in">
      {step > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {stepKeys.slice(1).map((key, index) => {
              const number = index + 1;
              return (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                      step === number
                        ? 'bg-ungrd-600 text-white shadow-sm'
                        : step > number
                          ? 'bg-gold-100 text-gold-700'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step > number ? <Check className="h-4 w-4" /> : number}
                  </div>
                  <span
                    className={`hidden text-sm font-medium sm:block ${
                      step === number ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {t(`wizard.steps.${key}`)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-ungrd-600 transition-all duration-500"
              style={{ width: `${((step - 1) / (totalSteps - 2)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {step === 0 && (
        <div className="animate-slide-up">
          <h2 className="text-xl font-bold text-slate-800 lg:text-2xl">{t('wizard.type.title')}</h2>
          <p className="mt-2 text-sm text-slate-500">{t('wizard.type.subtitle')}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setReportType('testigo')}
              className={`flex flex-col items-start gap-4 rounded-2xl border-2 p-6 text-left transition-all duration-200 ${
                reportType === 'testigo'
                  ? 'border-ungrd-400 bg-ungrd-50 ring-2 ring-ungrd-200 scale-[1.02]'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                reportType === 'testigo' ? 'bg-ungrd-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <Eye className="h-7 w-7" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">{t('wizard.type.witnessTitle')}</p>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">{t('wizard.type.witnessBody')}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                reportType === 'testigo' ? 'bg-ungrd-100 text-ungrd-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {t('wizard.type.witnessBadge')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setReportType('afectado')}
              className={`flex flex-col items-start gap-4 rounded-2xl border-2 p-6 text-left transition-all duration-200 ${
                reportType === 'afectado'
                  ? 'border-red-400 bg-red-50 ring-2 ring-red-200 scale-[1.02]'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                reportType === 'afectado' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <Home className="h-7 w-7" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">{t('wizard.type.affectedTitle')}</p>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">{t('wizard.type.affectedBody')}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                reportType === 'afectado' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {t('wizard.type.affectedBadge')}
              </span>
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="animate-slide-up">
          <h2 className="text-xl font-bold text-slate-800 lg:text-2xl">
            {isAfectado ? t('wizard.emergency.affectedTitle') : t('wizard.emergency.witnessTitle')}
          </h2>
          <p className="mt-2 text-sm text-slate-500">{t('wizard.emergency.subtitle')}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {emergencyTypeMeta.map(({ type, icon: Icon, color }) => (
              <button
                key={type}
                type="button"
                onClick={() => updateForm({ type })}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all duration-200 ${
                  form.type === type
                    ? `${color} border-current ring-2 ring-current/20 scale-[1.02]`
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-7 w-7" />
                <span className="text-sm font-semibold">{t(`emergencyType.${type}`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-slide-up">
          <h2 className="text-xl font-bold text-slate-800 lg:text-2xl">
            {isAfectado ? t('wizard.details.affectedTitle') : t('wizard.details.witnessTitle')}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {isAfectado ? t('wizard.details.affectedSubtitle') : t('wizard.details.witnessSubtitle')}
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="report-description" className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('wizard.details.description')}
              </label>
              <textarea
                id="report-description"
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder={isAfectado ? t('wizard.details.placeholderAffected') : t('wizard.details.placeholderWitness')}
                rows={4}
                className="textarea-field text-base"
              />
              <p className="mt-1 text-xs text-slate-400" aria-live="polite">
                {form.description.length < 10
                  ? t('wizard.details.minChars', { count: form.description.length })
                  : t('wizard.details.goodDescription')}
              </p>
            </div>

            {isAfectado && (
              <>
                <div>
                  <label htmlFor="contact-phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Phone className="mr-1 inline h-4 w-4" />
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
                  <p id="household-size-label" className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Users className="mr-1 inline h-4 w-4" />
                    {t('wizard.details.householdSize')}
                  </p>
                  <div className="flex items-center gap-3" role="group" aria-labelledby="household-size-label">
                    <button
                      type="button"
                      onClick={() => updateForm({ householdSize: Math.max(1, form.householdSize - 1) })}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                      aria-label={t('wizard.details.decreaseHousehold')}
                    >
                      -
                    </button>
                    <span className="w-12 text-center text-lg font-bold text-slate-800" aria-live="polite">
                      {form.householdSize}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateForm({ householdSize: form.householdSize + 1 })}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                      aria-label={t('wizard.details.increaseHousehold')}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <p className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Home className="mr-1 inline h-4 w-4" />
                    {t('wizard.details.isHabitable')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateForm({ isHabitable: true })}
                      className={`rounded-xl border-2 p-3 text-center transition-all ${
                        form.isHabitable
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-sm font-semibold">{t('wizard.details.habitableYes')}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm({ isHabitable: false })}
                      className={`rounded-xl border-2 p-3 text-center transition-all ${
                        !form.isHabitable
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-sm font-semibold">{t('wizard.details.habitableNo')}</p>
                    </button>
                  </div>
                </div>

                <div>
                  <p className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Heart className="mr-1 inline h-4 w-4" />
                    {t('wizard.details.urgentNeed')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
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
                        className={`rounded-xl border-2 p-3 text-left text-sm transition-all ${
                          form.urgentNeed === value
                            ? 'border-ungrd-400 bg-ungrd-50 text-ungrd-700 font-semibold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                  <p className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t('wizard.details.howSevere')}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'leve', labelKey: 'wizard.details.severityMild', descKey: 'wizard.details.severityMildDesc', color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
                      { value: 'moderado', labelKey: 'wizard.details.severityModerate', descKey: 'wizard.details.severityModerateDesc', color: 'border-gold-300 bg-gold-50 text-gold-800' },
                      { value: 'grave', labelKey: 'wizard.details.severitySevere', descKey: 'wizard.details.severitySevereDesc', color: 'border-red-200 bg-red-50 text-red-700' },
                    ] as const).map(({ value, labelKey, descKey, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateForm({ severity: value })}
                        className={`rounded-xl border-2 p-3 text-center transition-all ${
                          form.severity === value
                            ? `${color} border-current`
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <p className="text-sm font-semibold">{t(labelKey)}</p>
                        <p className="text-xs mt-0.5 opacity-75">{t(descKey)}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t('wizard.details.photoOptional')}
                  </p>
                  <button
                    type="button"
                    onClick={() => updateForm({ hasPhoto: !form.hasPhoto })}
                    className={`flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors ${
                      form.hasPhoto
                        ? 'border-ungrd-300 bg-ungrd-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {form.hasPhoto ? (
                      <>
                        <Camera className="h-6 w-6 text-ungrd-600" />
                        <span className="text-sm font-medium text-ungrd-700">{t('wizard.details.photoSelected')}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-slate-400" />
                        <span className="text-sm text-slate-500">{t('wizard.details.photoUpload')}</span>
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
        <div className="animate-slide-up">
          <h2 className="text-xl font-bold text-slate-800 lg:text-2xl">
            {isAfectado ? t('wizard.location.affectedTitle') : t('wizard.location.witnessTitle')}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {isAfectado ? t('wizard.location.affectedSubtitle') : t('wizard.location.witnessSubtitle')}
          </p>

          <div className="mt-6 space-y-4">
            <button
              type="button"
              onClick={() => updateForm({ useGps: !form.useGps, location: '' })}
              className={`flex w-full items-center gap-4 rounded-2xl border-2 p-5 transition-all ${
                form.useGps
                  ? 'border-ungrd-400 bg-ungrd-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                form.useGps ? 'bg-ungrd-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                <LocateFixed className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className={`font-semibold ${form.useGps ? 'text-ungrd-700' : 'text-slate-700'}`}>
                  {t('wizard.location.useGps')}
                </p>
                <p className="text-sm text-slate-500">
                  {form.useGps ? t('wizard.location.gpsDetected') : t('wizard.location.gpsHint')}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-400">{t('wizard.location.orAddress')}</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div>
              <label htmlFor="report-location" className="sr-only">
                {t('wizard.location.addressLabel')}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  id="report-location"
                  type="text"
                  value={form.location}
                  onChange={(e) => updateForm({ location: e.target.value, useGps: false })}
                  placeholder={isAfectado ? t('wizard.location.placeholderAffected') : t('wizard.location.placeholderWitness')}
                  className="input-field pl-10"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                {isAfectado ? t('wizard.location.hintAffected') : t('wizard.location.hintWitness')}
              </p>
            </div>

            {isAfectado && (
              <div>
                <p className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('wizard.location.damagePhoto')}
                </p>
                <button
                  type="button"
                  onClick={() => updateForm({ hasPhoto: !form.hasPhoto })}
                  className={`flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors ${
                    form.hasPhoto
                      ? 'border-ungrd-300 bg-ungrd-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {form.hasPhoto ? (
                    <>
                      <Camera className="h-6 w-6 text-ungrd-600" />
                      <span className="text-sm font-medium text-ungrd-700">{t('wizard.details.photoSelected')}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-slate-400" />
                      <span className="text-sm text-slate-500">{t('wizard.location.damagePhotoUpload')}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 4 && isAfectado && (
        <div className="animate-slide-up">
          <h2 className="text-xl font-bold text-slate-800 lg:text-2xl">{t('wizard.disclaimer.title')}</h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200">
                  <ShieldAlert className="h-5 w-5 text-amber-800" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-900">{t('wizard.disclaimer.notCensusTitle')}</h3>
                  <div className="mt-3 space-y-3 text-sm text-amber-800 leading-relaxed">
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

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h4 className="text-sm font-bold text-slate-700">{t('wizard.disclaimer.whatNext')}</h4>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                {(['step1', 'step2', 'step3', 'step4'] as const).map((key, index) => (
                  <li key={key} className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ungrd-100 text-xs font-bold text-ungrd-700">
                      {index + 1}
                    </span>
                    {t(`wizard.disclaimer.${key}`)}
                  </li>
                ))}
              </ol>
            </div>

            <label htmlFor="disclaimer-accepted" className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100">
              <input
                id="disclaimer-accepted"
                type="checkbox"
                checked={disclaimerAccepted}
                onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-slate-300 text-ungrd-600 focus:ring-ungrd-500"
              />
              <span className="text-sm text-slate-700 leading-relaxed">
                <Trans i18nKey="wizard.disclaimer.accept" components={{ strong: <strong /> }} />
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <button type="button" onClick={goBack} className="btn-ghost gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          {step > 0 ? t('wizard.nav.back') : t('wizard.nav.cancel')}
        </button>

        {step < totalSteps - 1 ? (
          <button type="button" onClick={goNext} disabled={!canProceed} className="btn-primary">
            {t('wizard.nav.next')}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed}
            className={isAfectado ? 'btn-danger' : 'btn-primary'}
          >
            {isAfectado ? t('wizard.nav.submitVisit') : t('wizard.nav.submitNotice')}
            <AlertTriangle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
