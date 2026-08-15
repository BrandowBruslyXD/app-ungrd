import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Home,
  AlertTriangle,
  ShieldAlert,
  FileWarning,
  Users,
} from 'lucide-react';
import type { Habitability, HousingDamageAggregate } from '@/types/edan';
import { HABITABILITY_LABELS } from '@/types/edan';
import { mockIncidentLogs } from '@/data/mockSocorro';

interface HabForm {
  incidentLogId: string;
  address: string;
  housingType: 'casa' | 'apartamento' | 'habitacion' | 'improvisada' | 'otro' | '';
  habitability: Habitability | '';
  damageAggregate: HousingDamageAggregate | '';
  needsStructuralInspection: boolean;
  occupantsPresent: number;
  notes: string;
  evacuationNotificationIssued: boolean;
  temporaryShelterActivated: boolean;
}

const steps = [
  { number: 1, title: 'Vivienda' },
  { number: 2, title: 'Evaluación' },
  { number: 3, title: 'Acciones' },
];

const housingTypeLabels: Record<string, string> = {
  casa: 'Casa',
  apartamento: 'Apartamento',
  habitacion: 'Habitación',
  improvisada: 'Vivienda improvisada',
  otro: 'Otro',
};

export default function HabitabilityWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<HabForm>({
    incidentLogId: '',
    address: '',
    housingType: '',
    habitability: '',
    damageAggregate: '',
    needsStructuralInspection: false,
    occupantsPresent: 0,
    notes: '',
    evacuationNotificationIssued: false,
    temporaryShelterActivated: false,
  });

  const activeIncidents = mockIncidentLogs.filter((i) => i.status !== 'cerrado');

  const canProceed = useMemo(() => {
    if (step === 1) return form.address && form.housingType && form.incidentLogId;
    if (step === 2) return form.habitability && form.damageAggregate;
    if (step === 3) return true;
    return false;
  }, [step, form]);

  if (submitted) {
    const assessmentId = `HA-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`;
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center animate-scale-in">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Evaluación registrada</h1>
        <p className="mt-3 text-base text-slate-500 leading-relaxed">
          La evaluación de habitabilidad fue registrada.
          {form.habitability === 'no_habitable' && ' La notificación de evacuación ha sido generada.'}
        </p>
        <div className="mt-6 card p-5">
          <p className="text-sm text-slate-500">Código de evaluación</p>
          <p className="mt-1 text-2xl font-bold text-ungrd-600 tracking-wide">{assessmentId}</p>
          {form.habitability && (
            <div className="mt-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ${
                form.habitability === 'habitable' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
                form.habitability === 'uso_restringido' ? 'bg-amber-50 text-amber-700 ring-amber-200' :
                'bg-red-50 text-red-700 ring-red-200'
              }`}>
                {HABITABILITY_LABELS[form.habitability]}
              </span>
            </div>
          )}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={() => { setSubmitted(false); setStep(1); setForm({ ...form, address: '', housingType: '', habitability: '', damageAggregate: '', notes: '', occupantsPresent: 0, needsStructuralInspection: false, evacuationNotificationIssued: false, temporaryShelterActivated: false }); }} className="btn-primary">
            Evaluar otra vivienda
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
        Evaluación de habitabilidad
      </h1>
      <p className="text-sm text-slate-500 mb-6">Evaluación técnica rápida por organismo de socorro</p>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {steps.map(({ number, title }) => (
            <div key={number} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                step === number ? 'bg-ungrd-600 text-white shadow-sm' : step > number ? 'bg-gold-100 text-gold-700' : 'bg-slate-100 text-slate-400'
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
          <div className="h-full rounded-full bg-ungrd-600 transition-all duration-500" style={{ width: `${((step - 1) / 2) * 100}%` }} />
        </div>
      </div>

      {/* Step 1: Housing */}
      {step === 1 && (
        <div className="space-y-4 animate-slide-up">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Incidente relacionado</label>
            <select
              value={form.incidentLogId}
              onChange={(e) => setForm({ ...form, incidentLogId: e.target.value })}
              className="input-field"
            >
              <option value="">Seleccionar incidente...</option>
              {activeIncidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.id} - {inc.location}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <MapPin className="inline h-4 w-4 mr-1" />
              Dirección de la vivienda
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Ej: Cra 5 #12-34, Barrio Los Pinos"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <Home className="inline h-4 w-4 mr-1" />
              Tipo de vivienda
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(housingTypeLabels).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setForm({ ...form, housingType: value as HabForm['housingType'] })}
                  className={`rounded-xl border-2 p-3 text-center text-sm transition-all ${
                    form.housingType === value
                      ? 'border-ungrd-400 bg-ungrd-50 text-ungrd-700 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <Users className="inline h-4 w-4 mr-1" />
              Ocupantes presentes
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setForm({ ...form, occupantsPresent: Math.max(0, form.occupantsPresent - 1) })}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >-</button>
              <span className="w-12 text-center text-lg font-bold text-slate-800">{form.occupantsPresent}</span>
              <button
                onClick={() => setForm({ ...form, occupantsPresent: form.occupantsPresent + 1 })}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >+</button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Assessment */}
      {step === 2 && (
        <div className="space-y-5 animate-slide-up">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Dictamen de habitabilidad
            </label>
            <div className="grid gap-3">
              {([
                { value: 'habitable', label: 'Habitable', desc: 'La vivienda puede ser ocupada sin restricciones', color: 'border-emerald-300 bg-emerald-50 text-emerald-800', iconColor: 'bg-emerald-200 text-emerald-700' },
                { value: 'uso_restringido', label: 'Uso restringido', desc: 'Se puede habitar con precauciones. Requiere monitoreo', color: 'border-amber-300 bg-amber-50 text-amber-800', iconColor: 'bg-amber-200 text-amber-700' },
                { value: 'no_habitable', label: 'No habitable', desc: 'La vivienda NO puede ser ocupada. Requiere evacuación', color: 'border-red-300 bg-red-50 text-red-800', iconColor: 'bg-red-200 text-red-700' },
              ] as const).map(({ value, label, desc, color, iconColor }) => (
                <button
                  key={value}
                  onClick={() => setForm({ ...form, habitability: value })}
                  className={`flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                    form.habitability === value
                      ? `${color} border-current ring-2 ring-current/20`
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    form.habitability === value ? iconColor : 'bg-slate-100 text-slate-400'
                  }`}>
                    {value === 'habitable' ? <Check className="h-5 w-5" /> :
                     value === 'uso_restringido' ? <AlertTriangle className="h-5 w-5" /> :
                     <ShieldAlert className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-bold">{label}</p>
                    <p className="text-sm mt-0.5 opacity-80">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Categoría agregada de daño
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'sin_dano', label: 'Sin daño', color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
                { value: 'averiada', label: 'Averiada', color: 'border-amber-200 bg-amber-50 text-amber-700' },
                { value: 'destruida', label: 'Destruida', color: 'border-red-200 bg-red-50 text-red-700' },
              ] as const).map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => setForm({ ...form, damageAggregate: value })}
                  className={`rounded-xl border-2 p-3 text-center text-sm transition-all ${
                    form.damageAggregate === value ? `${color} border-current font-semibold` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100">
              <input
                type="checkbox"
                checked={form.needsStructuralInspection}
                onChange={(e) => setForm({ ...form, needsStructuralInspection: e.target.checked })}
                className="h-5 w-5 rounded border-slate-300 text-ungrd-600 focus:ring-ungrd-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-700">
                  Requiere inspección estructural por profesional
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Solo un ingeniero o arquitecto con tarjeta profesional puede hacer la inspección estructural detallada
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Observaciones</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Describe el estado de la vivienda, daños observados, condiciones de riesgo..."
              rows={3}
              className="textarea-field"
            />
          </div>
        </div>
      )}

      {/* Step 3: Actions */}
      {step === 3 && (
        <div className="space-y-4 animate-slide-up">
          {form.habitability === 'no_habitable' && (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <FileWarning className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-800">Vivienda no habitable</h3>
                  <p className="text-sm text-red-700 mt-1 leading-relaxed">
                    Según el protocolo, se debe generar una <strong>Notificación Personal de Afectación e
                    Inminente Riesgo</strong> y activar alojamiento temporal para los ocupantes.
                  </p>
                </div>
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50">
            <input
              type="checkbox"
              checked={form.evacuationNotificationIssued}
              onChange={(e) => setForm({ ...form, evacuationNotificationIssued: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">
                Notificación de evacuación emitida
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                "Notificación Personal de Afectación e Inminente Riesgo - Vivienda No Habitable"
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50">
            <input
              type="checkbox"
              checked={form.temporaryShelterActivated}
              onChange={(e) => setForm({ ...form, temporaryShelterActivated: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">
                Alojamiento temporal activado
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Se gestionó albergue o alojamiento temporal para los ocupantes
              </p>
            </div>
          </label>

          {/* Summary */}
          <div className="card p-5 mt-4">
            <h3 className="font-bold text-slate-800 mb-3">Resumen de la evaluación</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Dirección</span>
                <span className="font-medium text-slate-700 text-right max-w-[60%]">{form.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo</span>
                <span className="font-medium text-slate-700">{form.housingType ? housingTypeLabels[form.housingType] : '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Habitabilidad</span>
                {form.habitability && (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                    form.habitability === 'habitable' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
                    form.habitability === 'uso_restringido' ? 'bg-amber-50 text-amber-700 ring-amber-200' :
                    'bg-red-50 text-red-700 ring-red-200'
                  }`}>
                    {HABITABILITY_LABELS[form.habitability]}
                  </span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Daño</span>
                <span className="font-medium text-slate-700 capitalize">{form.damageAggregate ? form.damageAggregate.replace('_', ' ') : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ocupantes</span>
                <span className="font-medium text-slate-700">{form.occupantsPresent}</span>
              </div>
              {form.needsStructuralInspection && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Inspección estructural</span>
                  <span className="font-medium text-amber-600">Requerida</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              Esta evaluación alimenta el <strong>EDAN municipal</strong> y la cola de censo del CMGRD.
              El dato queda marcado como <strong>verificado por entidad</strong>.
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

        {step < 3 ? (
          <button onClick={() => setStep(step + 1)} disabled={!canProceed} className="btn-primary">
            Siguiente <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={() => setSubmitted(true)} className="btn-primary">
            Registrar evaluación <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
