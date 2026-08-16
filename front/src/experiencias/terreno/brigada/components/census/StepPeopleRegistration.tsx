import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserPlus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  AlertCircle,
  Baby,
  Heart,
} from 'lucide-react';
import type { WizardFamily, WizardPerson, DocumentType, Sexo, Parentesco, GrupoEtnico, Discapacidad, CondicionSalud } from '@/shared/types/edan';
import MarcaObligatorio from '@/experiencias/terreno/comunes/MarcaObligatorio';

interface Props {
  families: WizardFamily[];
  onUpdateFamilies: (families: WizardFamily[]) => void;
  createBlankPerson: () => WizardPerson;
}

const DOCUMENT_TYPES: readonly DocumentType[] = ['CC', 'TI', 'CE', 'PA', 'RC', 'PEP', 'PPT', 'sin_documento'];
const SEXO_OPTIONS: readonly Sexo[] = ['M', 'F', 'otro'];
const PARENTESCO_OPTIONS: readonly Parentesco[] = [
  'jefe_hogar', 'conyuge', 'hijo', 'padre_madre', 'hermano', 'nieto', 'abuelo', 'otro_pariente', 'no_pariente',
];
const ETHNIC_OPTIONS: readonly GrupoEtnico[] = ['ninguno', 'indigena', 'rom', 'raizal', 'palenquero', 'afrodescendiente'];
const HEALTH_OPTIONS: readonly CondicionSalud[] = ['ileso', 'herido', 'enfermo', 'desaparecido', 'fallecido'];
const DISABILITY_OPTIONS: readonly Discapacidad[] = ['ninguna', 'fisica', 'visual', 'auditiva', 'cognitiva', 'multiple'];

export default function StepPeopleRegistration({ families, onUpdateFamilies, createBlankPerson }: Props) {
  const { t } = useTranslation();
  const [expandedFamily, setExpandedFamily] = useState(0);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(
    families[0]?.persons[0]?.id ?? null
  );

  const updatePerson = (familyIdx: number, personId: string, partial: Partial<WizardPerson>) => {
    const updated = families.map((f, fi) => {
      if (fi !== familyIdx) return f;
      return { ...f, persons: f.persons.map((p) => (p.id === personId ? { ...p, ...partial } : p)) };
    });
    onUpdateFamilies(updated);
  };

  const addPerson = (familyIdx: number) => {
    const newPerson = { ...createBlankPerson(), parentesco: 'hijo' as Parentesco };
    const updated = families.map((f, fi) => {
      if (fi !== familyIdx) return f;
      return { ...f, persons: [...f.persons, newPerson] };
    });
    onUpdateFamilies(updated);
    setExpandedPerson(newPerson.id);
  };

  /**
   * Quitar a alguien borra datos que ya se escribieron a mano en la calle, así que se confirma.
   * Un toque accidental en un botón de 44 px es fácil; volver a pedir la cédula, no.
   */
  const removePerson = (familyIdx: number, personId: string, displayName: string) => {
    if (!window.confirm(t('census.people.removePersonConfirm', { name: displayName }))) {
      return;
    }
    const updated = families.map((f, fi) => {
      if (fi !== familyIdx) return f;
      return { ...f, persons: f.persons.filter((p) => p.id !== personId) };
    });
    onUpdateFamilies(updated);
  };

  const getHeadCount = (family: WizardFamily) =>
    family.persons.filter((p) => p.parentesco === 'jefe_hogar').length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{t('census.people.title')}</h2>
        <p className="mt-1 text-base text-slate-600">{t('census.people.subtitle')}</p>
      </div>

      {families.map((family, fi) => {
        const headCount = getHeadCount(family);
        const headError = headCount !== 1;
        const familyExpanded = expandedFamily === fi;

        return (
          <div key={family.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">
            <button
              type="button"
              onClick={() => setExpandedFamily(familyExpanded ? -1 : fi)}
              aria-expanded={familyExpanded}
              aria-label={familyExpanded
                ? t('census.a11y.collapseFamily', { index: fi + 1 })
                : t('census.a11y.expandFamily', { index: fi + 1 })}
              className="flex w-full items-center justify-between gap-3 px-4 text-left transition-colors hover:bg-slate-100 min-h-toque"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ungrd-100 text-ungrd-700">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-slate-900">
                    {t('census.people.familyLabel', { index: fi + 1 })}
                  </span>
                  <span className="text-sm text-slate-600">
                    {t('census.people.personCount', { count: family.persons.length })}
                  </span>
                  {headError && (
                    <span className="badge bg-red-100 text-red-800">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      {headCount === 0 ? t('census.people.noHead') : t('census.people.severalHeads')}
                    </span>
                  )}
                </span>
              </span>
              {familyExpanded
                ? <ChevronUp className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
                : <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />}
            </button>

            {familyExpanded && (
              <div className="space-y-3 border-t border-slate-200 px-3 py-3 sm:px-4 sm:py-4">
                {family.persons.map((person, pi) => {
                  const displayName = person.firstName || person.lastName
                    ? `${person.firstName} ${person.lastName}`.trim()
                    : t('census.people.personFallback', { index: pi + 1 });
                  const personExpanded = expandedPerson === person.id;

                  return (
                    <div key={person.id} className="rounded-lg border border-slate-200 bg-white">
                      <div className="flex w-full items-center gap-2 px-3 sm:px-4">
                        <button
                          type="button"
                          onClick={() => setExpandedPerson(personExpanded ? null : person.id)}
                          aria-expanded={personExpanded}
                          aria-label={personExpanded
                            ? t('census.a11y.collapsePerson', { name: displayName })
                            : t('census.a11y.expandPerson', { name: displayName })}
                          className="flex min-w-0 flex-1 flex-wrap items-center gap-2 py-2 text-left min-h-toque"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ungrd-50 text-sm font-bold text-ungrd-700">
                            {pi + 1}
                          </span>
                          <span className="min-w-0 truncate text-base font-semibold text-slate-900">{displayName}</span>
                          {person.parentesco === 'jefe_hogar' && (
                            <span className="badge bg-gold-100 text-gold-900">{t('census.people.headBadge')}</span>
                          )}
                          {/* Con etiqueta y no solo el icono: una persona marcada como herida no
                              puede depender de que alguien reconozca un corazón rojo. */}
                          {person.isPregnant && (
                            <span className="badge bg-pink-100 text-pink-800">
                              <Baby className="h-3.5 w-3.5" aria-hidden="true" />
                              {t('census.people.pregnantBadge')}
                            </span>
                          )}
                          {person.condicionSalud === 'herido' && (
                            <span className="badge bg-red-100 text-red-800">
                              <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                              {t('census.people.injuredBadge')}
                            </span>
                          )}
                          <span className="ml-auto shrink-0">
                            {personExpanded
                              ? <ChevronUp className="h-5 w-5 text-slate-500" aria-hidden="true" />
                              : <ChevronDown className="h-5 w-5 text-slate-500" aria-hidden="true" />}
                          </span>
                        </button>
                        {family.persons.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePerson(fi, person.id, displayName)}
                            aria-label={t('census.a11y.removePerson')}
                            className="btn-icon-danger shrink-0"
                          >
                            <Trash2 className="h-5 w-5" aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      {personExpanded && (
                        <div className="space-y-4 border-t border-slate-100 px-3 py-3 sm:px-4 sm:py-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label htmlFor={`person-${person.id}-firstName`} className="field-label">
                                {t('census.people.firstName')} <MarcaObligatorio />
                              </label>
                              <input id={`person-${person.id}-firstName`} type="text" value={person.firstName} onChange={(e) => updatePerson(fi, person.id, { firstName: e.target.value })} className="input-field" />
                            </div>
                            <div>
                              <label htmlFor={`person-${person.id}-lastName`} className="field-label">
                                {t('census.people.lastName')} <MarcaObligatorio />
                              </label>
                              <input id={`person-${person.id}-lastName`} type="text" value={person.lastName} onChange={(e) => updatePerson(fi, person.id, { lastName: e.target.value })} className="input-field" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div>
                              <label htmlFor={`person-${person.id}-docType`} className="field-label">
                                {t('census.people.documentType')}
                              </label>
                              <select id={`person-${person.id}-docType`} value={person.documentType} onChange={(e) => updatePerson(fi, person.id, { documentType: e.target.value as DocumentType })} className="select-field">
                                {DOCUMENT_TYPES.map((k) => <option key={k} value={k}>{t(`census.documentTypes.${k}`)}</option>)}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`person-${person.id}-docNumber`} className="field-label">
                                {t('census.people.documentNumber')}
                              </label>
                              <input id={`person-${person.id}-docNumber`} type="text" inputMode="numeric" value={person.documentNumber} onChange={(e) => updatePerson(fi, person.id, { documentNumber: e.target.value })} className="input-field" />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <label htmlFor={`person-${person.id}-birthDate`} className="field-label">
                                {t('census.people.birthDate')}
                              </label>
                              <input id={`person-${person.id}-birthDate`} type="date" value={person.birthDate} onChange={(e) => updatePerson(fi, person.id, { birthDate: e.target.value })} className="input-field" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div>
                              <label htmlFor={`person-${person.id}-sexo`} className="field-label">
                                {t('census.people.sexo')}
                              </label>
                              <select id={`person-${person.id}-sexo`} value={person.sexo} onChange={(e) => updatePerson(fi, person.id, { sexo: e.target.value as Sexo })} className="select-field">
                                {SEXO_OPTIONS.map((k) => <option key={k} value={k}>{t(`census.sexo.${k}`)}</option>)}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`person-${person.id}-parentesco`} className="field-label">
                                {t('census.people.parentesco')} <MarcaObligatorio />
                              </label>
                              <select id={`person-${person.id}-parentesco`} value={person.parentesco} onChange={(e) => updatePerson(fi, person.id, { parentesco: e.target.value as Parentesco })} className="select-field">
                                {PARENTESCO_OPTIONS.map((k) => <option key={k} value={k}>{t(`census.parentesco.${k}`)}</option>)}
                              </select>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <label htmlFor={`person-${person.id}-etnia`} className="field-label">
                                {t('census.people.ethnicGroup')}
                              </label>
                              <select id={`person-${person.id}-etnia`} value={person.grupoEtnico} onChange={(e) => updatePerson(fi, person.id, { grupoEtnico: e.target.value as GrupoEtnico })} className="select-field">
                                {ETHNIC_OPTIONS.map((k) => <option key={k} value={k}>{t(`census.grupoEtnico.${k}`)}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div>
                              <label htmlFor={`person-${person.id}-salud`} className="field-label">
                                {t('census.people.health')}
                              </label>
                              <select id={`person-${person.id}-salud`} value={person.condicionSalud} onChange={(e) => updatePerson(fi, person.id, { condicionSalud: e.target.value as CondicionSalud })} className="select-field">
                                {HEALTH_OPTIONS.map((k) => <option key={k} value={k}>{t(`census.condicionSalud.${k}`)}</option>)}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`person-${person.id}-discapacidad`} className="field-label">
                                {t('census.people.disability')}
                              </label>
                              <select id={`person-${person.id}-discapacidad`} value={person.discapacidad} onChange={(e) => updatePerson(fi, person.id, { discapacidad: e.target.value as Discapacidad })} className="select-field">
                                {DISABILITY_OPTIONS.map((k) => <option key={k} value={k}>{t(`census.discapacidad.${k}`)}</option>)}
                              </select>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <label htmlFor={`person-${person.id}-healthNotes`} className="field-label">
                                {t('census.people.healthNotes')}
                              </label>
                              <input
                                id={`person-${person.id}-healthNotes`}
                                type="text"
                                value={person.healthNotes}
                                onChange={(e) => updatePerson(fi, person.id, { healthNotes: e.target.value })}
                                placeholder={t('census.people.healthNotesPlaceholder')}
                                className="input-field"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {[
                              { key: 'isPregnant' as const, labelKey: 'census.people.pregnant', show: person.sexo === 'F' },
                              { key: 'isLactating' as const, labelKey: 'census.people.lactating', show: person.sexo === 'F' },
                              { key: 'isMinorUnaccompanied' as const, labelKey: 'census.people.unaccompaniedMinor', show: true },
                            ].filter((flag) => flag.show).map((flag) => {
                              const fieldId = `person-${person.id}-${flag.key}`;
                              return (
                                <label
                                  key={flag.key}
                                  htmlFor={fieldId}
                                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-base hover:bg-slate-50 min-h-toque"
                                >
                                  <input
                                    id={fieldId}
                                    type="checkbox"
                                    checked={person[flag.key]}
                                    onChange={(e) => updatePerson(fi, person.id, { [flag.key]: e.target.checked })}
                                    className="h-5 w-5 shrink-0 rounded border-slate-400 text-ungrd-600 focus:ring-ungrd-500"
                                  />
                                  <span className="text-slate-800">{t(flag.labelKey)}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => addPerson(fi)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 text-base font-semibold text-slate-600 transition-colors hover:border-ungrd-400 hover:text-ungrd-700 min-h-toque"
                >
                  <UserPlus className="h-5 w-5" aria-hidden="true" />
                  {t('census.people.addPerson')}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
