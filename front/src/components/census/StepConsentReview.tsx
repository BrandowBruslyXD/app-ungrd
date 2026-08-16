import { useTranslation } from 'react-i18next';
import {
  Shield,
  MapPin,
  Home,
  Users,
  AlertTriangle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import type { CensusWizardState } from '@/types/edan';

interface Props {
  data: CensusWizardState;
  update: (partial: Partial<CensusWizardState>) => void;
}

export default function StepConsentReview({ data, update }: Props) {
  const { t } = useTranslation();
  const totalPersons = data.families.reduce((sum, f) => sum + f.persons.length, 0);
  const headOfHouseholds = data.families
    .map((f) => f.persons.find((p) => p.parentesco === 'jefe_hogar'))
    .filter(Boolean);

  const damageText = data.damageStructural
    ? t('census.consent.damageWithStructural', {
        aggregate: t(`census.damageAggregate.${data.damageAggregate}`),
        structural: t(`census.damageStructural.${data.damageStructural}`),
      })
    : t('census.consent.damageLabel', {
        aggregate: t(`census.damageAggregate.${data.damageAggregate}`),
      });

  const checks = [
    {
      ok: headOfHouseholds.length === data.families.length,
      label: t('census.consent.checkHeads', { heads: headOfHouseholds.length, families: data.families.length }),
    },
    { ok: data.families.every((f) => f.needs.length > 0), label: t('census.consent.checkNeeds') },
    { ok: !!data.damageAggregate, label: t('census.consent.checkDamage') },
    { ok: totalPersons > 0, label: t('census.consent.checkPersons', { count: totalPersons }) },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-tinta-900">{t('census.consent.title')}</h2>
        <p className="mt-1 text-sm text-tinta-500">{t('census.consent.subtitle')}</p>
      </div>

      <div className="rounded-xl border-2 border-azul-200 bg-azul-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-azul-600" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-bold text-azul-900">{t('census.consent.privacyTitle')}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-azul-700">
              {t('census.consent.legalText', {
                municipio: data.municipio || t('census.consent.municipioFallback'),
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-tinta-200 bg-white p-4 sm:p-5">
        <h3 className="text-sm font-bold text-tinta-900">{t('census.consent.summaryTitle')}</h3>

        <div className="flex items-start gap-3 border-b border-tinta-100 pb-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-azul-500" aria-hidden="true" />
          <div className="text-sm min-w-0">
            <p className="font-medium text-tinta-900">
              {data.eventType ? t(`census.eventTypes.${data.eventType}`) : t('incident.emptyValue')}
            </p>
            <p className="text-xs text-tinta-500 truncate">
              {data.eventDate} -- {data.zoneName}, {data.municipio}, {data.departamento}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 border-b border-tinta-100 pb-3">
          <Home className="mt-0.5 h-4 w-4 shrink-0 text-espera-500" aria-hidden="true" />
          <div className="text-sm min-w-0">
            <p className="font-medium text-tinta-900 truncate">{data.address}</p>
            <p className="text-xs text-tinta-500">{damageText}</p>
            {data.affectedGoods.length > 0 && (
              <p className="mt-1 text-xs text-tinta-400 truncate">
                {data.affectedGoods.map((g) => t(`census.affectedGoods.${g}`)).join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 border-b border-tinta-100 pb-3">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-azul-600" aria-hidden="true" />
          <div className="text-sm min-w-0">
            <p className="font-medium text-tinta-900">
              {t('census.consent.familiesPersons', { families: data.families.length, persons: totalPersons })}
            </p>
            {data.families.map((f, i) => {
              const head = f.persons.find((p) => p.parentesco === 'jefe_hogar');
              const headName = head ? `${head.firstName} ${head.lastName}` : t('census.consent.noHead');
              return (
                <p key={f.id} className="text-xs text-tinta-500 truncate">
                  {t('census.consent.familyLine', { index: i + 1, head: headName, count: f.persons.length })}
                </p>
              );
            })}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-oro-800" aria-hidden="true" />
          <div className="text-sm min-w-0">
            <p className="font-medium text-tinta-900">{t('census.consent.needsTitle')}</p>
            {data.families.map((f, i) => (
              <p key={f.id} className="text-xs text-tinta-500 truncate">
                {t('census.consent.familyNeeds', {
                  index: i + 1,
                  needs: f.needs.length > 0
                    ? f.needs.map((n) => t(`census.needCategories.${n}`)).join(', ')
                    : t('census.consent.noNeeds'),
                })}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-tinta-200 bg-tinta-50 p-4">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-tinta-500">{t('census.consent.checksTitle')}</h3>
        <div className="space-y-1.5">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center gap-2 text-sm">
              {check.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-seguro-500" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-espera-500" aria-hidden="true" />
              )}
              <span className={check.ok ? 'text-tinta-700' : 'font-medium text-espera-700'}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <label htmlFor="census-consent" className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-tinta-200 bg-white p-4 transition-colors hover:border-azul-300">
        <input
          id="census-consent"
          type="checkbox"
          checked={data.consentGranted}
          onChange={(e) => update({ consentGranted: e.target.checked })}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-tinta-300 text-azul-600 focus:ring-azul-500"
        />
        <div>
          <p className="text-sm font-medium text-tinta-900">{t('census.consent.authorizeTitle')}</p>
          <p className="mt-0.5 text-xs text-tinta-500">{t('census.consent.authorizeText')}</p>
        </div>
      </label>
    </div>
  );
}
