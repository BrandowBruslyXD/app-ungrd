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
import type { WizardFamily, WizardPerson, DocumentType, Sexo, Parentesco, GrupoEtnico, Discapacidad, CondicionSalud } from '@/types/edan';
import type { ProblemaDocumento } from '@/hooks/useFieldCensus';

interface Props {
  families: WizardFamily[];
  onUpdateFamilies: (families: WizardFamily[]) => void;
  createBlankPerson: () => WizardPerson;
  /**
   * Problemas de documento por persona, calculados sobre todo el censo.
   *
   * Se reciben ya resueltos en vez de calcularlos aquí porque el duplicado solo
   * se puede ver mirando todas las familias a la vez, no una fila.
   */
  problemasDeDocumento: Record<string, ProblemaDocumento>;
}

const DOCUMENT_TYPES: readonly DocumentType[] = ['CC', 'TI', 'CE', 'PA', 'RC', 'PEP', 'PPT', 'sin_documento'];
const SEXO_OPTIONS: readonly Sexo[] = ['M', 'F', 'otro'];
const PARENTESCO_OPTIONS: readonly Parentesco[] = [
  'jefe_hogar', 'conyuge', 'hijo', 'padre_madre', 'hermano', 'nieto', 'abuelo', 'otro_pariente', 'no_pariente',
];
const ETHNIC_OPTIONS: readonly GrupoEtnico[] = ['ninguno', 'indigena', 'rom', 'raizal', 'palenquero', 'afrodescendiente'];
const HEALTH_OPTIONS: readonly CondicionSalud[] = ['ileso', 'herido', 'enfermo', 'desaparecido', 'fallecido'];
const DISABILITY_OPTIONS: readonly Discapacidad[] = ['ninguna', 'fisica', 'visual', 'auditiva', 'cognitiva', 'multiple'];

export default function StepPeopleRegistration({
  families,
  onUpdateFamilies,
  createBlankPerson,
  problemasDeDocumento,
}: Props) {
  const { t } = useTranslation();
  const [expandedFamily, setExpandedFamily] = useState(0);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(
    families[0]?.persons[0]?.id ?? null
  );

  const inputClass =
    'campo';

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

  const removePerson = (familyIdx: number, personId: string) => {
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
        <h2 className="text-lg font-bold text-tinta-900">{t('census.people.title')}</h2>
        <p className="mt-1 text-sm text-tinta-500">{t('census.people.subtitle')}</p>
      </div>

      {families.map((family, fi) => {
        const headCount = getHeadCount(family);
        const headError = headCount !== 1;
        const familyExpanded = expandedFamily === fi;

        return (
          <div key={family.id} className="rounded-xl border border-tinta-200 bg-tinta-50/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedFamily(familyExpanded ? -1 : fi)}
              aria-expanded={familyExpanded}
              aria-label={familyExpanded
                ? t('census.a11y.collapseFamily', { index: fi + 1 })
                : t('census.a11y.expandFamily', { index: fi + 1 })}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-tinta-100 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-azul-100 text-azul-600">
                  <Users className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-sm font-semibold text-tinta-900">{t('census.people.familyLabel', { index: fi + 1 })}</span>
                  <span className="text-xs text-tinta-400">{t('census.people.personCount', { count: family.persons.length })}</span>
                  {headError && (
                    <span className="flex items-center gap-1 rounded-full bg-alerta-100 px-2 py-0.5 text-xs font-medium text-alerta-700">
                      <AlertCircle className="h-3 w-3" aria-hidden="true" />
                      {headCount === 0 ? t('census.people.noHead') : t('census.people.severalHeads')}
                    </span>
                  )}
                </div>
              </div>
              {familyExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-tinta-400" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 shrink-0 text-tinta-400" aria-hidden="true" />}
            </button>

            {familyExpanded && (
              <div className="border-t border-tinta-200 px-3 py-3 space-y-2 sm:px-4 sm:py-4 sm:space-y-3">
                {family.persons.map((person, pi) => {
                  const displayName = person.firstName || person.lastName
                    ? `${person.firstName} ${person.lastName}`.trim()
                    : t('census.people.personFallback', { index: pi + 1 });
                  const personExpanded = expandedPerson === person.id;
                  const problema = problemasDeDocumento[person.id];

                  return (
                    <div
                      key={person.id}
                      className={`rounded-lg border bg-white ${
                        problema ? 'border-alerta-600 ring-1 ring-alerta-200' : 'border-tinta-200'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between px-3 py-2.5 sm:px-4">
                        <button
                          type="button"
                          onClick={() => setExpandedPerson(personExpanded ? null : person.id)}
                          aria-expanded={personExpanded}
                          aria-label={personExpanded
                            ? t('census.a11y.collapsePerson', { name: displayName })
                            : t('census.a11y.expandPerson', { name: displayName })}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left flex-wrap"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-azul-50 text-xs font-bold text-azul-600">
                            {pi + 1}
                          </span>
                          <span className="text-sm font-medium text-tinta-900 truncate">{displayName}</span>
                          {person.parentesco === 'jefe_hogar' && (
                            <span className="rounded-full bg-oro-100 px-2 py-0.5 text-xs font-semibold text-oro-800">
                              {t('census.people.headBadge')}
                            </span>
                          )}
                          {person.isPregnant && <Baby className="h-3.5 w-3.5 text-alerta-600 shrink-0" aria-hidden="true" />}
                          {person.condicionSalud === 'herido' && <Heart className="h-3.5 w-3.5 text-alerta-500 shrink-0" aria-hidden="true" />}
                          {/* El aviso va en la cabecera, no solo dentro: la
                              persona con el error puede estar plegada y el
                              brigadista no encontraría por qué no avanza. */}
                          {problema && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-alerta-50 px-2 py-0.5 text-xs font-bold text-alerta-700">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              {t(`census.people.${problema === 'documento_duplicado' ? 'docDuplicated' : 'docRequired'}`)}
                            </span>
                          )}
                        </button>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {family.persons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePerson(fi, person.id)}
                              aria-label={t('census.a11y.removePerson')}
                              className="rounded p-1 text-tinta-400 hover:bg-alerta-50 hover:text-alerta-500"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedPerson(personExpanded ? null : person.id)}
                            aria-label={personExpanded
                              ? t('census.a11y.collapsePerson', { name: displayName })
                              : t('census.a11y.expandPerson', { name: displayName })}
                            className="rounded p-1 text-tinta-300"
                          >
                            {personExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                          </button>
                        </div>
                      </div>

                      {personExpanded && (
                        <div className="border-t border-tinta-100 px-3 py-3 space-y-3 sm:px-4 sm:py-4 sm:space-y-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label htmlFor={`person-${person.id}-firstName`} className="etiqueta">
                                {t('census.people.firstName')} <span className="text-alerta-500">{t('census.requiredMark')}</span>
                              </label>
                              <input id={`person-${person.id}-firstName`} type="text" value={person.firstName} onChange={(e) => updatePerson(fi, person.id, { firstName: e.target.value })} className={inputClass} />
                            </div>
                            <div>
                              <label htmlFor={`person-${person.id}-lastName`} className="etiqueta">
                                {t('census.people.lastName')} <span className="text-alerta-500">{t('census.requiredMark')}</span>
                              </label>
                              <input id={`person-${person.id}-lastName`} type="text" value={person.lastName} onChange={(e) => updatePerson(fi, person.id, { lastName: e.target.value })} className={inputClass} />
                            </div>
                          </div>

                          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                            <div>
                              <label htmlFor={`person-${person.id}-docType`} className="etiqueta">
                                {t('census.people.documentType')}
                              </label>
                              <select id={`person-${person.id}-docType`} value={person.documentType} onChange={(e) => updatePerson(fi, person.id, { documentType: e.target.value as DocumentType })} className={inputClass}>
                                {DOCUMENT_TYPES.map((k) => <option key={k} value={k}>{t(`census.documentTypes.${k}`)}</option>)}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`person-${person.id}-docNumber`} className="etiqueta">
                                {t('census.people.documentNumber')}
                              </label>
                              <input id={`person-${person.id}-docNumber`} type="text" value={person.documentNumber} onChange={(e) => updatePerson(fi, person.id, { documentNumber: e.target.value })} className={inputClass} />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <label htmlFor={`person-${person.id}-birthDate`} className="etiqueta">
                                {t('census.people.birthDate')}
                              </label>
                              <input id={`person-${person.id}-birthDate`} type="date" value={person.birthDate} onChange={(e) => updatePerson(fi, person.id, { birthDate: e.target.value })} className={inputClass} />
                            </div>
                          </div>

                          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                            <div>
                              <label htmlFor={`person-${person.id}-sexo`} className="etiqueta">
                                {t('census.people.sexo')}
                              </label>
                              <select id={`person-${person.id}-sexo`} value={person.sexo} onChange={(e) => updatePerson(fi, person.id, { sexo: e.target.value as Sexo })} className={inputClass}>
                                {SEXO_OPTIONS.map((k) => <option key={k} value={k}>{t(`census.sexo.${k}`)}</option>)}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`person-${person.id}-parentesco`} className="etiqueta">
                                {t('census.people.parentesco')} <span className="text-alerta-500">{t('census.requiredMark')}</span>
                              </label>
                              <select id={`person-${person.id}-parentesco`} value={person.parentesco} onChange={(e) => updatePerson(fi, person.id, { parentesco: e.target.value as Parentesco })} className={inputClass}>
                                {PARENTESCO_OPTIONS.map((k) => <option key={k} value={k}>{t(`census.parentesco.${k}`)}</option>)}
                              </select>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <label htmlFor={`person-${person.id}-etnia`} className="etiqueta">
                                {t('census.people.ethnicGroup')}
                              </label>
                              <select id={`person-${person.id}-etnia`} value={person.grupoEtnico} onChange={(e) => updatePerson(fi, person.id, { grupoEtnico: e.target.value as GrupoEtnico })} className={inputClass}>
                                {ETHNIC_OPTIONS.map((k) => <option key={k} value={k}>{t(`census.grupoEtnico.${k}`)}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                            <div>
                              <label htmlFor={`person-${person.id}-salud`} className="etiqueta">
                                {t('census.people.health')}
                              </label>
                              <select id={`person-${person.id}-salud`} value={person.condicionSalud} onChange={(e) => updatePerson(fi, person.id, { condicionSalud: e.target.value as CondicionSalud })} className={inputClass}>
                                {HEALTH_OPTIONS.map((k) => <option key={k} value={k}>{t(`census.condicionSalud.${k}`)}</option>)}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`person-${person.id}-discapacidad`} className="etiqueta">
                                {t('census.people.disability')}
                              </label>
                              <select id={`person-${person.id}-discapacidad`} value={person.discapacidad} onChange={(e) => updatePerson(fi, person.id, { discapacidad: e.target.value as Discapacidad })} className={inputClass}>
                                {DISABILITY_OPTIONS.map((k) => <option key={k} value={k}>{t(`census.discapacidad.${k}`)}</option>)}
                              </select>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <label htmlFor={`person-${person.id}-healthNotes`} className="etiqueta">
                                {t('census.people.healthNotes')}
                              </label>
                              <input
                                id={`person-${person.id}-healthNotes`}
                                type="text"
                                value={person.healthNotes}
                                onChange={(e) => updatePerson(fi, person.id, { healthNotes: e.target.value })}
                                placeholder={t('census.people.healthNotesPlaceholder')}
                                className={inputClass}
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
                                <label key={flag.key} htmlFor={fieldId} className="flex cursor-pointer items-center gap-2 rounded-lg border border-tinta-200 px-3 py-2 text-sm hover:bg-tinta-50">
                                  <input
                                    id={fieldId}
                                    type="checkbox"
                                    checked={person[flag.key]}
                                    onChange={(e) => updatePerson(fi, person.id, { [flag.key]: e.target.checked })}
                                    className="h-4 w-4 rounded border-tinta-300 text-azul-600 focus:ring-azul-500"
                                  />
                                  <span className="text-tinta-700">{t(flag.labelKey)}</span>
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
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-tinta-300 py-2.5 text-sm font-medium text-tinta-500 hover:border-azul-400 hover:text-azul-600 transition-colors"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
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
