import { AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';
import type { CensusWizardState, EdanEventType } from '@/types/edan';
import { EDAN_EVENT_TYPES, EVENT_TYPE_LABELS } from '@/types/edan';
import {
  COLOMBIAN_DEPARTMENTS,
  MUNICIPALITIES_BY_DEPT,
  mockCalamityDeclarations,
} from '@/data/mockEdan';

interface Props {
  data: CensusWizardState;
  update: (partial: Partial<CensusWizardState>) => void;
}

export default function StepOperationContext({ data, update }: Props) {
  const municipalities = data.departamento
    ? MUNICIPALITIES_BY_DEPT[data.departamento] ?? []
    : [];

  const activeCalamity = data.municipio
    ? mockCalamityDeclarations.find((d) => d.municipio === data.municipio && d.active)
    : null;

  const selectClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition-all focus:border-ungrd-400 focus:outline-none focus:ring-2 focus:ring-ungrd-100';
  const inputClass = selectClass;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Contexto de la operación</h2>
        <p className="mt-1 text-sm text-slate-500">
          Evento, fecha y ubicación del censo EDAN.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Tipo de evento <span className="text-red-500">*</span>
        </label>
        <select
          value={data.eventType}
          onChange={(e) => update({ eventType: e.target.value as EdanEventType })}
          className={selectClass}
        >
          <option value="">-- Seleccionar tipo de evento --</option>
          {EDAN_EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Fecha del evento <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={data.eventDate}
          onChange={(e) => update({ eventDate: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Departamento <span className="text-red-500">*</span>
          </label>
          <select
            value={data.departamento}
            onChange={(e) => update({ departamento: e.target.value, municipio: '' })}
            className={selectClass}
          >
            <option value="">-- Departamento --</option>
            {COLOMBIAN_DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Municipio <span className="text-red-500">*</span>
          </label>
          <select
            value={data.municipio}
            onChange={(e) => update({ municipio: e.target.value })}
            disabled={!data.departamento}
            className={`${selectClass} disabled:cursor-not-allowed disabled:bg-slate-100`}
          >
            <option value="">-- Municipio --</option>
            {municipalities.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {data.municipio && (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
            activeCalamity
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          {activeCalamity ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          )}
          <div>
            <p className={`text-sm font-semibold ${activeCalamity ? 'text-emerald-800' : 'text-amber-800'}`}>
              {activeCalamity ? 'Declaratoria de calamidad activa' : 'Sin declaratoria de calamidad'}
            </p>
            <p className={`mt-0.5 text-xs ${activeCalamity ? 'text-emerald-600' : 'text-amber-600'}`}>
              {activeCalamity
                ? `${activeCalamity.decretoNumber} — vigente hasta ${new Date(activeCalamity.expiryDate).toLocaleDateString('es-CO')}`
                : `El censo se puede realizar pero la distribución de AHE puede requerir autorización adicional.`}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Zona <span className="text-red-500">*</span></label>
          <div className="flex gap-3">
            {(['urbano', 'rural'] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => update({ zone: z })}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  data.zone === z
                    ? 'border-ungrd-500 bg-ungrd-50 text-ungrd-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <MapPin className="h-4 w-4" />
                {z === 'urbano' ? 'Urbano' : 'Rural'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            {data.zone === 'urbano' ? 'Barrio' : 'Vereda / Corregimiento'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.zoneName}
            onChange={(e) => update({ zoneName: e.target.value })}
            placeholder={data.zone === 'urbano' ? 'Ej: Barrio Los Pinos' : 'Ej: Vereda El Carmen'}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
