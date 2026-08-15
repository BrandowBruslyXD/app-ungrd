import { Droplets, Home, Zap } from 'lucide-react';
import type { CensusWizardState, HousingVisit } from '@/types/edan';

interface Props {
  data: CensusWizardState;
  update: (partial: Partial<CensusWizardState>) => void;
}

const HOUSING_TYPES: { value: HousingVisit['housingType']; label: string }[] = [
  { value: 'casa', label: 'Casa' },
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'habitacion', label: 'Habitación / Pieza' },
  { value: 'improvisada', label: 'Vivienda improvisada' },
  { value: 'otro', label: 'Otro' },
];

const OWNERSHIP_TYPES: { value: HousingVisit['ownershipType']; label: string }[] = [
  { value: 'propia', label: 'Propia' },
  { value: 'arriendo', label: 'Arriendo' },
  { value: 'prestada', label: 'Prestada / Cedida' },
  { value: 'invasion', label: 'Invasión / Ocupación' },
  { value: 'otro', label: 'Otro' },
];

export default function StepHousingVisit({ data, update }: Props) {
  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition-all focus:border-ungrd-400 focus:outline-none focus:ring-2 focus:ring-ungrd-100';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Visita a la vivienda</h2>
        <p className="mt-1 text-sm text-slate-500">
          Dirección, tipo de vivienda y servicios afectados.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Dirección / Ubicación <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.address}
          onChange={(e) => update({ address: e.target.value })}
          placeholder="Ej: Cra 5 #12-34 / Finca La Esperanza"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipo de vivienda</label>
          <select
            value={data.housingType}
            onChange={(e) => update({ housingType: e.target.value as HousingVisit['housingType'] })}
            className={inputClass}
          >
            {HOUSING_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Tenencia</label>
          <select
            value={data.ownershipType}
            onChange={(e) => update({ ownershipType: e.target.value as HousingVisit['ownershipType'] })}
            className={inputClass}
          >
            {OWNERSHIP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Familias en esta vivienda <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => update({ numberOfFamilies: Math.max(1, data.numberOfFamilies - 1) })}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-50"
          >
            -
          </button>
          <span className="flex h-10 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-lg font-bold text-slate-900">
            {data.numberOfFamilies}
          </span>
          <button
            type="button"
            onClick={() => update({ numberOfFamilies: data.numberOfFamilies + 1 })}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-50"
          >
            +
          </button>
          <span className="text-xs text-slate-400">
            {data.numberOfFamilies} jefe(s) de hogar esperado(s)
          </span>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Servicios públicos afectados
        </label>
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'waterAffected' as const, label: 'Agua potable', icon: Droplets },
            { key: 'sewerAffected' as const, label: 'Alcantarillado', icon: Home },
            { key: 'electricityAffected' as const, label: 'Energía eléctrica', icon: Zap },
          ]).map((svc) => (
            <button
              key={svc.key}
              type="button"
              onClick={() => update({ [svc.key]: !data[svc.key] })}
              className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                data[svc.key]
                  ? 'border-red-400 bg-red-50 text-red-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              <svc.icon className="h-4 w-4" />
              {svc.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
