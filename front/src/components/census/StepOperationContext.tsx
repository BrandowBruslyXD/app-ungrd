import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';
import type { CensusWizardState, EdanEventType } from '@/types/edan';
import { EDAN_EVENT_TYPES } from '@/types/edan';
import {
  COLOMBIAN_DEPARTMENTS,
  MUNICIPALITIES_BY_DEPT,
  mockCalamityDeclarations,
} from '@/mocks/mockEdan';

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
    'campo';
  const inputClass = selectClass;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-tinta-900">{t('census.operation.title')}</h2>
        <p className="mt-1 text-sm text-tinta-500">{t('census.operation.subtitle')}</p>
      </div>

      <div>
        <label htmlFor="census-event-type" className="etiqueta">
          {t('census.operation.eventType')} <span className="text-alerta-500">{t('census.requiredMark')}</span>
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
        <label htmlFor="census-event-date" className="etiqueta">
          {t('census.operation.eventDate')} <span className="text-alerta-500">{t('census.requiredMark')}</span>
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
          <label htmlFor="census-departamento" className="etiqueta">
            {t('census.operation.departamento')} <span className="text-alerta-500">{t('census.requiredMark')}</span>
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
          <label htmlFor="census-municipio" className="etiqueta">
            {t('census.operation.municipio')} <span className="text-alerta-500">{t('census.requiredMark')}</span>
          </label>
          <select
            id="census-municipio"
            value={data.municipio}
            onChange={(e) => update({ municipio: e.target.value })}
            disabled={!data.departamento}
            className={`${selectClass} disabled:cursor-not-allowed disabled:bg-tinta-100`}
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
              ? 'border-seguro-200 bg-seguro-50'
              : 'border-espera-200 bg-espera-50'
          }`}
        >
          {activeCalamity ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-seguro-600" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-espera-600" aria-hidden="true" />
          )}
          <div>
            <p className={`text-sm font-semibold ${activeCalamity ? 'text-seguro-800' : 'text-espera-800'}`}>
              {activeCalamity ? t('census.operation.calamityActive') : t('census.operation.calamityNone')}
            </p>
            <p className={`mt-0.5 text-xs ${activeCalamity ? 'text-seguro-600' : 'text-espera-600'}`}>
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
          <p className="etiqueta">
            {t('census.operation.zone')} <span className="text-alerta-500">{t('census.requiredMark')}</span>
          </p>
          <div className="flex gap-3">
            {(['urbano', 'rural'] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => update({ zone: z })}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  data.zone === z
                    ? 'border-azul-500 bg-azul-50 text-azul-700'
                    : 'border-tinta-200 bg-white text-tinta-600 hover:border-tinta-300'
                }`}
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {z === 'urbano' ? t('census.operation.zoneUrban') : t('census.operation.zoneRural')}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="census-zone-name" className="etiqueta">
            {data.zone === 'urbano' ? t('census.operation.zoneNameUrban') : t('census.operation.zoneNameRural')}{' '}
            <span className="text-alerta-500">{t('census.requiredMark')}</span>
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
