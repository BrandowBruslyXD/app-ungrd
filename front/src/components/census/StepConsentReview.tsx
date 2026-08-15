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
import { EVENT_TYPE_LABELS, NEED_CATEGORY_LABELS, AFFECTED_GOOD_LABELS } from '@/types/edan';

interface Props {
  data: CensusWizardState;
  update: (partial: Partial<CensusWizardState>) => void;
}

export default function StepConsentReview({ data, update }: Props) {
  const totalPersons = data.families.reduce((sum, f) => sum + f.persons.length, 0);
  const headOfHouseholds = data.families
    .map((f) => f.persons.find((p) => p.parentesco === 'jefe_hogar'))
    .filter(Boolean);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Consentimiento y revisión</h2>
        <p className="mt-1 text-sm text-slate-500">
          Verifique la información y obtenga el consentimiento.
        </p>
      </div>

      <div className="rounded-xl border-2 border-ungrd-200 bg-ungrd-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-ungrd-600" />
          <div>
            <h3 className="text-sm font-bold text-ungrd-900">
              Protección de Datos Personales
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-ungrd-700">
              En cumplimiento de la <strong>Ley 1581 de 2012</strong>, los datos incluyen
              información sensible (salud, etnia, discapacidad). El responsable del tratamiento
              es la UNGRD y/o el municipio de <strong>{data.municipio || '___'}</strong>.
              Finalidad exclusiva: evaluación de daños, análisis de necesidades y canalización
              de ayuda humanitaria. El titular tiene derecho a conocer, actualizar, rectificar
              y solicitar la supresión de sus datos.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-sm font-bold text-slate-800">Resumen del censo</h3>

        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ungrd-500" />
          <div className="text-sm min-w-0">
            <p className="font-medium text-slate-800">
              {data.eventType ? EVENT_TYPE_LABELS[data.eventType as keyof typeof EVENT_TYPE_LABELS] : '--'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {data.eventDate} -- {data.zoneName}, {data.municipio}, {data.departamento}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
          <Home className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="text-sm min-w-0">
            <p className="font-medium text-slate-800 truncate">{data.address}</p>
            <p className="text-xs text-slate-500">
              Daño: <strong>{data.damageAggregate}</strong>
              {data.damageStructural ? ` (${data.damageStructural})` : ''}
            </p>
            {data.affectedGoods.length > 0 && (
              <p className="mt-1 text-xs text-slate-400 truncate">
                {data.affectedGoods.map((g) => AFFECTED_GOOD_LABELS[g]).join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div className="text-sm min-w-0">
            <p className="font-medium text-slate-800">
              {data.families.length} familia(s) -- {totalPersons} persona(s)
            </p>
            {data.families.map((f, i) => {
              const head = f.persons.find((p) => p.parentesco === 'jefe_hogar');
              return (
                <p key={f.id} className="text-xs text-slate-500 truncate">
                  Familia {i + 1}: {head ? `${head.firstName} ${head.lastName}` : 'Sin jefe'} -- {f.persons.length} persona(s)
                </p>
              );
            })}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
          <div className="text-sm min-w-0">
            <p className="font-medium text-slate-800">Necesidades</p>
            {data.families.map((f, i) => (
              <p key={f.id} className="text-xs text-slate-500 truncate">
                Fam. {i + 1}: {f.needs.length > 0 ? f.needs.map((n) => NEED_CATEGORY_LABELS[n]).join(', ') : 'Ninguna'}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Verificaciones</h3>
        <div className="space-y-1.5">
          {[
            { ok: headOfHouseholds.length === data.families.length, label: `Jefes de hogar: ${headOfHouseholds.length}/${data.families.length}` },
            { ok: data.families.every((f) => f.needs.length > 0), label: 'Necesidades registradas por familia' },
            { ok: !!data.damageAggregate, label: 'Evaluación de daño registrada' },
            { ok: totalPersons > 0, label: `${totalPersons} persona(s) registrada(s)` },
          ].map((check, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {check.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              )}
              <span className={check.ok ? 'text-slate-700' : 'font-medium text-amber-700'}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 transition-colors hover:border-ungrd-300">
        <input
          type="checkbox"
          checked={data.consentGranted}
          onChange={(e) => update({ consentGranted: e.target.checked })}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-ungrd-600 focus:ring-ungrd-500"
        />
        <div>
          <p className="text-sm font-medium text-slate-800">
            El/la jefe de hogar autoriza el tratamiento de datos
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Autorizo libre, previa, expresa e informada el tratamiento de los datos personales
            y sensibles aquí consignados, conforme a la Ley 1581 de 2012.
          </p>
        </div>
      </label>
    </div>
  );
}
