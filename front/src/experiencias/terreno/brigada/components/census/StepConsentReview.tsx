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
import type { CensusWizardState } from '@/shared/types/edan';

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
        <h2 className="text-xl font-semibold text-slate-900">{t('census.consent.title')}</h2>
        <p className="mt-1 text-base text-slate-600">{t('census.consent.subtitle')}</p>
      </div>

      {/* El texto legal va a 16 px: un consentimiento que no se puede leer no es informado. */}
      <div className="rounded-xl border-2 border-ungrd-200 bg-ungrd-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-6 w-6 shrink-0 text-ungrd-700" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-semibold text-ungrd-900">{t('census.consent.privacyTitle')}</h3>
            <p className="mt-1.5 text-base leading-relaxed text-ungrd-900">
              {t('census.consent.legalText', {
                municipio: data.municipio || t('census.consent.municipioFallback'),
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Nada de `truncate` en este resumen: es exactamente lo que el brigadista revisa antes de
          pedir la firma, así que envuelve en varias líneas si hace falta. */}
      <div className="card-sub space-y-3 p-4 sm:p-5">
        <h3 className="text-lg font-semibold text-slate-900">{t('census.consent.summaryTitle')}</h3>

        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
          <MapPin className="mt-1 h-5 w-5 shrink-0 text-ungrd-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900">
              {data.eventType ? t(`census.eventTypes.${data.eventType}`) : t('incident.emptyValue')}
            </p>
            <p className="text-base text-slate-700">
              {t('census.consent.eventLine', {
                fecha: data.eventDate,
                zona: data.zoneName,
                municipio: data.municipio,
                departamento: data.departamento,
              })}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
          <Home className="mt-1 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900">{data.address}</p>
            <p className="text-base text-slate-700">{damageText}</p>
            {data.affectedGoods.length > 0 && (
              <p className="mt-1 text-base text-slate-600">
                {data.affectedGoods.map((g) => t(`census.affectedGoods.${g}`)).join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
          <Users className="mt-1 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900">
              {t('census.consent.familiesPersons', { families: data.families.length, persons: totalPersons })}
            </p>
            {data.families.map((f, i) => {
              const head = f.persons.find((p) => p.parentesco === 'jefe_hogar');
              const headName = head ? `${head.firstName} ${head.lastName}` : t('census.consent.noHead');
              return (
                <p key={f.id} className="text-base text-slate-700">
                  {t('census.consent.familyLine', { index: i + 1, head: headName, count: f.persons.length })}
                </p>
              );
            })}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Package className="mt-1 h-5 w-5 shrink-0 text-gold-800" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900">{t('census.consent.needsTitle')}</p>
            {data.families.map((f, i) => (
              <p key={f.id} className="text-base text-slate-700">
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

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-600">
          {t('census.consent.checksTitle')}
        </h3>
        <ul className="space-y-2">
          {checks.map((check) => (
            <li key={check.label} className="flex items-start gap-2 text-base">
              {check.ok ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              )}
              <span className={check.ok ? 'text-slate-700' : 'font-semibold text-amber-800'}>
                {check.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <label
        htmlFor="census-consent"
        className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 transition-colors hover:border-ungrd-300"
      >
        <input
          id="census-consent"
          type="checkbox"
          checked={data.consentGranted}
          onChange={(e) => update({ consentGranted: e.target.checked })}
          className="mt-0.5 h-6 w-6 shrink-0 rounded border-slate-400 text-ungrd-600 focus:ring-ungrd-500"
        />
        <span>
          <span className="block text-base font-semibold text-slate-900">{t('census.consent.authorizeTitle')}</span>
          <span className="mt-0.5 block text-base leading-relaxed text-slate-700">
            {t('census.consent.authorizeText')}
          </span>
        </span>
      </label>
    </div>
  );
}
