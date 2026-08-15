import { Home, AlertTriangle } from 'lucide-react';
import type { CensusWizardState, HousingDamageAggregate, HousingDamageStructural, AffectedGood } from '@/types/edan';
import { AFFECTED_GOOD_LABELS } from '@/types/edan';

interface Props {
  data: CensusWizardState;
  update: (partial: Partial<CensusWizardState>) => void;
}

const DAMAGE_AGGREGATE: { value: HousingDamageAggregate; label: string; desc: string; color: string }[] = [
  { value: 'sin_dano', label: 'Sin daño', desc: 'Sin daños visibles', color: 'border-emerald-400 bg-emerald-50 text-emerald-800' },
  { value: 'averiada', label: 'Averiada', desc: 'Daños recuperables', color: 'border-amber-400 bg-amber-50 text-amber-800' },
  { value: 'destruida', label: 'Destruida', desc: 'No habitable ni recuperable', color: 'border-red-400 bg-red-50 text-red-800' },
];

const DAMAGE_STRUCTURAL: { value: HousingDamageStructural; label: string; desc: string }[] = [
  { value: 'leve', label: 'Leve', desc: 'Fisuras finas, acabados' },
  { value: 'moderado', label: 'Moderado', desc: 'Grietas en muros' },
  { value: 'severo', label: 'Severo', desc: 'Estructura comprometida' },
  { value: 'colapso', label: 'Colapso', desc: 'Colapso parcial o total' },
];

export default function StepDamageAssessment({ data, update }: Props) {
  const toggleGood = (good: AffectedGood) => {
    const current = data.affectedGoods;
    update({
      affectedGoods: current.includes(good)
        ? current.filter((g) => g !== good)
        : [...current, good],
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Evaluación de daños</h2>
        <p className="mt-1 text-sm text-slate-500">Categorías oficiales EDAN.</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          <Home className="mr-1 inline h-4 w-4" />
          Estado general <span className="text-red-500">*</span>
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          {DAMAGE_AGGREGATE.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => update({ damageAggregate: d.value })}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                data.damageAggregate === d.value
                  ? `${d.color} ring-2 ring-offset-1`
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-bold">{d.label}</p>
              <p className="mt-1 text-xs opacity-80">{d.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {data.damageAggregate !== 'sin_dano' && (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            <AlertTriangle className="mr-1 inline h-4 w-4" />
            Nivel de daño estructural
          </label>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
            {DAMAGE_STRUCTURAL.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => update({ damageStructural: d.value })}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  data.damageStructural === d.value
                    ? 'border-ungrd-500 bg-ungrd-50 text-ungrd-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <p className="text-sm font-semibold">{d.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{d.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Observaciones de daño</label>
        <textarea
          value={data.damageNotes}
          onChange={(e) => update({ damageNotes: e.target.value })}
          rows={3}
          placeholder="Describa los daños observados..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition-all focus:border-ungrd-400 focus:outline-none focus:ring-2 focus:ring-ungrd-100 resize-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Bienes afectados</label>
        <div className="grid gap-2 grid-cols-2">
          {(Object.entries(AFFECTED_GOOD_LABELS) as [AffectedGood, string][]).map(([key, label]) => (
            <label
              key={key}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm transition-colors ${
                data.affectedGoods.includes(key)
                  ? 'border-ungrd-400 bg-ungrd-50 text-ungrd-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={data.affectedGoods.includes(key)}
                onChange={() => toggleGood(key)}
                className="h-4 w-4 rounded border-slate-300 text-ungrd-600 focus:ring-ungrd-500"
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
