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
  HandHeart,
} from 'lucide-react';
import { StatusBadge, SeverityBadge } from '@/shared/components/StatusBadge';
import EmergencyIcon from '@/shared/components/EmergencyIcon';
import Timeline from '@/shared/components/Timeline';
import {
  construirPasosSeguimiento,
  enlaceFirms,
  useCompartirSeguimiento,
  useCopiarCodigo,
  useSeguimientoReporte,
  ENLACE_SECOP,
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

/**
 * El círculo de cada paso.
 *
 * Cumplido, en curso y pendiente tienen que distinguirse de un vistazo y con el sol encima: el
 * relleno cambia, el símbolo cambia (check contra punto hueco) y el paso en curso lleva anillo
 * dorado. El color nunca es la única señal.
 */
function estiloDelPaso(paso: PasoSeguimiento): string {
  if (paso.actual) {
    return 'bg-ungrd-600 ring-4 ring-gold-300';
  }
  if (paso.cumplido) {
    return 'bg-ungrd-500';
  }
  return 'border-2 border-dashed border-slate-300 bg-white';
}

export default function ReportDetail() {
  const { t } = useTranslation();
  const { codigo, reporte, esRecienCreado } = useSeguimientoReporte();
  const { resultado: resultadoCopia, copiar } = useCopiarCodigo();
  const { resultado: resultadoCompartir, compartir } = useCompartirSeguimiento();

  if (!reporte) {
    return (
      <div className="py-12 text-center">
        <p className="text-xl font-bold text-slate-800">{t('reportDetail.notFound')}</p>
        <p className="mx-auto mt-2 max-w-md text-base text-slate-600">
          {t('reportDetail.notFoundBody', { codigo })}
        </p>
        <Link to="/mis-reportes" className="btn-primary mt-6">
          {t('reportDetail.seeMyReports')}
        </Link>
      </div>
    );
  }

  const pasos = construirPasosSeguimiento(reporte);
  const cumplidos = pasos.filter((paso) => paso.cumplido).length;
  const esAfectado = reporte.reportType === 'afectado';
  // Cero es un dato válido y es justo la denuncia: no hubo inversión de prevención en esta zona.
  const gastoPublico = reporte.publicSpending;
  // Los dos bloques de prueba desaparecen enteros cuando no hay dato: media tarjeta vacía en una
  // pantalla de seguimiento se lee como un error de la app.
  const hayPruebas = reporte.satelliteVerified || gastoPublico !== undefined;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        to="/mis-reportes"
        className="-ml-1 inline-flex items-center gap-2 text-base font-medium text-ungrd-700 transition-colors hover:text-ungrd-800 min-h-toque"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        {t('reportDetail.backToMyReports')}
      </Link>

      {esRecienCreado && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5" role="status">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-700" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold text-emerald-900">
                {esAfectado ? t('reportDetail.created.affectedTitle') : t('reportDetail.created.witnessTitle')}
              </p>
              <p className="mt-1 text-base leading-relaxed text-emerald-800">
                {esAfectado ? t('reportDetail.created.affectedBody') : t('reportDetail.created.witnessBody')}
              </p>
              <p className="mt-2 text-base font-semibold text-emerald-900">
                {t('reportDetail.created.saveCode')}
              </p>
              <span className="badge badge-lg mt-2 bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                {t('reportDetail.created.selfReported')}
              </span>
            </div>
          </div>
          {esAfectado && (
            <p className="mt-3 rounded-xl bg-white/70 p-3 text-base leading-relaxed text-emerald-900">
              <span className="font-semibold">{t('reportDetail.created.remember')} </span>
              {t('reportDetail.created.rememberBody')}
            </p>
          )}
        </div>
      )}

      <div className="card-pad">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="hidden sm:block">
            <EmergencyIcon type={reporte.type} size="lg" />
          </div>
          <div className="sm:hidden">
            <EmergencyIcon type={reporte.type} size="md" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { void copiar(reporte.id); }}
                className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 font-mono text-sm text-slate-700 transition-colors hover:bg-slate-200 min-h-toque"
                aria-label={t('reportDetail.copyId', { codigo: reporte.id })}
              >
                {reporte.id}
                {resultadoCopia === 'copiado' && <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />}
                {resultadoCopia === 'fallido' && <TriangleAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />}
                {resultadoCopia === 'inactivo' && <Copy className="h-4 w-4" aria-hidden="true" />}
              </button>
              <StatusBadge status={reporte.status} />
              <SeverityBadge severity={reporte.prioridad} />
            </div>
            <p role="status" aria-live="polite" className="mt-1 text-sm">
              {resultadoCopia === 'copiado' && (
                <span className="text-emerald-700">{t('reportDetail.copied')}</span>
              )}
              {resultadoCopia === 'fallido' && (
                <span className="text-amber-800">{t('reportDetail.copyFailed')}</span>
              )}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{reporte.title}</h1>
            <p className="mt-2 text-base leading-relaxed text-slate-700">{reporte.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-slate-600">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
                {reporte.location}
              </span>
              <span className="text-sm text-slate-500">
                {t('reportDetail.reportedOn', { date: formatDate(reporte.createdAt) })}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold text-slate-900">{t('reportDetail.timelineTitle')}</h2>
            <p className="text-sm font-medium text-slate-600">
              {t('reportDetail.stepsDone', { cumplidos, total: pasos.length })}
            </p>
          </div>
          <ol className="mt-4">
            {pasos.map((paso, indice) => {
              const esUltimo = indice === pasos.length - 1;
              const siguienteCumplido = !esUltimo && pasos[indice + 1].cumplido;

              return (
                <li key={paso.estado} className="relative flex gap-3 pb-6 last:pb-0">
                  {!esUltimo && (
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-0 left-[18px] top-10 w-0.5 -translate-x-1/2 ${
                        siguienteCumplido ? 'bg-ungrd-400' : 'bg-slate-200'
                      }`}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${estiloDelPaso(paso)}`}
                  >
                    {paso.cumplido ? (
                      <Check className="h-5 w-5 text-white" strokeWidth={2.5} />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    )}
                  </span>
                  <div className="min-w-0 pt-1.5">
                    <p
                      className={`text-base ${
                        paso.actual
                          ? 'font-bold text-ungrd-800'
                          : paso.cumplido
                            ? 'font-semibold text-slate-900'
                            : 'text-slate-500'
                      }`}
                    >
                      {t(`status.${paso.estado}`)}
                      {!paso.actual && (
                        <span className="sr-only">
                          {' '}
                          {paso.cumplido ? t('reportDetail.stepDone') : t('reportDetail.stepPending')}
                        </span>
                      )}
                    </p>
                    {paso.actual && (
                      <p className="text-sm font-semibold text-ungrd-700">{t('reportDetail.stepCurrent')}</p>
                    )}
                    {paso.fecha !== null && (
                      <p className="text-sm text-slate-500">{formatShortDate(paso.fecha)}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {hayPruebas && (
        <div className="grid gap-4 sm:grid-cols-2">
          {reporte.satelliteVerified && (
            <div className="card border-l-4 border-l-emerald-500 p-5">
              <div className="mb-2 flex items-center gap-2">
                <Satellite className="h-6 w-6 text-emerald-700" aria-hidden="true" />
                <p className="text-lg font-semibold text-emerald-800">{t('reportDetail.satelliteVerified')}</p>
              </div>
              <p className="text-base leading-relaxed text-slate-700">{t('reportDetail.satelliteBody')}</p>
              <a
                href={enlaceFirms(reporte.coordinates)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-base font-semibold text-emerald-800 underline-offset-2 hover:underline min-h-toque"
              >
                {t('reportDetail.seeSatellite')}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{t('common.opensInNewTab')}</span>
              </a>
            </div>
          )}

          {gastoPublico !== undefined && (
            <div className="card border-l-4 border-l-gold-500 p-5">
              <div className="mb-2 flex items-center gap-2">
                <Banknote className="h-6 w-6 text-gold-800" aria-hidden="true" />
                <p className="text-lg font-semibold text-gold-800">{t('reportDetail.publicSpending')}</p>
              </div>
              <p className="text-3xl font-bold text-slate-900">{formatCurrency(gastoPublico)}</p>
              <p className="mt-1 text-base leading-relaxed text-slate-700">
                {gastoPublico === 0 ? t('reportDetail.spendingNone') : t('reportDetail.spendingBody')}
              </p>
              <a
                href={ENLACE_SECOP}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-base font-semibold text-gold-800 underline-offset-2 hover:underline min-h-toque"
              >
                {t('reportDetail.seeSecop')}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{t('common.opensInNewTab')}</span>
              </a>
            </div>
          )}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-xl font-semibold text-slate-900">{t('reportDetail.history')}</h2>
        <div className="card-pad">
          <Timeline events={reporte.timeline} />
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => { void compartir(t('reportDetail.shareTitle', { codigo: reporte.id })); }}
          className="btn-primary btn-lg"
        >
          <Share2 className="h-5 w-5" aria-hidden="true" />
          {t('reportDetail.share')}
        </button>
        <Link to="/ayudas" className="btn-secondary w-full sm:w-auto">
          <HandHeart className="h-5 w-5" aria-hidden="true" />
          {t('reportDetail.seeAid')}
        </Link>
      </div>
      <p role="status" aria-live="polite" className="text-base">
        {resultadoCompartir === 'copiado' && (
          <span className="text-emerald-700">{t('reportDetail.shareCopied')}</span>
        )}
        {resultadoCompartir === 'fallido' && (
          <span className="text-amber-800">{t('reportDetail.shareFailed')}</span>
        )}
      </p>
    </div>
  );
}
