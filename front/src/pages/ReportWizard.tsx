import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { EmergencyType, CitizenReportType } from '@/types';

const emergencyTypes: { type: EmergencyType; label: string; icon: typeof Droplets; color: string }[] = [
  { type: 'Inundacion', label: 'Inundación', icon: Droplets, color: 'border-ungrd-200 bg-ungrd-50 text-ungrd-700 hover:border-ungrd-400' },
  { type: 'Deslizamiento', label: 'Deslizamiento', icon: Mountain, color: 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400' },
  { type: 'Incendio', label: 'Incendio', icon: Flame, color: 'border-red-200 bg-red-50 text-red-700 hover:border-red-400' },
  { type: 'ViaAfectada', label: 'Vía afectada', icon: MapPin, color: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400' },
  { type: 'ColapsoEstructural', label: 'Colapso estructural', icon: AlertTriangle, color: 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-400' },
  { type: 'Otro', label: 'Otro', icon: AlertTriangle, color: 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400' },
];

export default function ReportWizard() {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState<CitizenReportType | null>(null);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [form, setForm] = useState({
    type: '' as EmergencyType | '',
    description: '',
    severity: '' as 'leve' | 'moderado' | 'grave' | '',
    hasPhoto: false,
    location: '',
    useGps: false,
    contactPhone: '',
    householdSize: 1,
    isHabitable: true,
    urgentNeed: '',
  });

  const isAfectado = reportType === 'afectado';

  const steps = isAfectado
    ? [
        { number: 0, title: 'Tipo de reporte' },
        { number: 1, title: '¿Qué pasó?' },
        { number: 2, title: 'Tu situación' },
        { number: 3, title: '¿Dónde estás?' },
        { number: 4, title: 'Aviso importante' },
      ]
    : [
        { number: 0, title: 'Tipo de reporte' },
        { number: 1, title: '¿Qué viste?' },
        { number: 2, title: 'Cuéntanos más' },
        { number: 3, title: '¿Dónde ocurre?' },
      ];

  const totalSteps = steps.length;

  const canProceed =
    (step === 0 && reportType !== null) ||
    (step === 1 && form.type) ||
    (step === 2 && (isAfectado ? form.description.length >= 10 : form.severity !== '')) ||
    (step === 3 && (form.location || form.useGps)) ||
    (step === 4 && disclaimerAccepted);

  function handleSubmit() {
    setSubmitted(true);
  }

  if (submitted) {
    const reportId = `CR-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center animate-scale-in">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">
          {isAfectado ? 'Reporte de afectación enviado' : 'Aviso enviado'}
        </h1>
        <p className="mt-3 text-base text-slate-500 leading-relaxed">
          {isAfectado
            ? 'Tu reporte fue recibido y será priorizado para una visita técnica. Un equipo de socorro evaluará tu situación.'
            : 'Tu aviso fue registrado con éxito. Un gestor de emergencias lo revisará pronto.'}
        </p>
        <div className="mt-6 card p-5">
          <p className="text-sm text-slate-500">Tu número de seguimiento</p>
          <p className="mt-1 text-2xl font-bold text-ungrd-600 tracking-wide">{reportId}</p>
          <p className="mt-2 text-xs text-slate-400">
            Guarda este número para consultar el estado de tu reporte
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
            <ShieldAlert className="h-3 w-3" />
            Autorreportado
          </div>
        </div>
        {isAfectado && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-left">
            <p className="text-sm font-semibold text-blue-800">Recuerda:</p>
            <p className="mt-1 text-sm text-blue-700 leading-relaxed">
              Este reporte genera una solicitud de visita técnica. El censo oficial de
              damnificados es un trámite presencial, realizado por personal identificado
              del municipio. Nunca pagues por entrar al censo.
            </p>
          </div>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={() => navigate('/mis-reportes')} className="btn-primary">
            Ver mis reportes
          </button>
          <button onClick={() => navigate('/')} className="btn-secondary">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:py-12 animate-fade-in">
      {/* Progress */}
      {step > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {steps.slice(1).map(({ number, title }) => (
              <div key={number} className="flex items-center gap-2">
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
                  {title}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-ungrd-600 transition-all duration-500"
              style={{ width: `${((step - 1) / (totalSteps - 2)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Step 0: Report type selection */}
      {step === 0 && (
        <div className="animate-slide-up">
          <h2 className="text-xl font-bold text-slate-800 lg:text-2xl">
            ¿Cuál es tu situación?
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Esto nos permite dirigir tu reporte al equipo correcto
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
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
                <p className="text-lg font-bold text-slate-800">Vi un evento</p>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                  Presencié una emergencia pero yo no soy víctima directa.
                  Quiero avisar para que envíen ayuda.
                </p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                reportType === 'testigo' ? 'bg-ungrd-100 text-ungrd-700' : 'bg-slate-100 text-slate-500'
              }`}>
                Aviso rápido
              </span>
            </button>

            <button
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
                <p className="text-lg font-bold text-slate-800">Mi casa o familia está afectada</p>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                  La emergencia afectó mi vivienda o a las personas de mi hogar.
                  Necesito que vengan a evaluar mi situación.
                </p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                reportType === 'afectado' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
              }`}>
                Solicitud de visita
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Emergency Type */}
      {step === 1 && (
        <div className="animate-slide-up">
          <h2 className="text-xl font-bold text-slate-800 lg:text-2xl">
            {isAfectado ? '¿Qué tipo de evento afectó tu hogar?' : '¿Qué tipo de emergencia viste?'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">Selecciona la opción que mejor describe la situación</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {emergencyTypes.map(({ type, label, icon: Icon, color }) => (
              <button
                key={type}
                onClick={() => setForm({ ...form, type })}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all duration-200 ${
                  form.type === type
                    ? `${color} border-current ring-2 ring-current/20 scale-[1.02]`
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-7 w-7" />
                <span className="text-sm font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Details (different for testigo vs afectado) */}
      {step === 2 && (
        <div className="animate-slide-up">
          <h2 className="text-xl font-bold text-slate-800 lg:text-2xl">
            {isAfectado ? 'Cuéntanos sobre tu situación' : 'Cuéntanos qué está pasando'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {isAfectado
              ? 'Describe los daños en tu vivienda y la situación de tu familia'
              : 'Describe la situación con tus propias palabras'}
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Descripción
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={isAfectado
                  ? 'Ejemplo: El agua entró a mi casa y perdimos muebles. Somos 4 personas incluyendo 2 niños. Necesitamos un lugar donde dormir...'
                  : 'Ejemplo: El río se desbordó y el agua está entrando a las casas. Hay varias familias afectadas...'}
                rows={4}
                className="textarea-field text-base"
              />
              <p className="mt-1 text-xs text-slate-400">
                {form.description.length < 10
                  ? `Mínimo 10 caracteres (${form.description.length}/10)`
                  : 'Perfecto, describe lo mejor que puedas la situación'}
              </p>
            </div>

            {isAfectado && (
              <>
                <div>
                  <label htmlFor="contact-phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Phone className="mr-1 inline h-4 w-4" />
                    Teléfono de contacto
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder="Ej: 310 555 1234"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Users className="mr-1 inline h-4 w-4" />
                    ¿Cuántas personas viven en tu hogar?
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setForm({ ...form, householdSize: Math.max(1, form.householdSize - 1) })}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      -
                    </button>
                    <span className="w-12 text-center text-lg font-bold text-slate-800">{form.householdSize}</span>
                    <button
                      onClick={() => setForm({ ...form, householdSize: form.householdSize + 1 })}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Home className="mr-1 inline h-4 w-4" />
                    ¿Tu vivienda es habitable?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setForm({ ...form, isHabitable: true })}
                      className={`rounded-xl border-2 p-3 text-center transition-all ${
                        form.isHabitable
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-sm font-semibold">Sí, puedo quedarme</p>
                    </button>
                    <button
                      onClick={() => setForm({ ...form, isHabitable: false })}
                      className={`rounded-xl border-2 p-3 text-center transition-all ${
                        !form.isHabitable
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-sm font-semibold">No, está inhabitable</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Heart className="mr-1 inline h-4 w-4" />
                    ¿Cuál es tu necesidad más urgente?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'alimentos', label: 'Alimentos y agua' },
                      { value: 'albergue', label: 'Un lugar donde dormir' },
                      { value: 'medica', label: 'Atención médica' },
                      { value: 'rescate', label: 'Rescate / evacuación' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setForm({ ...form, urgentNeed: value })}
                        className={`rounded-xl border-2 p-3 text-left text-sm transition-all ${
                          form.urgentNeed === value
                            ? 'border-ungrd-400 bg-ungrd-50 text-ungrd-700 font-semibold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!isAfectado && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    ¿Qué tan grave es la situación?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'leve', label: 'Leve', desc: 'Sin heridos', color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
                      { value: 'moderado', label: 'Moderado', desc: 'Daños materiales', color: 'border-gold-300 bg-gold-50 text-gold-800' },
                      { value: 'grave', label: 'Grave', desc: 'Hay heridos o riesgo', color: 'border-red-200 bg-red-50 text-red-700' },
                    ] as const).map(({ value, label, desc, color }) => (
                      <button
                        key={value}
                        onClick={() => setForm({ ...form, severity: value })}
                        className={`rounded-xl border-2 p-3 text-center transition-all ${
                          form.severity === value
                            ? `${color} border-current`
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-xs mt-0.5 opacity-75">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Foto (opcional)
                  </label>
                  <button
                    onClick={() => setForm({ ...form, hasPhoto: !form.hasPhoto })}
                    className={`flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors ${
                      form.hasPhoto
                        ? 'border-ungrd-300 bg-ungrd-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {form.hasPhoto ? (
                      <>
                        <Camera className="h-6 w-6 text-ungrd-600" />
                        <span className="text-sm font-medium text-ungrd-700">Foto seleccionada</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-slate-400" />
                        <span className="text-sm text-slate-500">Toca para tomar o subir una foto</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Location */}
      {step === 3 && (
        <div className="animate-slide-up">
          <h2 className="text-xl font-bold text-slate-800 lg:text-2xl">
            {isAfectado ? '¿Dónde queda tu vivienda?' : '¿Dónde está ocurriendo?'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {isAfectado
              ? 'Necesitamos la dirección exacta para programar la visita técnica'
              : 'Necesitamos saber la ubicación para enviar ayuda'}
          </p>

          <div className="mt-6 space-y-4">
            <button
              onClick={() => setForm({ ...form, useGps: !form.useGps, location: '' })}
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
                  Usar mi ubicación actual
                </p>
                <p className="text-sm text-slate-500">
                  {form.useGps ? 'Ubicación detectada correctamente' : 'La forma más rápida y precisa'}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-400">O escribe la dirección</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value, useGps: false })}
                  placeholder={isAfectado
                    ? 'Ej: Cra 5 #12-34, Barrio Los Pinos, Mocoa'
                    : 'Ej: Vereda El Carmen, municipio de Mocoa'}
                  className="input-field pl-10"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                {isAfectado
                  ? 'Escribe tu dirección completa con barrio o vereda'
                  : 'Escribe el nombre de la vereda, barrio o lugar más cercano'}
              </p>
            </div>

            {isAfectado && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Foto de los daños (opcional pero muy útil)
                </label>
                <button
                  onClick={() => setForm({ ...form, hasPhoto: !form.hasPhoto })}
                  className={`flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors ${
                    form.hasPhoto
                      ? 'border-ungrd-300 bg-ungrd-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {form.hasPhoto ? (
                    <>
                      <Camera className="h-6 w-6 text-ungrd-600" />
                      <span className="text-sm font-medium text-ungrd-700">Foto seleccionada</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-slate-400" />
                      <span className="text-sm text-slate-500">Toca para tomar o subir fotos de los daños</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Disclaimer (afectado only) */}
      {step === 4 && isAfectado && (
        <div className="animate-slide-up">
          <h2 className="text-xl font-bold text-slate-800 lg:text-2xl">
            Aviso importante antes de enviar
          </h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200">
                  <ShieldAlert className="h-5 w-5 text-amber-800" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-900">
                    Este reporte NO te inscribe como damnificado
                  </h3>
                  <div className="mt-3 space-y-3 text-sm text-amber-800 leading-relaxed">
                    <p>
                      Tu reporte genera una <strong>solicitud de visita técnica</strong> para que un
                      equipo de socorro evalúe tu situación. Es el primer paso, pero no es el censo oficial.
                    </p>
                    <p>
                      El <strong>censo de damnificados es un trámite presencial</strong>, realizado casa
                      por casa por personal identificado y uniformado del municipio, con formatos oficiales.
                    </p>
                    <p>
                      <strong>Nunca pagues para entrar al censo.</strong> El trámite es completamente
                      gratuito. Si alguien te pide dinero o datos bancarios a cambio de inscribirte,
                      es una estafa. Denuncia al 123.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h4 className="text-sm font-bold text-slate-700">¿Qué pasa después de enviar?</h4>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ungrd-100 text-xs font-bold text-ungrd-700">1</span>
                  Tu reporte entra a la cola de visitas del CMGRD y organismos de socorro
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ungrd-100 text-xs font-bold text-ungrd-700">2</span>
                  Un equipo de bomberos, Defensa Civil o Cruz Roja evaluará tu vivienda
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ungrd-100 text-xs font-bold text-ungrd-700">3</span>
                  Si procede, un brigadista acreditado realizará el censo oficial en tu hogar
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ungrd-100 text-xs font-bold text-ungrd-700">4</span>
                  Podrás consultar el avance con tu número de seguimiento
                </li>
              </ol>
            </div>

            <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100">
              <input
                type="checkbox"
                checked={disclaimerAccepted}
                onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-slate-300 text-ungrd-600 focus:ring-ungrd-500"
              />
              <span className="text-sm text-slate-700 leading-relaxed">
                Entiendo que este reporte <strong>no me inscribe como damnificado</strong> y que el
                censo oficial es presencial. Confirmo que la información que proporcioné es verídica.
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-10 flex items-center justify-between">
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : navigate('/'))}
          className="btn-ghost gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          {step > 0 ? 'Anterior' : 'Cancelar'}
        </button>

        {step < totalSteps - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed}
            className="btn-primary"
          >
            Siguiente
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canProceed}
            className={isAfectado ? 'btn-danger' : 'btn-primary'}
          >
            {isAfectado ? 'Enviar solicitud de visita' : 'Enviar aviso'}
            <AlertTriangle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
