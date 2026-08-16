import { useTranslation } from 'react-i18next';
import { Home, AlertTriangle } from 'lucide-react';
import type { CensusWizardState, HousingDamageAggregate, HousingDamageStructural, AffectedGood } from '@/shared/types/edan';
import MarcaObligatorio from '@/experiencias/terreno/comunes/MarcaObligatorio';

interface Props {
  data: CensusWizardState;
  update: (partial: Partial<CensusWizardState>) => void;
}

const DAMAGE_AGGREGATE: readonly { value: HousingDamageAggregate; color: string }[] = [
  { value: 'sin_dano', color: 'border-emerald-400 bg-emerald-50 text-emerald-800' },
  { value: 'averiada', color: 'border-amber-400 bg-amber-50 text-amber-800' },
  { value: 'destruida', color: 'border-red-400 bg-red-50 text-red-800' },
];

const DAMAGE_STRUCTURAL: readonly HousingDamageStructural[] = ['leve', 'moderado', 'severo', 'colapso'];

const AFFECTED_GOODS: readonly AffectedGood[] = [
  'enseres_domesticos',
  'electrodomesticos',
  'vehiculo',
  'herramientas',
  'cultivos',
  'animales',
  'documentos',
  'otro',
];

export default function StepDamageAssessment({ data, update }: Props) {
  const { t } = useTranslation();

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
        <h2 className="text-xl font-semibold text-slate-900">{t('census.damage.title')}</h2>
        <p className="mt-1 text-base text-slate-600">{t('census.damage.subtitle')}</p>
      </div>

      <div>
        <p className="field-label">
          <Home className="mr-1 inline h-4 w-4" aria-hidden="true" />
          {t('census.damage.general')} <MarcaObligatorio />
        </p>
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
              <p className="text-base font-bold">{t(`census.damageAggregate.${d.value}`)}</p>
              <p className="mt-1 text-base leading-snug opacity-90">{t(`census.damageAggregateDesc.${d.value}`)}</p>
            </button>
          ))}
        </div>
      </div>

      {data.damageAggregate !== 'sin_dano' && (
        <div>
          <p className="field-label">
            <AlertTriangle className="mr-1 inline h-4 w-4" aria-hidden="true" />
            {t('census.damage.structural')}
          </p>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
            {DAMAGE_STRUCTURAL.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => update({ damageStructural: value })}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  data.damageStructural === value
                    ? 'border-ungrd-500 bg-ungrd-50 text-ungrd-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <p className="text-base font-semibold">{t(`census.damageStructural.${value}`)}</p>
                <p className="mt-0.5 text-base leading-snug text-slate-600">{t(`census.damageStructuralDesc.${value}`)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="census-damage-notes" className="field-label">
          {t('census.damage.notes')}
        </label>
        <textarea
          id="census-damage-notes"
          value={data.damageNotes}
          onChange={(e) => update({ damageNotes: e.target.value })}
          rows={3}
          placeholder={t('census.damage.notesPlaceholder')}
          className="textarea-field"
        />
      </div>

      <div>
        <p className="field-label">{t('census.damage.goods')}</p>
        <div className="grid gap-2 grid-cols-2">
          {AFFECTED_GOODS.map((key) => {
            const fieldId = `census-good-${key}`;
            return (
              <label
                key={key}
                htmlFor={fieldId}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 text-base transition-colors min-h-toque ${
                  data.affectedGoods.includes(key)
                    ? 'border-ungrd-500 bg-ungrd-50 text-ungrd-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  id={fieldId}
                  type="checkbox"
                  checked={data.affectedGoods.includes(key)}
                  onChange={() => toggleGood(key)}
                  className="h-5 w-5 shrink-0 rounded border-slate-400 text-ungrd-600 focus:ring-ungrd-500"
                />
                {t(`census.affectedGoods.${key}`)}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
