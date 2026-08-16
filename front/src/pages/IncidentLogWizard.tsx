import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  LocateFixed,
  Users,
  AlertTriangle,
  Activity,
  Link2,
} from 'lucide-react';
import { EDAN_EVENT_TYPES, EVENT_TYPE_LABELS } from '@/types/edan';
import type { EdanEventType, IncidentStatus } from '@/types/edan';
import { COLOMBIAN_DEPARTMENTS, MUNICIPALITIES_BY_DEPT } from '@/mocks/mockEdan';

interface IncidentForm {
  eventType: EdanEventType | '';
  eventDate: string;
  departamento: string;
  municipio: string;
  location: string;
  useGps: boolean;
  description: string;
  personsInjured: number;
  personsDead: number;
  personsMissing: number;
  personsEvacuated: number;
  familiesAffected: number;
  linkedReportId: string;
  status: IncidentStatus;
}

const steps = [
  { number: 1, title: 'Evento' },
  { number: 2, title: 'Ubicación' },
  { number: 3, title: 'Afectación' },
  { number: 4, title: 'Confirmar' },
];

export default function IncidentLogWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<IncidentForm>({
    eventType: '',
    eventDate: new Date().toISOString().split('T')[0],
    departamento: '',
    municipio: '',
    location: '',
    useGps: false,
    description: '',
    personsInjured: 0,
    personsDead: 0,
    personsMissing: 0,
    personsEvacuated: 0,
    familiesAffected: 0,
    linkedReportId: '',
    status: 'en_atencion',
  });

  const municipalities = form.departamento ? (MUNICIPALITIES_BY_DEPT[form.departamento] ?? []) : [];

  const canProceed = useMemo(() => {
    if (step === 1) return form.eventType && form.eventDate;
    if (step === 2) return form.departamento && form.municipio && (form.location || form.useGps);
    if (step === 3) return form.description.length >= 10;
    if (step === 4) return true;
    return false;
  }, [step, form]);

  if (submitted) {
    const incidentId = `INC-2026-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`;
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center animate-scale-in">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Incidente registrado</h1>
        <p className="mt-3 text-base text-slate-500 leading-relaxed">
          La bitácora del incidente fue registrada. Los datos quedan marcados como
          verificados por tu entidad de socorro.
        </p>
        <div className="mt-6 card p-5">
          <p className="text-sm text-slate-500">Número de incidente</p>
          <p className="mt-1 text-2xl font-bold text-ungrd-600 tracking-wide">{incidentId}</p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={() => navigate('/socorro/evaluacion')} className="btn-primary">
            Evaluar viviendas
          </button>
          <button onClick={() => navigate('/socorro')} className="btn-secondary">
            Volver al panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:py-12 animate-fade-in">
      <h1 className="text-xl font-bold text-slate-800 lg:text-2xl mb-1">
        Registro de incidente atendido
      </h1>
      <p className="text-sm text-slate-500 mb-6">Bitácora del organismo de socorro</p>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {steps.map(({ number, title }) => (
            <div key={number} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                step === number
                  ? 'bg-ungrd-600 text-white shadow-sm'
                  : step > number
                    ? 'bg-gold-100 text-gold-700'
                    : 'bg-slate-100 text-slate-400'
              }`}>
                {step > number ? <Check className="h-4 w-4" /> : number}
              </div>
              <span className={`hidden text-sm font-medium sm:block ${step === number ? 'text-slate-800' : 'text-slate-400'}`}>
                {title}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-ungrd-600 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }} />
        </div>
      </div>

      {/* Step 1: Event */}
      {step === 1 && (
        <div className="space-y-4 animate-slide-up">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de evento</label>
            <select
              value={form.eventType}
              onChange={(e) => setForm({ ...form, eventType: e.target.value as EdanEventType })}
              className="input-field"
            >
              <option value="">Seleccionar...</option>
              {EDAN_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha del evento</label>
            <input
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <Link2 className="inline h-4 w-4 mr-1" />
              Vincular a reporte ciudadano (opcional)
            </label>
            <input
              type="text"
              value={form.linkedReportId}
              onChange={(e) => setForm({ ...form, linkedReportId: e.target.value })}
              placeholder="Ej: CR-2026-0847"
              className="input-field"
            />
            <p className="mt-1 text-xs text-slate-400">Si este incidente fue originado por un aviso ciudadano, ingresa su código</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Estado del incidente</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'en_atencion', label: 'En atención', color: 'border-red-200 bg-red-50 text-red-700' },
                { value: 'controlado', label: 'Controlado', color: 'border-amber-200 bg-amber-50 text-amber-700' },
                { value: 'cerrado', label: 'Cerrado', color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
              ] as const).map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => setForm({ ...form, status: value })}
                  className={`rounded-xl border-2 p-3 text-center text-sm transition-all ${
                    form.status === value ? `${color} border-current font-semibold` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Location */}
      {step === 2 && (
        <div className="space-y-4 animate-slide-up">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Departamento</label>
              <select
                value={form.departamento}
                onChange={(e) => setForm({ ...form, departamento: e.target.value, municipio: '' })}
                className="input-field"
              >
                <option value="">Seleccionar...</option>
                {COLOMBIAN_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Municipio</label>
              <select
                value={form.municipio}
                onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                className="input-field"
                disabled={!form.departamento}
              >
                <option value="">Seleccionar...</option>
                {municipalities.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ubicación específica</label>
            <button
              onClick={() => setForm({ ...form, useGps: !form.useGps, location: '' })}
              className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 transition-all mb-3 ${
                form.useGps ? 'border-ungrd-400 bg-ungrd-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <LocateFixed className={`h-5 w-5 ${form.useGps ? 'text-ungrd-600' : 'text-slate-400'}`} />
              <span className={`text-sm ${form.useGps ? 'text-ungrd-700 font-medium' : 'text-slate-600'}`}>
                {form.useGps ? 'GPS activado' : 'Usar GPS'}
              </span>
            </button>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value, useGps: false })}
                placeholder="Ej: Vereda El Carmen, margen derecho del río"
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Affectation */}
      {step === 3 && (
        <div className="space-y-4 animate-slide-up">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción del incidente</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe qué encontraste, las acciones realizadas y el estado actual..."
              rows={4}
              className="textarea-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              { key: 'personsInjured', label: 'Heridos', icon: Activity, color: 'text-red-600' },
              { key: 'personsDead', label: 'Fallecidos', icon: AlertTriangle, color: 'text-slate-800' },
              { key: 'personsMissing', label: 'Desaparecidos', icon: Users, color: 'text-amber-600' },
              { key: 'personsEvacuated', label: 'Evacuados', icon: Users, color: 'text-blue-600' },
            ] as const).map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="card p-3">
                <Icon className={`h-4 w-4 ${color} mb-1`} />
                <p className="text-xs text-slate-500 mb-2">{label}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setForm({ ...form, [key]: Math.max(0, form[key] - 1) })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm"
                  >-</button>
                  <span className="w-8 text-center font-bold text-slate-800">{form[key]}</span>
                  <button
                    onClick={() => setForm({ ...form, [key]: form[key] + 1 })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm"
                  >+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-3">
            <p className="text-xs text-slate-500 mb-2">Familias afectadas</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setForm({ ...form, familiesAffected: Math.max(0, form.familiesAffected - 1) })}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm"
              >-</button>
              <span className="w-8 text-center font-bold text-slate-800">{form.familiesAffected}</span>
              <button
                onClick={() => setForm({ ...form, familiesAffected: form.familiesAffected + 1 })}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm"
              >+</button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-4 animate-slide-up">
          <div className="card p-5">
            <h3 className="font-bold text-slate-800 mb-3">Resumen del incidente</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Evento</span>
                <span className="font-medium text-slate-700">{form.eventType ? EVENT_TYPE_LABELS[form.eventType] : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha</span>
                <span className="font-medium text-slate-700">{form.eventDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ubicación</span>
                <span className="font-medium text-slate-700">{form.municipio}, {form.departamento}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dirección</span>
                <span className="font-medium text-slate-700 text-right max-w-[60%]">{form.location || 'GPS'}</span>
              </div>
              {form.linkedReportId && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Vinculado a</span>
                  <span className="font-medium text-ungrd-600">{form.linkedReportId}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card p-3 text-center">
              <p className="text-lg font-bold text-red-600">{form.personsInjured}</p>
              <p className="text-xs text-slate-500">Heridos</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-lg font-bold text-slate-800">{form.personsDead}</p>
              <p className="text-xs text-slate-500">Fallecidos</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-lg font-bold text-amber-600">{form.personsMissing}</p>
              <p className="text-xs text-slate-500">Desaparecidos</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-lg font-bold text-blue-600">{form.personsEvacuated}</p>
              <p className="text-xs text-slate-500">Evacuados</p>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Nivel de confianza:</strong> Este registro será marcado como
              <span className="inline-flex items-center mx-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                Verificado por entidad
              </span>
              por tu organismo de socorro.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-10 flex items-center justify-between">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate('/socorro'))}
          className="btn-ghost gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          {step > 1 ? 'Anterior' : 'Cancelar'}
        </button>

        {step < 4 ? (
          <button onClick={() => setStep(step + 1)} disabled={!canProceed} className="btn-primary">
            Siguiente <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={() => setSubmitted(true)} className="btn-primary">
            Registrar incidente <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
