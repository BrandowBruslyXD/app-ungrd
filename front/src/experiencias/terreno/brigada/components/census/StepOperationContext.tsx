import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';
import type { CensusWizardState, EdanEventType } from '@/shared/types/edan';
import { EDAN_EVENT_TYPES } from '@/shared/types/edan';
import {
  COLOMBIAN_DEPARTMENTS,
  MUNICIPALITIES_BY_DEPT,
  mockCalamityDeclarations,
} from '@/shared/mocks/mockEdan';

interface Props {
  data: CensusWizardState;
  update: (partial: Partial<CensusWizardState>) => void;
}

export default function StepOperationContext({ data, update }: Props) {
  const { t } = useTranslation();
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
        <h2 className="text-lg font-bold text-slate-900">{t('census.operation.title')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('census.operation.subtitle')}</p>
      </div>

      <div>
        <label htmlFor="census-event-type" className="mb-1.5 block text-sm font-medium text-slate-700">
          {t('census.operation.eventType')} <span className="text-red-500">{t('census.requiredMark')}</span>
        </label>
        <select
          id="census-event-type"
          value={data.eventType}
          onChange={(e) => update({ eventType: e.target.value as EdanEventType })}
          className={selectClass}
        >
          <option value="">{t('census.operation.eventTypePlaceholder')}</option>
          {EDAN_EVENT_TYPES.map((eventType) => (
            <option key={eventType} value={eventType}>{t(`census.eventTypes.${eventType}`)}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="census-event-date" className="mb-1.5 block text-sm font-medium text-slate-700">
          {t('census.operation.eventDate')} <span className="text-red-500">{t('census.requiredMark')}</span>
        </label>
        <input
          id="census-event-date"
          type="date"
          value={data.eventDate}
          onChange={(e) => update({ eventDate: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="census-departamento" className="mb-1.5 block text-sm font-medium text-slate-700">
            {t('census.operation.departamento')} <span className="text-red-500">{t('census.requiredMark')}</span>
          </label>
          <select
            id="census-departamento"
            value={data.departamento}
            onChange={(e) => update({ departamento: e.target.value, municipio: '' })}
            className={selectClass}
          >
            <option value="">{t('census.operation.departamentoPlaceholder')}</option>
            {COLOMBIAN_DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="census-municipio" className="mb-1.5 block text-sm font-medium text-slate-700">
            {t('census.operation.municipio')} <span className="text-red-500">{t('census.requiredMark')}</span>
          </label>
          <select
            id="census-municipio"
            value={data.municipio}
            onChange={(e) => update({ municipio: e.target.value })}
            disabled={!data.departamento}
            className={`${selectClass} disabled:cursor-not-allowed disabled:bg-slate-100`}
          >
            <option value="">{t('census.operation.municipioPlaceholder')}</option>
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
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          )}
          <div>
            <p className={`text-sm font-semibold ${activeCalamity ? 'text-emerald-800' : 'text-amber-800'}`}>
              {activeCalamity ? t('census.operation.calamityActive') : t('census.operation.calamityNone')}
            </p>
            <p className={`mt-0.5 text-xs ${activeCalamity ? 'text-emerald-600' : 'text-amber-600'}`}>
              {activeCalamity
                ? t('census.operation.calamityUntil', {
                    decreto: activeCalamity.decretoNumber,
                    date: new Date(activeCalamity.expiryDate).toLocaleDateString('es-CO'),
                  })
                : t('census.operation.calamityHint')}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 block text-sm font-medium text-slate-700">
            {t('census.operation.zone')} <span className="text-red-500">{t('census.requiredMark')}</span>
          </p>
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
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {z === 'urbano' ? t('census.operation.zoneUrban') : t('census.operation.zoneRural')}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="census-zone-name" className="mb-1.5 block text-sm font-medium text-slate-700">
            {data.zone === 'urbano' ? t('census.operation.zoneNameUrban') : t('census.operation.zoneNameRural')}{' '}
            <span className="text-red-500">{t('census.requiredMark')}</span>
          </label>
          <input
            id="census-zone-name"
            type="text"
            value={data.zoneName}
            onChange={(e) => update({ zoneName: e.target.value })}
            placeholder={data.zone === 'urbano' ? t('census.operation.zoneNameUrbanPlaceholder') : t('census.operation.zoneNameRuralPlaceholder')}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
