import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';
import type { CensusWizardState, EdanEventType } from '@/shared/types/edan';
import { EDAN_EVENT_TYPES } from '@/shared/types/edan';
import {
  COLOMBIAN_DEPARTMENTS,
  MUNICIPALITIES_BY_DEPT,
  mockCalamityDeclarations,
} from '@/shared/mocks/mockEdan';
import MarcaObligatorio from '@/experiencias/terreno/comunes/MarcaObligatorio';

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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{t('census.operation.title')}</h2>
        <p className="mt-1 text-base text-slate-600">{t('census.operation.subtitle')}</p>
      </div>

      <div>
        <label htmlFor="census-event-type" className="field-label">
          {t('census.operation.eventType')} <MarcaObligatorio />
        </label>
        <select
          id="census-event-type"
          value={data.eventType}
          onChange={(e) => update({ eventType: e.target.value as EdanEventType })}
          className="select-field"
        >
          <option value="">{t('census.operation.eventTypePlaceholder')}</option>
          {EDAN_EVENT_TYPES.map((eventType) => (
            <option key={eventType} value={eventType}>{t(`census.eventTypes.${eventType}`)}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="census-event-date" className="field-label">
          {t('census.operation.eventDate')} <MarcaObligatorio />
        </label>
        <input
          id="census-event-date"
          type="date"
          value={data.eventDate}
          onChange={(e) => update({ eventDate: e.target.value })}
          className="input-field"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="census-departamento" className="field-label">
            {t('census.operation.departamento')} <MarcaObligatorio />
          </label>
          <select
            id="census-departamento"
            value={data.departamento}
            onChange={(e) => update({ departamento: e.target.value, municipio: '' })}
            className="select-field"
          >
            <option value="">{t('census.operation.departamentoPlaceholder')}</option>
            {COLOMBIAN_DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="census-municipio" className="field-label">
            {t('census.operation.municipio')} <MarcaObligatorio />
          </label>
          <select
            id="census-municipio"
            value={data.municipio}
            onChange={(e) => update({ municipio: e.target.value })}
            disabled={!data.departamento}
            className="select-field disabled:cursor-not-allowed disabled:bg-slate-100"
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
            activeCalamity ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
          }`}
        >
          {activeCalamity ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          )}
          <div>
            <p className={`text-base font-semibold ${activeCalamity ? 'text-emerald-900' : 'text-amber-900'}`}>
              {activeCalamity ? t('census.operation.calamityActive') : t('census.operation.calamityNone')}
            </p>
            <p className={`mt-0.5 text-base ${activeCalamity ? 'text-emerald-800' : 'text-amber-900'}`}>
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
          <p className="field-label">
            {t('census.operation.zone')} <MarcaObligatorio />
          </p>
          <div className="flex gap-3">
            {(['urbano', 'rural'] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => update({ zone: z })}
                aria-pressed={data.zone === z}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 text-base font-medium transition-colors min-h-toque ${
                  data.zone === z
                    ? 'border-ungrd-500 bg-ungrd-50 text-ungrd-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <MapPin className="h-5 w-5" aria-hidden="true" />
                {z === 'urbano' ? t('census.operation.zoneUrban') : t('census.operation.zoneRural')}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="census-zone-name" className="field-label">
            {data.zone === 'urbano' ? t('census.operation.zoneNameUrban') : t('census.operation.zoneNameRural')}{' '}
            <MarcaObligatorio />
          </label>
          <input
            id="census-zone-name"
            type="text"
            value={data.zoneName}
            onChange={(e) => update({ zoneName: e.target.value })}
            placeholder={data.zone === 'urbano' ? t('census.operation.zoneNameUrbanPlaceholder') : t('census.operation.zoneNameRuralPlaceholder')}
            className="input-field"
          />
        </div>
      </div>
    </div>
  );
}
