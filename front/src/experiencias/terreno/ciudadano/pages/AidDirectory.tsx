import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HeartHandshake,
  Banknote,
  FileCheck,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileWarning,
  Search,
} from 'lucide-react';
import { listAyudas } from '@/shared/api/reportes';
import type { AidItem } from '@/shared/types';
import EncabezadoPantalla from '@/experiencias/terreno/comunes/EncabezadoPantalla';
import EstadoVacio from '@/experiencias/terreno/comunes/EstadoVacio';

const categoryIcons: Record<string, typeof HeartHandshake> = {
  'heart-handshake': HeartHandshake,
  banknote: Banknote,
  'file-check': FileCheck,
  stethoscope: Stethoscope,
};

function AidItemCard({ item }: { item: AidItem }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const statusConfig = {
    disponible: { label: t('aid.available'), icon: CheckCircle2, class: 'text-emerald-700 bg-emerald-50' },
    agotado: { label: t('aid.exhausted'), icon: AlertTriangle, class: 'text-red-700 bg-red-50' },
    proximo: { label: t('aid.upcoming'), icon: Clock, class: 'text-amber-700 bg-amber-50' },
  };
  const status = statusConfig[item.status];
  const StatusIcon = status.icon;

  return (
    <div className="card-sub transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left min-h-toque"
        aria-expanded={expanded}
        aria-label={expanded ? t('aid.collapseAid', { title: item.title }) : t('aid.expandAid', { title: item.title })}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-slate-900">{item.title}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
            <Building className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.entity}
          </span>
        </span>
        <span className={`badge badge-lg shrink-0 ${status.class}`}>
          <StatusIcon className="h-4 w-4" aria-hidden="true" />
          {status.label}
        </span>
        {expanded ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="animate-slide-up border-t border-slate-100 px-4 pb-4 pt-3">
          <div className="mb-3">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-600">
              {t('aid.requirements')}
            </p>
            <ul className="space-y-2">
              {item.requirements.map((req) => (
                <li key={req} className="flex items-start gap-2 text-base leading-relaxed text-slate-700">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-ungrd-600" aria-hidden="true" />
                  {req}
                </li>
              ))}
            </ul>
          </div>

          {item.lostDocsAlternative && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
                <div>
                  <p className="mb-0.5 text-base font-semibold text-amber-900">{t('aid.lostDocs')}</p>
                  <p className="text-base leading-relaxed text-amber-900">{item.lostDocsAlternative}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AidDirectory() {
  const { t } = useTranslation();
  const mockAidCategories = listAyudas();
  const [searchQuery, setSearchQuery] = useState('');
  const [openCategory, setOpenCategory] = useState<string | null>(mockAidCategories[0]?.id ?? null);

  const filteredCategories = searchQuery
    ? mockAidCategories
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (item) =>
              item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.entity.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((cat) => cat.items.length > 0)
    : mockAidCategories;

  return (
    <div className="space-y-6 animate-fade-in">
      <EncabezadoPantalla
        icono={HeartHandshake}
        titulo={t('aid.title')}
        descripcion={t('aid.subtitle')}
      />

      <div className="rounded-2xl border border-ungrd-100 bg-ungrd-50 p-4">
        <p className="text-lg font-semibold text-ungrd-900">{t('aid.noticeTitle')}</p>
        <p className="mt-1 text-base leading-relaxed text-ungrd-800">{t('aid.noticeBody')}</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        <label htmlFor="aid-search" className="sr-only">
          {t('aid.searchLabel')}
        </label>
        <input
          id="aid-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('aid.searchPlaceholder')}
          className="input-field pl-10"
        />
      </div>

      {filteredCategories.length === 0 ? (
        <EstadoVacio
          icono={Search}
          titulo={t('aid.noResults', { query: searchQuery })}
          descripcion={t('aid.noResultsBody')}
          accion={
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="btn-secondary w-full sm:w-auto"
            >
              {t('aid.clearSearch')}
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((category) => {
            const Icon = categoryIcons[category.icon] || HeartHandshake;
            const isOpen = openCategory === category.id;

            return (
              <div key={category.id} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenCategory(isOpen ? null : category.id)}
                  className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-slate-50 sm:p-5 min-h-toque"
                  aria-expanded={isOpen}
                  aria-label={isOpen ? t('aid.collapseCategory', { title: category.title }) : t('aid.expandCategory', { title: category.title })}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ungrd-50 text-ungrd-600">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold text-slate-900">{category.title}</span>
                    <span className="block text-base text-slate-600">{category.description}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="badge bg-slate-100 text-sm text-slate-700">{category.items.length}</span>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-slate-500" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-500" aria-hidden="true" />
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="animate-slide-up space-y-3 border-t border-slate-100 bg-slate-50/60 p-4">
                    {category.items.map((item) => (
                      <AidItemCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
