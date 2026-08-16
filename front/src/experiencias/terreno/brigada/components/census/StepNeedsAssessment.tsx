import { useTranslation } from 'react-i18next';
import { Package, FileText } from 'lucide-react';
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
        <h2 className="text-lg font-bold text-slate-900">{t('census.needs.title')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('census.needs.subtitle')}</p>
      </div>

      {families.map((family, fi) => {
        const headPerson = family.persons.find((p) => p.parentesco === 'jefe_hogar');
        const headName = headPerson
          ? `${headPerson.firstName} ${headPerson.lastName}`.trim()
          : t('census.people.familyLabel', { index: fi + 1 });
        const notesId = `family-${family.id}-needNotes`;

        return (
          <div key={family.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-ungrd-600" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-800">
                {t('census.needs.familyHeading', { index: fi + 1, name: headName })}
              </h3>
              <span className="text-xs text-slate-400">
                {t('census.needs.personCount', { count: family.persons.length })}
              </span>
            </div>

            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {NEED_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleNeed(fi, key)}
                  className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                    family.needs.includes(key)
                      ? 'border-gold-400 bg-gold-50'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <span className={`text-sm font-medium ${family.needs.includes(key) ? 'text-gold-900' : 'text-slate-700'}`}>
                    {t(`census.needCategories.${key}`)}
                  </span>
                </button>
              ))}
            </div>

            <div>
              <label htmlFor={notesId} className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
                <FileText className="h-3 w-3" aria-hidden="true" />
                {t('census.needs.notes')}
              </label>
              <textarea
                id={notesId}
                value={family.needNotes}
                onChange={(e) => updateNotes(fi, e.target.value)}
                rows={2}
                placeholder={t('census.needs.notesPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-ungrd-400 focus:outline-none focus:ring-2 focus:ring-ungrd-100 resize-none"
              />
            </div>

            {family.needs.length === 0 && (
              <p className="mt-2 text-xs text-red-500">{t('census.needs.emptyError')}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
