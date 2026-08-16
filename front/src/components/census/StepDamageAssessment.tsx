import { useTranslation } from 'react-i18next';
import { Home, AlertTriangle } from 'lucide-react';
import type { CensusWizardState, HousingDamageAggregate, HousingDamageStructural, AffectedGood } from '@/types/edan';

interface Props {
  data: CensusWizardState;
  update: (partial: Partial<CensusWizardState>) => void;
}

const DAMAGE_AGGREGATE: readonly { value: HousingDamageAggregate; color: string }[] = [
  { value: 'sin_dano', color: 'border-seguro-400 bg-seguro-50 text-seguro-800' },
  { value: 'averiada', color: 'border-espera-400 bg-espera-50 text-espera-800' },
  { value: 'destruida', color: 'border-alerta-400 bg-alerta-50 text-alerta-800' },
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
        <h2 className="text-lg font-bold text-tinta-900">{t('census.damage.title')}</h2>
        <p className="mt-1 text-sm text-tinta-500">{t('census.damage.subtitle')}</p>
      </div>

      <div>
        <p className="mb-2 block text-sm font-medium text-tinta-700">
          <Home className="mr-1 inline h-4 w-4" aria-hidden="true" />
          {t('census.damage.general')} <span className="text-alerta-500">{t('census.requiredMark')}</span>
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
                  : 'border-tinta-200 bg-white text-tinta-600 hover:border-tinta-300'
              }`}
            >
              <p className="text-sm font-bold">{t(`census.damageAggregate.${d.value}`)}</p>
              <p className="mt-1 text-xs opacity-80">{t(`census.damageAggregateDesc.${d.value}`)}</p>
            </button>
          ))}
        </div>
      </div>

      {data.damageAggregate !== 'sin_dano' && (
        <div>
          <p className="mb-2 block text-sm font-medium text-tinta-700">
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
                    ? 'border-azul-500 bg-azul-50 text-azul-800'
                    : 'border-tinta-200 bg-white text-tinta-600 hover:border-tinta-300'
                }`}
              >
                <p className="text-sm font-semibold">{t(`census.damageStructural.${value}`)}</p>
                <p className="mt-0.5 text-xs text-tinta-500">{t(`census.damageStructuralDesc.${value}`)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="census-damage-notes" className="etiqueta">
          {t('census.damage.notes')}
        </label>
        <textarea
          id="census-damage-notes"
          value={data.damageNotes}
          onChange={(e) => update({ damageNotes: e.target.value })}
          rows={3}
          placeholder={t('census.damage.notesPlaceholder')}
          className="w-full rounded-xl border border-tinta-200 bg-white px-4 py-3 text-sm text-tinta-900 transition-all focus:border-azul-400 focus:outline-none focus:ring-2 focus:ring-azul-100 resize-none"
        />
      </div>

      <div>
        <p className="mb-2 block text-sm font-medium text-tinta-700">{t('census.damage.goods')}</p>
        <div className="grid gap-2 grid-cols-2">
          {AFFECTED_GOODS.map((key) => {
            const fieldId = `census-good-${key}`;
            return (
              <label
                key={key}
                htmlFor={fieldId}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm transition-colors ${
                  data.affectedGoods.includes(key)
                    ? 'border-azul-400 bg-azul-50 text-azul-800'
                    : 'border-tinta-200 bg-white text-tinta-600 hover:border-tinta-300'
                }`}
              >
                <input
                  id={fieldId}
                  type="checkbox"
                  checked={data.affectedGoods.includes(key)}
                  onChange={() => toggleGood(key)}
                  className="h-4 w-4 rounded border-tinta-300 text-azul-600 focus:ring-azul-500"
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
