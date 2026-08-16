import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  MapPin,
  Satellite,
  Banknote,
  Share2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import { getReporte } from '@/shared/api/reportes';
import { StatusBadge, SeverityBadge } from '@/shared/components/StatusBadge';
import EmergencyIcon from '@/shared/components/EmergencyIcon';
import Timeline from '@/shared/components/Timeline';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

export default function ReportDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const report = id ? getReporte(id) : undefined;

  if (!report) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-semibold text-slate-800">{t('reportDetail.notFound')}</p>
        <p className="mt-2 text-sm text-slate-500">{t('reportDetail.notFoundBody', { id })}</p>
        <Link to="/mis-reportes" className="btn-primary mt-6 inline-flex">
          {t('reportDetail.seeMyReports')}
        </Link>
      </div>
    );
  }

  const handleCopy = () => {
    void navigator.clipboard?.writeText(report.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const completedSteps = report.timeline.length;
  const totalSteps = 5;
  const progress = Math.min((completedSteps / totalSteps) * 100, 100);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:py-12 animate-fade-in">
      <Link
        to="/mis-reportes"
        className="btn-ghost mb-6 -ml-3 gap-1.5 text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('reportDetail.backToMyReports')}
      </Link>

      <div className="card p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="hidden sm:block">
            <EmergencyIcon type={report.type} size="lg" />
          </div>
          <div className="sm:hidden">
            <EmergencyIcon type={report.type} size="md" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-500 hover:bg-slate-200 transition-colors"
                aria-label={copied ? t('reportDetail.copied') : t('reportDetail.copyId')}
              >
                {report.id}
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </button>
              <StatusBadge status={report.status} />
              <SeverityBadge severity={report.prioridad} />
            </div>
            <h1 className="mt-2 text-xl font-bold text-slate-800 lg:text-2xl">
              {report.title}
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {report.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {report.location}
              </span>
              <span className="text-xs text-slate-400">
                {t('reportDetail.reportedOn', { date: formatDate(report.createdAt) })}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-700">{t('reportDetail.cycleProgress')}</p>
            <p className="text-sm font-semibold text-ungrd-600">{Math.round(progress)}%</p>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ungrd-600 to-gold-500 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-400">
            <span>{t('reportDetail.received')}</span>
            <span>{t('reportDetail.verified')}</span>
            <span>{t('reportDetail.inCare')}</span>
            <span>{t('reportDetail.resolved')}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 sm:grid-cols-2">
        {report.satelliteVerified && (
          <div className="card p-5 border-l-4 border-l-emerald-400">
            <div className="flex items-center gap-2 mb-2">
              <Satellite className="h-5 w-5 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-700">{t('reportDetail.satelliteVerified')}</p>
            </div>
            <p className="text-sm text-slate-600">{t('reportDetail.satelliteBody')}</p>
            <button type="button" className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
              {t('reportDetail.seeSatellite')} <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        )}

        {report.publicSpending && (
          <div className="card p-5 border-l-4 border-l-gold-500">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="h-5 w-5 text-gold-700" />
              <p className="text-sm font-semibold text-gold-800">{t('reportDetail.publicSpending')}</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {formatCurrency(report.publicSpending)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{t('reportDetail.spendingBody')}</p>
            <button type="button" className="mt-3 flex items-center gap-1 text-xs font-medium text-gold-700 hover:text-gold-800">
              {t('reportDetail.seeSecop')} <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 sm:mt-8">
        <h2 className="text-base font-bold text-slate-800 mb-3 sm:text-lg sm:mb-5">{t('reportDetail.history')}</h2>
        <div className="card p-4 sm:p-6">
          <Timeline events={report.timeline} />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:gap-3">
        <button type="button" className="btn-secondary">
          <Share2 className="h-4 w-4" />
          {t('reportDetail.share')}
        </button>
        <Link to="/ayudas" className="btn-secondary">
          {t('reportDetail.seeAid')}
        </Link>
      </div>
    </div>
  );
}
