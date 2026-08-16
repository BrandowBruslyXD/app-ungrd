import { useTranslation } from 'react-i18next';
import { Droplets, Home, Zap } from 'lucide-react';
import type { CensusWizardState, HousingVisit } from '@/shared/types/edan';
import MarcaObligatorio from '@/experiencias/terreno/comunes/MarcaObligatorio';
import Contador from '@/experiencias/terreno/comunes/Contador';

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

  const services = [
    { key: 'waterAffected' as const, labelKey: 'census.housing.water', icon: Droplets },
    { key: 'sewerAffected' as const, labelKey: 'census.housing.sewer', icon: Home },
    { key: 'electricityAffected' as const, labelKey: 'census.housing.electricity', icon: Zap },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{t('census.housing.title')}</h2>
        <p className="mt-1 text-base text-slate-600">{t('census.housing.subtitle')}</p>
      </div>

      <div>
        <label htmlFor="census-address" className="field-label">
          {t('census.housing.address')} <MarcaObligatorio />
        </label>
        <input
          id="census-address"
          type="text"
          value={data.address}
          onChange={(e) => update({ address: e.target.value })}
          placeholder={t('census.housing.addressPlaceholder')}
          className="input-field"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="census-housing-type" className="field-label">
            {t('census.housing.housingType')}
          </label>
          <select
            id="census-housing-type"
            value={data.housingType}
            onChange={(e) => update({ housingType: e.target.value as HousingVisit['housingType'] })}
            className="select-field"
          >
            {HOUSING_TYPE_KEYS.map((value) => (
              <option key={value} value={value}>{t(`census.housingTypes.${value}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="census-ownership" className="field-label">
            {t('census.housing.ownership')}
          </label>
          <select
            id="census-ownership"
            value={data.ownershipType}
            onChange={(e) => update({ ownershipType: e.target.value as HousingVisit['ownershipType'] })}
            className="select-field"
          >
            {OWNERSHIP_TYPE_KEYS.map((value) => (
              <option key={value} value={value}>{t(`census.ownershipTypes.${value}`)}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p id="census-families-label" className="field-label">
          {t('census.housing.families')} <MarcaObligatorio />
        </p>
        <div className="flex flex-wrap items-center gap-3" role="group" aria-labelledby="census-families-label">
          <Contador
            valor={data.numberOfFamilies}
            onCambiar={(delta) => update({ numberOfFamilies: Math.max(1, data.numberOfFamilies + delta) })}
            enMinimo={data.numberOfFamilies <= 1}
            etiquetaDisminuir={t('census.a11y.decreaseFamilies')}
            etiquetaAumentar={t('census.a11y.increaseFamilies')}
          />
          <span className="text-base text-slate-600">
            {t('census.housing.headsExpected', { count: data.numberOfFamilies })}
          </span>
        </div>
      </div>

      <div>
        <p className="field-label">{t('census.housing.services')}</p>
        <div className="flex flex-wrap gap-2">
          {services.map((svc) => (
            <button
              key={svc.key}
              type="button"
              onClick={() => update({ [svc.key]: !data[svc.key] })}
              aria-pressed={data[svc.key]}
              className={`flex items-center gap-2 rounded-xl border-2 px-4 text-base font-medium transition-colors min-h-toque ${
                data[svc.key]
                  ? 'border-red-500 bg-red-50 text-red-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <svc.icon className="h-5 w-5" aria-hidden="true" />
              {t(svc.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
