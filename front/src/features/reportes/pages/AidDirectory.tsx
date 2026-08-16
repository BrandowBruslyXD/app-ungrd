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
import { listAyudas } from '@/api/reportes';
import type { AidItem } from '@/types';

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
    disponible: { label: t('aid.available'), icon: CheckCircle2, class: 'text-emerald-600 bg-emerald-50' },
    agotado: { label: t('aid.exhausted'), icon: AlertTriangle, class: 'text-red-600 bg-red-50' },
    proximo: { label: t('aid.upcoming'), icon: Clock, class: 'text-amber-600 bg-amber-50' },
  };
  const status = statusConfig[item.status];
  const StatusIcon = status.icon;

  return (
    <div className="rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={expanded}
        aria-label={expanded ? t('aid.collapseAid', { title: item.title }) : t('aid.expandAid', { title: item.title })}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{item.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
            <Building className="h-3 w-3" />
            {item.entity}
          </p>
        </div>
        <span className={`badge flex items-center gap-1 ${status.class}`}>
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 animate-slide-up">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {t('aid.requirements')}
            </p>
            <ul className="space-y-1.5">
              {item.requirements.map((req) => (
                <li key={req} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ungrd-500" />
                  {req}
                </li>
              ))}
            </ul>
          </div>

          {item.lostDocsAlternative && (
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
              <div className="flex items-start gap-2">
                <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 mb-0.5">
                    {t('aid.lostDocs')}
                  </p>
                  <p className="text-xs text-amber-600 leading-relaxed">
                    {item.lostDocsAlternative}
                  </p>
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
    <div className="mx-auto max-w-3xl px-4 py-8 lg:py-12 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t('aid.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('aid.subtitle')}</p>
      </div>

      <div className="mb-6 rounded-2xl bg-ungrd-50 border border-ungrd-100 p-4">
        <p className="text-sm font-semibold text-ungrd-800 mb-1">{t('aid.noticeTitle')}</p>
        <p className="text-sm text-ungrd-600 leading-relaxed">{t('aid.noticeBody')}</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" aria-hidden="true" />
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

      <div className="space-y-4">
        {filteredCategories.map((category) => {
          const Icon = categoryIcons[category.icon] || HeartHandshake;
          const isOpen = openCategory === category.id;

          return (
            <div key={category.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenCategory(isOpen ? null : category.id)}
                className="flex w-full items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
                aria-expanded={isOpen}
                aria-label={isOpen ? t('aid.collapseCategory', { title: category.title }) : t('aid.expandCategory', { title: category.title })}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ungrd-50 text-ungrd-600">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-slate-800">{category.title}</p>
                  <p className="text-sm text-slate-500">{category.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-slate-100 text-slate-600">
                    {category.items.length}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3 animate-slide-up">
                  {category.items.map((item) => (
                    <AidItemCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="py-12 text-center">
          <Search className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            {t('aid.noResults', { query: searchQuery })}
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-2 text-sm text-ungrd-600 hover:text-ungrd-700"
          >
            {t('aid.clearSearch')}
          </button>
        </div>
      )}
    </div>
  );
}
