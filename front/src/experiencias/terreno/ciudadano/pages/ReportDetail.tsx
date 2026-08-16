import { Link } from 'react-router-dom';
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
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react';
import { StatusBadge, SeverityBadge } from '@/shared/components/StatusBadge';
import EmergencyIcon from '@/shared/components/EmergencyIcon';
import Timeline from '@/shared/components/Timeline';
import {
  construirPasosSeguimiento,
  useCopiarCodigo,
  useSeguimientoReporte,
} from '@/experiencias/terreno/ciudadano/hooks/useSeguimientoReporte';
import type { PasoSeguimiento } from '@/experiencias/terreno/ciudadano/hooks/useSeguimientoReporte';

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

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

function estiloDelPaso(paso: PasoSeguimiento): string {
  if (paso.actual) {
    return 'bg-ungrd-600 ring-4 ring-ungrd-100';
  }
  if (paso.cumplido) {
    return 'bg-ungrd-500';
  }
  return 'border-2 border-slate-200 bg-white';
}

export default function ReportDetail() {
  const { t } = useTranslation();
  const { codigo, reporte, esRecienCreado } = useSeguimientoReporte();
  const { resultado: resultadoCopia, copiar } = useCopiarCodigo();

  if (!reporte) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-semibold text-slate-800">{t('reportDetail.notFound')}</p>
        <p className="mt-2 text-sm text-slate-500">{t('reportDetail.notFoundBody', { codigo })}</p>
        <Link to="/mis-reportes" className="btn-primary mt-6 inline-flex">
          {t('reportDetail.seeMyReports')}
        </Link>
      </div>
    );
  }

  const pasos = construirPasosSeguimiento(reporte);
  const esAfectado = reporte.reportType === 'afectado';
  // Cero es un dato válido y es justo la denuncia: no hubo inversión de prevención en esta zona.
  const gastoPublico = reporte.publicSpending;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:py-12 animate-fade-in">
      <Link
        to="/mis-reportes"
        className="btn-ghost mb-6 -ml-3 gap-1.5 text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('reportDetail.backToMyReports')}
      </Link>

      {esRecienCreado && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5" role="status">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-bold text-emerald-900">
                {esAfectado ? t('reportDetail.created.affectedTitle') : t('reportDetail.created.witnessTitle')}
              </p>
              <p className="mt-1 text-sm text-emerald-800 leading-relaxed">
                {esAfectado ? t('reportDetail.created.affectedBody') : t('reportDetail.created.witnessBody')}
              </p>
              <p className="mt-2 text-sm font-medium text-emerald-900">
                {t('reportDetail.created.saveCode')}
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                {t('reportDetail.created.selfReported')}
              </span>
            </div>
          </div>
          {esAfectado && (
            <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm text-emerald-900 leading-relaxed">
              <span className="font-semibold">{t('reportDetail.created.remember')} </span>
              {t('reportDetail.created.rememberBody')}
            </p>
          )}
        </div>
      )}

      <div className="card p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="hidden sm:block">
            <EmergencyIcon type={reporte.type} size="lg" />
          </div>
          <div className="sm:hidden">
            <EmergencyIcon type={reporte.type} size="md" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => { void copiar(reporte.id); }}
                className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-mono text-slate-600 hover:bg-slate-200 transition-colors"
                aria-label={t('reportDetail.copyId', { codigo: reporte.id })}
              >
                {reporte.id}
                {resultadoCopia === 'copiado' && <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />}
                {resultadoCopia === 'fallido' && <TriangleAlert className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />}
                {resultadoCopia === 'inactivo' && <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
              <StatusBadge status={reporte.status} />
              <SeverityBadge severity={reporte.prioridad} />
            </div>
            <p role="status" aria-live="polite" className="mt-1 text-xs">
              {resultadoCopia === 'copiado' && (
                <span className="text-emerald-700">{t('reportDetail.copied')}</span>
              )}
              {resultadoCopia === 'fallido' && (
                <span className="text-amber-700">{t('reportDetail.copyFailed')}</span>
              )}
            </p>
            <h1 className="mt-2 text-xl font-bold text-slate-800 lg:text-2xl">
              {reporte.title}
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {reporte.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {reporte.location}
              </span>
              <span className="text-xs text-slate-400">
                {t('reportDetail.reportedOn', { date: formatDate(reporte.createdAt) })}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">{t('reportDetail.cycleProgress')}</h2>
          <ol className="mt-4">
            {pasos.map((paso, indice) => {
              const esUltimo = indice === pasos.length - 1;
              const siguienteCumplido = !esUltimo && pasos[indice + 1].cumplido;

              return (
                <li key={paso.estado} className="relative flex gap-3 pb-5 last:pb-0">
                  {!esUltimo && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-[13px] top-8 h-[calc(100%-24px)] w-0.5 ${
                        siguienteCumplido ? 'bg-ungrd-300' : 'bg-slate-200'
                      }`}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${estiloDelPaso(paso)}`}
                  >
                    {paso.cumplido ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                    )}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className={`text-sm ${paso.cumplido ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
                      {t(`status.${paso.estado}`)}
                      {!paso.actual && (
                        <span className="sr-only">
                          {' '}
                          {paso.cumplido ? t('reportDetail.stepDone') : t('reportDetail.stepPending')}
                        </span>
                      )}
                    </p>
                    {paso.actual && (
                      <p className="text-xs font-medium text-ungrd-600">{t('reportDetail.stepCurrent')}</p>
                    )}
                    {paso.fecha !== null && (
                      <p className="text-xs text-slate-400">{formatShortDate(paso.fecha)}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 sm:grid-cols-2">
        {reporte.satelliteVerified && (
          <div className="card p-5 border-l-4 border-l-emerald-400">
            <div className="flex items-center gap-2 mb-2">
              <Satellite className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <p className="text-sm font-semibold text-emerald-700">{t('reportDetail.satelliteVerified')}</p>
            </div>
            <p className="text-sm text-slate-600">{t('reportDetail.satelliteBody')}</p>
            <button type="button" className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
              {t('reportDetail.seeSatellite')} <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        )}

        {gastoPublico !== undefined && (
          <div className="card p-5 border-l-4 border-l-gold-500">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="h-5 w-5 text-gold-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-gold-800">{t('reportDetail.publicSpending')}</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {formatCurrency(gastoPublico)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {gastoPublico === 0 ? t('reportDetail.spendingNone') : t('reportDetail.spendingBody')}
            </p>
            <button type="button" className="mt-3 flex items-center gap-1 text-xs font-medium text-gold-800 hover:text-gold-900">
              {t('reportDetail.seeSecop')} <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 sm:mt-8">
        <h2 className="text-base font-bold text-slate-800 mb-3 sm:text-lg sm:mb-5">{t('reportDetail.history')}</h2>
        <div className="card p-4 sm:p-6">
          <Timeline events={reporte.timeline} />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:gap-3">
        <button type="button" className="btn-secondary">
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {t('reportDetail.share')}
        </button>
        <Link to="/ayudas" className="btn-secondary">
          {t('reportDetail.seeAid')}
        </Link>
      </div>
    </div>
  );
}
