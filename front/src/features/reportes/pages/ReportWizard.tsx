import { useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  Droplets,
  Mountain,
  Flame,
  AlertTriangle,
  Camera,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Home,
  Minus,
  Plus,
  X,
  Send,
  Utensils,
  BedDouble,
  Hammer,
  Building,
  Route,
  Activity,
  Wind,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { TIPOS_EMERGENCIA, type EmergencyType } from '@/types';
import {
  useReportWizard,
  type NecesidadUrgente,
  type ReportSeverity,
} from '@/features/reportes/hooks/useReportWizard';
import IndicadorPasos from '@/components/ui/IndicadorPasos';
import GrupoOpciones, { type Opcion } from '@/components/ui/GrupoOpciones';
import CampoTexto from '@/components/ui/CampoTexto';
import MapaUbicacion from '@/components/ui/MapaUbicacion';
import Aviso from '@/components/ui/Aviso';
import TalonSeguimiento from '@/components/ui/TalonSeguimiento';
import EscaleraConfianza from '@/components/ui/EscaleraConfianza';
import BotonCompartir from '@/components/ui/BotonCompartir';
import { useTituloPagina } from '@/hooks/useTituloPagina';

const ICONO_EMERGENCIA: Record<EmergencyType, LucideIcon> = {
  Inundacion: Droplets,
  Deslizamiento: Mountain,
  Incendio: Flame,
  ViaAfectada: Route,
  ColapsoEstructural: Building,
  Sismo: Activity,
  Vendaval: Wind,
  AvenidaTorrencial: Waves,
  Otro: AlertTriangle,
};

/**
 * Orden en que se le ofrecen al ciudadano.
 *
 * No es alfabético ni el del contrato: va de lo más frecuente en Colombia a lo
 * más raro, porque quien reporta está en emergencia y lo primero que ve debe ser
 * lo que probablemente le pasó. `Otro` cierra siempre la lista.
 *
 * Se ordena la lista canónica en vez de copiarla, para que un tipo nuevo aparezca
 * solo —al final, antes de `Otro`— y nunca quede fuera del formulario por
 * olvido.
 */
const PRIORIDAD: readonly EmergencyType[] = [
  'Inundacion',
  'Deslizamiento',
  'Vendaval',
  'AvenidaTorrencial',
  'Incendio',
  'ViaAfectada',
  'ColapsoEstructural',
  'Sismo',
];

const posicion = (tipo: EmergencyType): number => {
  if (tipo === 'Otro') return Number.MAX_SAFE_INTEGER;
  const indice = PRIORIDAD.indexOf(tipo);
  return indice === -1 ? PRIORIDAD.length : indice;
};

const TIPOS_ORDENADOS: readonly EmergencyType[] = [...TIPOS_EMERGENCIA].sort(
  (a, b) => posicion(a) - posicion(b)
);

const ICONO_NECESIDAD: Record<NecesidadUrgente, LucideIcon> = {
  ahe_alimentaria: Utensils,
  ahe_no_alimentaria: BedDouble,
  materiales_rehabilitacion: Hammer,
  subsidio_arriendo: Home,
};

export default function ReportWizard() {
  const { t } = useTranslation();
  const entradaFoto = useRef<HTMLInputElement>(null);
  const {
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
    canProceed,
    goBack,
    goNext,
    handleSubmit,
    goToMyReports,
    goHome,
  } = useReportWizard();

  useTituloPagina(t('meta.report.title'), t('meta.report.description'));

  /* ── Confirmación ───────────────────────────────────────────────────────
     El momento del talón. Es lo único que la persona se lleva, así que ocupa
     la pantalla entera y el código va primero, antes que cualquier felicitación. */
  if (submitted) {
    return (
      <div className="animate-scale-in mx-auto max-w-xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-seguro-100">
            <Check className="h-8 w-8 text-seguro-600" strokeWidth={3} aria-hidden="true" />
          </span>
          <h1 className="text-2xl">
            {isAfectado ? t('wizard.submitted.affectedTitle') : t('wizard.submitted.witnessTitle')}
          </h1>
        </div>

        {noSePudoGuardar && (
          <div className="mb-5">
            <Aviso tono="alerta" urgente>
              {t('wizard.submitted.couldNotSave')}
            </Aviso>
          </div>
        )}

        <TalonSeguimiento
          codigo={reportId}
          nivelConfianza="autorreportado"
          conAdvertenciaCenso={isAfectado}
        />

        <p className="mt-5 leading-relaxed text-tinta-700">
          {isAfectado ? t('wizard.submitted.affectedBody') : t('wizard.submitted.witnessBody')}
        </p>

        <div className="mt-6 ficha overflow-hidden">
          <div className="ficha-banda">
            <h2 className="text-lg font-bold text-white">{t('landing.trustTitle')}</h2>
          </div>
          <div className="p-4">
            <EscaleraConfianza nivel="autorreportado" />
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3">
          <button type="button" onClick={goToMyReports} className="btn-primary btn-grande">
            {t('wizard.submitted.seeMyReports')}
          </button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <BotonCompartir
              titulo={t('brand.conecta') + t('brand.riesgo')}
              texto={`${t('wizard.submitted.shareText')} ${reportId}`}
              className="flex-1"
            />
            <button type="button" onClick={goHome} className="btn-ghost flex-1">
              {t('wizard.submitted.backHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tituloPaso = t(`wizard.steps.${stepKeys[step]}`);

  return (
    /* pb-32 deja sitio a la barra fija de abajo para que no tape el contenido. */
    <div className="animate-fade-in mx-auto max-w-2xl px-4 pb-32 pt-6 lg:pb-12">
      {step > 0 && (
        <div className="mb-7">
          <IndicadorPasos paso={step} total={totalSteps - 1} titulo={tituloPaso} />
        </div>
      )}

      {/* ── Paso 0 · Quién reporta ─────────────────────────────────────── */}
      {step === 0 && (
        <div className="animate-slide-up">
          <h1 className="text-2xl sm:text-3xl">{t('wizard.type.title')}</h1>
          <p className="mt-2 text-lg text-tinta-600">{t('wizard.type.subtitle')}</p>

          <div className="mt-7 space-y-3">
            <button
              type="button"
              onClick={() => setReportType('afectado')}
              className={`flex w-full items-start gap-4 rounded-ficha border-2 p-5 text-left transition-colors ${
                reportType === 'afectado'
                  ? 'border-azul-600 bg-azul-50 ring-1 ring-azul-600'
                  : 'border-tinta-200 bg-white hover:border-tinta-300 hover:bg-tinta-50'
              }`}
            >
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-control ${
                  reportType === 'afectado' ? 'bg-azul-600 text-white' : 'bg-tinta-100 text-tinta-500'
                }`}
              >
                <Home className="h-7 w-7" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xl font-bold">{t('wizard.type.affectedTitle')}</span>
                <span className="mt-1 block leading-relaxed text-tinta-600">
                  {t('wizard.type.affectedBody')}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setReportType('testigo')}
              className={`flex w-full items-start gap-4 rounded-ficha border-2 p-5 text-left transition-colors ${
                reportType === 'testigo'
                  ? 'border-azul-600 bg-azul-50 ring-1 ring-azul-600'
                  : 'border-tinta-200 bg-white hover:border-tinta-300 hover:bg-tinta-50'
              }`}
            >
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-control ${
                  reportType === 'testigo' ? 'bg-azul-600 text-white' : 'bg-tinta-100 text-tinta-500'
                }`}
              >
                <Eye className="h-7 w-7" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xl font-bold">{t('wizard.type.witnessTitle')}</span>
                <span className="mt-1 block leading-relaxed text-tinta-600">
                  {t('wizard.type.witnessBody')}
                </span>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 1 · Qué pasó ──────────────────────────────────────────── */}
      {step === 1 && (
        <div className="animate-slide-up">
          <GrupoOpciones<EmergencyType>
            titulo={isAfectado ? t('wizard.emergency.affectedTitle') : t('wizard.emergency.witnessTitle')}
            ayuda={t('wizard.emergency.subtitle')}
            columnas={2}
            valor={form.type}
            onChange={(type) => updateForm({ type })}
            opciones={TIPOS_ORDENADOS.map<Opcion<EmergencyType>>((type) => ({
              valor: type,
              etiqueta: t(`emergencyType.${type}`),
              icono: ICONO_EMERGENCIA[type],
            }))}
          />
        </div>
      )}

      {/* ── Paso 2 · Detalles ──────────────────────────────────────────── */}
      {step === 2 && (
        <div className="animate-slide-up space-y-7">
          <div>
            <h2 className="text-xl sm:text-2xl">
              {isAfectado ? t('wizard.details.affectedTitle') : t('wizard.details.witnessTitle')}
            </h2>
            <p className="mt-2 text-tinta-600">
              {isAfectado ? t('wizard.details.affectedSubtitle') : t('wizard.details.witnessSubtitle')}
            </p>
          </div>

          <CampoTexto
            etiqueta={t('wizard.details.description')}
            valor={form.description}
            onChange={(description) => updateForm({ description })}
            marcador={
              isAfectado
                ? t('wizard.details.placeholderAffected')
                : t('wizard.details.placeholderWitness')
            }
            multilinea
            filas={5}
            ayuda={
              form.description.length < 10
                ? t('wizard.details.minChars', { count: form.description.length })
                : t('wizard.details.goodDescription')
            }
          />

          {isAfectado ? (
            <>
              <CampoTexto
                etiqueta={t('wizard.details.contactPhone')}
                valor={form.contactPhone}
                onChange={(contactPhone) => updateForm({ contactPhone })}
                marcador={t('wizard.details.phonePlaceholder')}
                tipo="tel"
                inputMode="tel"
                autoComplete="tel"
                mono
              />

              {/* Contador de personas: botones de 56px, no de 40. */}
              <div>
                <p id="conteo-hogar" className="etiqueta">
                  {t('wizard.details.householdSize')}
                </p>
                <div className="flex items-center gap-4" role="group" aria-labelledby="conteo-hogar">
                  <button
                    type="button"
                    onClick={() => updateForm({ householdSize: Math.max(1, form.householdSize - 1) })}
                    disabled={form.householdSize <= 1}
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control border-2 border-tinta-200 bg-white text-tinta-700 hover:bg-tinta-50 disabled:opacity-40"
                    aria-label={t('wizard.details.decreaseHousehold')}
                  >
                    <Minus className="h-6 w-6" aria-hidden="true" />
                  </button>
                  <output className="w-16 text-center text-3xl font-bold" aria-live="polite">
                    {form.householdSize}
                  </output>
                  <button
                    type="button"
                    onClick={() => updateForm({ householdSize: form.householdSize + 1 })}
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control border-2 border-tinta-200 bg-white text-tinta-700 hover:bg-tinta-50"
                    aria-label={t('wizard.details.increaseHousehold')}
                  >
                    <Plus className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <GrupoOpciones<'si' | 'no'>
                titulo={t('wizard.details.isHabitable')}
                valor={form.isHabitable ? 'si' : 'no'}
                onChange={(v) => updateForm({ isHabitable: v === 'si' })}
                columnas={2}
                opciones={[
                  { valor: 'si', etiqueta: t('wizard.details.habitableYes') },
                  { valor: 'no', etiqueta: t('wizard.details.habitableNo') },
                ]}
              />

              <GrupoOpciones<NecesidadUrgente>
                titulo={t('wizard.details.urgentNeed')}
                valor={form.urgentNeed}
                onChange={(urgentNeed) => updateForm({ urgentNeed })}
                opciones={[
                  {
                    valor: 'ahe_alimentaria',
                    etiqueta: t('wizard.details.needFood'),
                    descripcion: t('wizard.details.needFoodDesc'),
                    icono: ICONO_NECESIDAD.ahe_alimentaria,
                  },
                  {
                    valor: 'ahe_no_alimentaria',
                    etiqueta: t('wizard.details.needShelter'),
                    descripcion: t('wizard.details.needShelterDesc'),
                    icono: ICONO_NECESIDAD.ahe_no_alimentaria,
                  },
                  {
                    valor: 'materiales_rehabilitacion',
                    etiqueta: t('wizard.details.needMaterials'),
                    descripcion: t('wizard.details.needMaterialsDesc'),
                    icono: ICONO_NECESIDAD.materiales_rehabilitacion,
                  },
                  {
                    valor: 'subsidio_arriendo',
                    etiqueta: t('wizard.details.needRent'),
                    descripcion: t('wizard.details.needRentDesc'),
                    icono: ICONO_NECESIDAD.subsidio_arriendo,
                  },
                ]}
              />
            </>
          ) : (
            <GrupoOpciones<ReportSeverity>
              titulo={t('wizard.details.howSevere')}
              valor={form.severity}
              onChange={(severity) => updateForm({ severity })}
              opciones={[
                {
                  valor: 'leve',
                  etiqueta: t('wizard.details.severityMild'),
                  descripcion: t('wizard.details.severityMildDesc'),
                },
                {
                  valor: 'moderado',
                  etiqueta: t('wizard.details.severityModerate'),
                  descripcion: t('wizard.details.severityModerateDesc'),
                },
                {
                  valor: 'grave',
                  etiqueta: t('wizard.details.severitySevere'),
                  descripcion: t('wizard.details.severitySevereDesc'),
                },
              ]}
            />
          )}

          {/* ── Foto ─────────────────────────────────────────────────────
              Antes era un botón que solo cambiaba un booleano: se veía como si
              hubiera subido algo y no había nada. Ahora escoge un archivo de
              verdad, con la cámara del teléfono como primera opción. */}
          <div>
            <p className="etiqueta">{t('wizard.details.photoOptional')}</p>
            <span className="etiqueta-ayuda">{t('wizard.details.photoHelp')}</span>

            <input
              ref={entradaFoto}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => seleccionarFoto(e.target.files?.[0] ?? null)}
            />

            {form.photoName ? (
              <div className="flex items-center gap-3 rounded-control border-2 border-azul-600 bg-azul-50 p-3">
                {form.photoPreview && (
                  <img
                    src={form.photoPreview}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-control object-cover"
                  />
                )}
                <p className="min-w-0 flex-1 break-all font-semibold text-azul-900">
                  {t('wizard.details.photoChosen', { name: form.photoName })}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    seleccionarFoto(null);
                    if (entradaFoto.current) entradaFoto.current.value = '';
                  }}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control text-tinta-600 hover:bg-white"
                  aria-label={t('wizard.details.photoRemove')}
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => entradaFoto.current?.click()}
                className="flex min-h-control-lg w-full items-center justify-center gap-3 rounded-control border-2 border-dashed border-tinta-300 bg-white font-semibold text-tinta-600 hover:border-azul-400 hover:bg-azul-50"
              >
                <Camera className="h-6 w-6" aria-hidden="true" />
                {t('wizard.details.photoUpload')}
              </button>
            )}

            {errorFoto && (
              <p className="mt-2 text-sm font-semibold text-alerta-700" role="alert">
                {errorFoto === 'tamano'
                  ? t('wizard.details.photoTooBig')
                  : t('wizard.details.photoWrongType')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Paso 3 · Dónde ─────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="animate-slide-up space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl">
              {isAfectado ? t('wizard.location.affectedTitle') : t('wizard.location.witnessTitle')}
            </h2>
            <p className="mt-2 text-tinta-600">
              {isAfectado
                ? t('wizard.location.affectedSubtitle')
                : t('wizard.location.witnessSubtitle')}
            </p>
          </div>

          {/*
            El mapa reemplazó al botón de «usar GPS», que solo prendía un
            booleano y no mostraba nada. Aquí la persona ve dónde quedó marcado
            el punto y puede corregirlo tocando: en vereda, donde no hay
            dirección que escribir, esto es lo único que ubica al equipo.
          */}
          <MapaUbicacion
            valor={form.coordinates}
            onChange={(coordinates) => updateForm({ coordinates })}
          />

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-papel-borde" />
            <span className="text-sm font-bold uppercase tracking-wider text-tinta-500">
              {t('wizard.location.orAddress')}
            </span>
            <span className="h-px flex-1 bg-papel-borde" />
          </div>

          <CampoTexto
            etiqueta={t('wizard.location.addressLabel')}
            valor={form.location}
            onChange={(location) => updateForm({ location })}
            marcador={
              isAfectado
                ? t('wizard.location.placeholderAffected')
                : t('wizard.location.placeholderWitness')
            }
            ayuda={
              isAfectado ? t('wizard.location.hintAffected') : t('wizard.location.hintWitness')
            }
          />
        </div>
      )}

      {/* ── Paso 4 · La advertencia que no se puede saltar ─────────────── */}
      {step === 4 && isAfectado && (
        <div className="animate-slide-up space-y-5">
          <h2 className="text-xl sm:text-2xl">{t('wizard.disclaimer.title')}</h2>

          <Aviso tono="espera" titulo={t('wizard.disclaimer.notCensusTitle')}>
            <div className="space-y-3 leading-relaxed">
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
          </Aviso>

          <div className="ficha overflow-hidden">
            <div className="ficha-banda">
              <h3 className="text-lg font-bold text-white">{t('wizard.disclaimer.whatNext')}</h3>
            </div>
            <ol className="divide-y divide-papel-borde">
              {(['step1', 'step2', 'step3', 'step4'] as const).map((clave, indice) => (
                <li key={clave} className="flex items-start gap-3 px-4 py-3.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-azul-600 text-sm font-bold text-white"
                    aria-hidden="true"
                  >
                    {indice + 1}
                  </span>
                  <span className="leading-snug">{t(`wizard.disclaimer.${clave}`)}</span>
                </li>
              ))}
            </ol>
          </div>

          <label
            htmlFor="acepta-advertencia"
            className={`flex cursor-pointer items-start gap-4 rounded-ficha border-2 p-4 transition-colors ${
              disclaimerAccepted
                ? 'border-azul-600 bg-azul-50'
                : 'border-tinta-200 bg-white hover:bg-tinta-50'
            }`}
          >
            <input
              id="acepta-advertencia"
              type="checkbox"
              checked={disclaimerAccepted}
              onChange={(e) => setDisclaimerAccepted(e.target.checked)}
              className="sr-only"
            />
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 ${
                disclaimerAccepted ? 'border-azul-600 bg-azul-600' : 'border-tinta-300 bg-white'
              }`}
              aria-hidden="true"
            >
              {disclaimerAccepted && <Check className="h-6 w-6 text-white" strokeWidth={3} />}
            </span>
            <span className="leading-relaxed">
              <Trans i18nKey="wizard.disclaimer.accept" components={{ strong: <strong /> }} />
            </span>
          </label>
        </div>
      )}

      {/*
        Barra de navegación fija en móvil.
        Con controles de 56px y pasos largos, el botón de siguiente quedaba fuera
        de pantalla y había que desplazarse a buscarlo. Fijo abajo está siempre
        donde el pulgar ya se encuentra.
      */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-papel-borde bg-white/95 backdrop-blur lg:static lg:mt-10 lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 lg:px-0 lg:py-0">
          <button type="button" onClick={goBack} className="btn-secondary shrink-0">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">
              {step > 0 ? t('wizard.nav.back') : t('wizard.nav.cancel')}
            </span>
          </button>

          {step < totalSteps - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed}
              className="btn-primary min-h-control-lg flex-1"
            >
              {t('wizard.nav.next')}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed}
              className="btn-accent min-h-control-lg flex-1"
            >
              <Send className="h-5 w-5" aria-hidden="true" />
              {isAfectado ? t('wizard.nav.submitVisit') : t('wizard.nav.submitNotice')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
