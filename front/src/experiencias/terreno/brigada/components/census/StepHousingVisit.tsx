import { useTranslation } from 'react-i18next';
import { Droplets, Home, Zap } from 'lucide-react';
import type { CensusWizardState, HousingVisit } from '@/shared/types/edan';

interface Props {
  data: CensusWizardState;
  update: (partial: Partial<CensusWizardState>) => void;
}

const HOUSING_TYPE_KEYS: readonly HousingVisit['housingType'][] = [
  'casa',
  'apartamento',
  'habitacion',
  'improvisada',
  'otro',
];

const OWNERSHIP_TYPE_KEYS: readonly HousingVisit['ownershipType'][] = [
  'propia',
  'arriendo',
  'prestada',
  'invasion',
  'otro',
];

export default function StepHousingVisit({ data, update }: Props) {
  const { t } = useTranslation();
  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition-all focus:border-ungrd-400 focus:outline-none focus:ring-2 focus:ring-ungrd-100';

  const services = [
    { key: 'waterAffected' as const, labelKey: 'census.housing.water', icon: Droplets },
    { key: 'sewerAffected' as const, labelKey: 'census.housing.sewer', icon: Home },
    { key: 'electricityAffected' as const, labelKey: 'census.housing.electricity', icon: Zap },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{t('census.housing.title')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('census.housing.subtitle')}</p>
      </div>

      <div>
        <label htmlFor="census-address" className="mb-1.5 block text-sm font-medium text-slate-700">
          {t('census.housing.address')} <span className="text-red-500">{t('census.requiredMark')}</span>
        </label>
        <input
          id="census-address"
          type="text"
          value={data.address}
          onChange={(e) => update({ address: e.target.value })}
          placeholder={t('census.housing.addressPlaceholder')}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="census-housing-type" className="mb-1.5 block text-sm font-medium text-slate-700">
            {t('census.housing.housingType')}
          </label>
          <select
            id="census-housing-type"
            value={data.housingType}
            onChange={(e) => update({ housingType: e.target.value as HousingVisit['housingType'] })}
            className={inputClass}
          >
            {HOUSING_TYPE_KEYS.map((value) => (
              <option key={value} value={value}>{t(`census.housingTypes.${value}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="census-ownership" className="mb-1.5 block text-sm font-medium text-slate-700">
            {t('census.housing.ownership')}
          </label>
          <select
            id="census-ownership"
            value={data.ownershipType}
            onChange={(e) => update({ ownershipType: e.target.value as HousingVisit['ownershipType'] })}
            className={inputClass}
          >
            {OWNERSHIP_TYPE_KEYS.map((value) => (
              <option key={value} value={value}>{t(`census.ownershipTypes.${value}`)}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="mb-1.5 block text-sm font-medium text-slate-700">
          {t('census.housing.families')} <span className="text-red-500">{t('census.requiredMark')}</span>
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => update({ numberOfFamilies: Math.max(1, data.numberOfFamilies - 1) })}
            aria-label={t('census.a11y.decreaseFamilies')}
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
            aria-label={t('census.a11y.increaseFamilies')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-50"
          >
            +
          </button>
          <span className="text-xs text-slate-400">
            {t('census.housing.headsExpected', { count: data.numberOfFamilies })}
          </span>
        </div>
      </div>

      <div>
        <p className="mb-2 block text-sm font-medium text-slate-700">{t('census.housing.services')}</p>
        <div className="flex flex-wrap gap-2">
          {services.map((svc) => (
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
              <svc.icon className="h-4 w-4" aria-hidden="true" />
              {t(svc.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
