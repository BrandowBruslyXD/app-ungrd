import { useTranslation } from 'react-i18next';
import { Package, FileText, AlertCircle } from 'lucide-react';
import type { WizardFamily, NeedCategory } from '@/shared/types/edan';

interface Props {
  families: WizardFamily[];
  onUpdateFamilies: (families: WizardFamily[]) => void;
}

const NEED_KEYS: readonly NeedCategory[] = [
  'ahe_alimentaria',
  'ahe_no_alimentaria',
  'materiales_rehabilitacion',
  'subsidio_arriendo',
];

export default function StepNeedsAssessment({ families, onUpdateFamilies }: Props) {
  const { t } = useTranslation();

  const toggleNeed = (familyIdx: number, need: NeedCategory) => {
    const updated = families.map((f, fi) => {
      if (fi !== familyIdx) return f;
      const needs = f.needs.includes(need)
        ? f.needs.filter((n) => n !== need)
        : [...f.needs, need];
      return { ...f, needs };
    });
    onUpdateFamilies(updated);
  };

  const updateNotes = (familyIdx: number, notes: string) => {
    const updated = families.map((f, fi) => {
      if (fi !== familyIdx) return f;
      return { ...f, needNotes: notes };
    });
    onUpdateFamilies(updated);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{t('census.needs.title')}</h2>
        <p className="mt-1 text-base text-slate-600">{t('census.needs.subtitle')}</p>
      </div>

      {families.map((family, fi) => {
        const headPerson = family.persons.find((p) => p.parentesco === 'jefe_hogar');
        const headName = headPerson
          ? `${headPerson.firstName} ${headPerson.lastName}`.trim()
          : t('census.people.familyLabel', { index: fi + 1 });
        const notesId = `family-${family.id}-needNotes`;
        const sinNecesidades = family.needs.length === 0;

        return (
          <div key={family.id} className="card-sub p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Package className="h-5 w-5 shrink-0 text-ungrd-600" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-slate-900">
                {t('census.needs.familyHeading', { index: fi + 1, name: headName })}
              </h3>
              <span className="text-sm text-slate-600">
                {t('census.needs.personCount', { count: family.persons.length })}
              </span>
            </div>

            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {NEED_KEYS.map((key) => {
                const marcada = family.needs.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleNeed(fi, key)}
                    aria-pressed={marcada}
                    className={`flex items-center gap-3 rounded-xl border-2 px-3 text-left transition-all min-h-toque ${
                      marcada ? 'border-gold-500 bg-gold-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span className={`text-base font-medium ${marcada ? 'text-gold-900' : 'text-slate-700'}`}>
                      {t(`census.needCategories.${key}`)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div>
              <label htmlFor={notesId} className="mb-1.5 flex items-center gap-1.5 text-base font-semibold text-slate-800">
                <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('census.needs.notes')}
              </label>
              <textarea
                id={notesId}
                value={family.needNotes}
                onChange={(e) => updateNotes(fi, e.target.value)}
                rows={2}
                placeholder={t('census.needs.notesPlaceholder')}
                className="textarea-field"
              />
            </div>

            {/* El error lleva icono además del color: en rojo sobre blanco el color solo no basta. */}
            {sinNecesidades && (
              <p className="mt-2 flex items-start gap-1.5 text-base font-medium text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                {t('census.needs.emptyError')}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
