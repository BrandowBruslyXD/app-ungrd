import { useState } from 'react';
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
import type { WizardFamily, WizardPerson, DocumentType, Sexo, Parentesco } from '@/types/edan';
import { DOCUMENT_TYPE_LABELS, PARENTESCO_LABELS } from '@/types/edan';

interface Props {
  families: WizardFamily[];
  onUpdateFamilies: (families: WizardFamily[]) => void;
  createBlankPerson: () => WizardPerson;
}

export default function StepPeopleRegistration({ families, onUpdateFamilies, createBlankPerson }: Props) {
  const [expandedFamily, setExpandedFamily] = useState(0);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(
    families[0]?.persons[0]?.id ?? null
  );

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-ungrd-500 focus:outline-none focus:ring-2 focus:ring-ungrd-500/20';

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
        <h2 className="text-lg font-bold text-slate-900">Registro de personas</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cada familia debe tener exactamente un(a) jefe de hogar.
        </p>
      </div>

      {families.map((family, fi) => {
        const headCount = getHeadCount(family);
        const headError = headCount !== 1;

        return (
          <div key={family.id} className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedFamily(expandedFamily === fi ? -1 : fi)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ungrd-100 text-ungrd-600">
                  <Users className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-sm font-semibold text-slate-800">Familia {fi + 1}</span>
                  <span className="text-xs text-slate-400">{family.persons.length} persona(s)</span>
                  {headError && (
                    <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                      <AlertCircle className="h-3 w-3" />
                      {headCount === 0 ? 'Sin jefe' : 'Varios jefes'}
                    </span>
                  )}
                </div>
              </div>
              {expandedFamily === fi ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
            </button>

            {expandedFamily === fi && (
              <div className="border-t border-slate-200 px-3 py-3 space-y-2 sm:px-4 sm:py-4 sm:space-y-3">
                {family.persons.map((person, pi) => (
                  <div key={person.id} className="rounded-lg border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setExpandedPerson(expandedPerson === person.id ? null : person.id)}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left sm:px-4"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ungrd-50 text-xs font-bold text-ungrd-600">
                          {pi + 1}
                        </span>
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {person.firstName || person.lastName
                            ? `${person.firstName} ${person.lastName}`.trim()
                            : `Persona ${pi + 1}`}
                        </span>
                        {person.parentesco === 'jefe_hogar' && (
                          <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-semibold text-gold-800">Jefe</span>
                        )}
                        {person.isPregnant && <Baby className="h-3.5 w-3.5 text-pink-500 shrink-0" />}
                        {person.condicionSalud === 'herido' && <Heart className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {family.persons.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removePerson(fi, person.id); }}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {expandedPerson === person.id ? <ChevronUp className="h-4 w-4 text-slate-300" /> : <ChevronDown className="h-4 w-4 text-slate-300" />}
                      </div>
                    </button>

                    {expandedPerson === person.id && (
                      <div className="border-t border-slate-100 px-3 py-3 space-y-3 sm:px-4 sm:py-4 sm:space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Nombres <span className="text-red-500">*</span></label>
                            <input type="text" value={person.firstName} onChange={(e) => updatePerson(fi, person.id, { firstName: e.target.value })} className={inputClass} />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Apellidos <span className="text-red-500">*</span></label>
                            <input type="text" value={person.lastName} onChange={(e) => updatePerson(fi, person.id, { lastName: e.target.value })} className={inputClass} />
                          </div>
                        </div>

                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Tipo doc.</label>
                            <select value={person.documentType} onChange={(e) => updatePerson(fi, person.id, { documentType: e.target.value as DocumentType })} className={inputClass}>
                              {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">No. documento</label>
                            <input type="text" value={person.documentNumber} onChange={(e) => updatePerson(fi, person.id, { documentNumber: e.target.value })} className={inputClass} />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <label className="mb-1 block text-xs font-medium text-slate-600">Fecha nacimiento</label>
                            <input type="date" value={person.birthDate} onChange={(e) => updatePerson(fi, person.id, { birthDate: e.target.value })} className={inputClass} />
                          </div>
                        </div>

                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Sexo</label>
                            <select value={person.sexo} onChange={(e) => updatePerson(fi, person.id, { sexo: e.target.value as Sexo })} className={inputClass}>
                              <option value="M">Masculino</option>
                              <option value="F">Femenino</option>
                              <option value="otro">Otro</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Parentesco <span className="text-red-500">*</span></label>
                            <select value={person.parentesco} onChange={(e) => updatePerson(fi, person.id, { parentesco: e.target.value as Parentesco })} className={inputClass}>
                              {Object.entries(PARENTESCO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <label className="mb-1 block text-xs font-medium text-slate-600">Grupo étnico</label>
                            <select value={person.grupoEtnico} onChange={(e) => updatePerson(fi, person.id, { grupoEtnico: e.target.value as WizardPerson['grupoEtnico'] })} className={inputClass}>
                              <option value="ninguno">Ninguno</option>
                              <option value="indigena">Indígena</option>
                              <option value="rom">Rom (Gitano)</option>
                              <option value="raizal">Raizal</option>
                              <option value="palenquero">Palenquero</option>
                              <option value="afrodescendiente">Afrodescendiente</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Salud post-evento</label>
                            <select value={person.condicionSalud} onChange={(e) => updatePerson(fi, person.id, { condicionSalud: e.target.value as WizardPerson['condicionSalud'] })} className={inputClass}>
                              <option value="ileso">Ileso</option>
                              <option value="herido">Herido</option>
                              <option value="enfermo">Enfermo</option>
                              <option value="desaparecido">Desaparecido</option>
                              <option value="fallecido">Fallecido</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Discapacidad</label>
                            <select value={person.discapacidad} onChange={(e) => updatePerson(fi, person.id, { discapacidad: e.target.value as WizardPerson['discapacidad'] })} className={inputClass}>
                              <option value="ninguna">Ninguna</option>
                              <option value="fisica">Física</option>
                              <option value="visual">Visual</option>
                              <option value="auditiva">Auditiva</option>
                              <option value="cognitiva">Cognitiva</option>
                              <option value="multiple">Múltiple</option>
                            </select>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <label className="mb-1 block text-xs font-medium text-slate-600">Obs. salud</label>
                            <input type="text" value={person.healthNotes} onChange={(e) => updatePerson(fi, person.id, { healthNotes: e.target.value })} placeholder="Ej: Hipertenso" className={inputClass} />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: 'isPregnant' as const, label: 'Gestante', show: person.sexo === 'F' },
                            { key: 'isLactating' as const, label: 'Lactante', show: person.sexo === 'F' },
                            { key: 'isMinorUnaccompanied' as const, label: 'Menor no acompañado', show: true },
                          ].filter((f) => f.show).map((flag) => (
                            <label key={flag.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={person[flag.key]}
                                onChange={(e) => updatePerson(fi, person.id, { [flag.key]: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 text-ungrd-600 focus:ring-ungrd-500"
                              />
                              <span className="text-slate-700">{flag.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addPerson(fi)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 hover:border-ungrd-400 hover:text-ungrd-600 transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  Agregar persona
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
