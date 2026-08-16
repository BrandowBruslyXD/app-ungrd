import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Satellite, Banknote, ExternalLink, Check, FileQuestion } from 'lucide-react';
import { useReporte } from '@/hooks/useReportesApi';
import { Cargando, ErrorAlCargar } from '@/components/ui/EstadoDeCarga';
import { SeverityBadge } from '@/components/shared/StatusBadge';
import EmergencyIcon from '@/components/shared/EmergencyIcon';
import Timeline from '@/components/shared/Timeline';
import TalonSeguimiento from '@/components/ui/TalonSeguimiento';
import EscaleraConfianza from '@/components/ui/EscaleraConfianza';
import EncabezadoPagina from '@/components/ui/EncabezadoPagina';
import Ficha from '@/components/ui/Ficha';
import BotonCompartir from '@/components/ui/BotonCompartir';
import MapaUbicacion from '@/components/ui/MapaUbicacion';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import type { ReportStatus } from '@/types';

/** El ciclo completo del contrato de API, en orden. */
const CICLO: readonly ReportStatus[] = [
  'Reportado',
  'Verificado',
  'Asignado',
  'EnAtencion',
  'Atendido',
  'Cerrado',
];

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatearPesos(monto: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(monto);
}

/**
 * Seguimiento de un reporte.
 *
 * Es la pantalla que sostiene la promesa del producto: «el ciudadano ve avanzar
 * la cronología». Dos correcciones de fondo respecto al diseño anterior:
 *
 * 1. **Fuera la barra de porcentaje.** Calculaba `eventos / 5` y lo mostraba
 *    como «progreso del ciclo». Un reporte con tres anotaciones marcaba 60%
 *    aunque nadie hubiera salido a atenderlo. Era un número inventado sobre un
 *    dato que no significa eso. En su lugar va el ciclo real de estados del
 *    contrato, que sí dice dónde está el caso.
 * 2. **El talón arriba.** Quien abre esta pantalla suele venir a una de dos
 *    cosas: ver en qué va, o buscar el código para dictarlo. Lo segundo estaba
 *    escondido en un botón gris de 12px.
 */
export default function ReportDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { reporte, cargando, error, noExiste, reintentar } = useReporte(id);

  useTituloPagina(
    reporte ? `${t('meta.reportDetail.title')} ${reporte.id}` : t('meta.reportDetail.title'),
    t('meta.reportDetail.description'),
  );

  if (cargando) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
        <Cargando filas={3} etiqueta={`Consultando el reporte ${id ?? ''}`} />
      </div>
    );
  }

  /*
   * Un fallo de red y un código inexistente se ven distinto a propósito. Quien
   * acaba de dictar su código por teléfono necesita saber si se equivocó al
   * escribirlo o si simplemente hay que reintentar: mandarlo a «no encontrado»
   * cuando lo que falló fue la señal le hace creer que su reporte se perdió.
   */
  if (error && !reporte) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <ErrorAlCargar mensaje={error} onReintentar={reintentar} />
      </div>
    );
  }

  if (!reporte || noExiste) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <FileQuestion className="mx-auto h-14 w-14 text-tinta-300" aria-hidden="true" />
        <h1 className="mt-4 text-xl">{t('reportDetail.notFound')}</h1>
        <p className="mt-2 text-tinta-600">{t('reportDetail.notFoundBody', { id })}</p>
        <Link to="/mis-reportes" className="btn-primary mt-7 inline-flex">
          {t('reportDetail.seeMyReports')}
        </Link>
      </div>
    );
  }

  const pasoActual = CICLO.indexOf(reporte.status);

  return (
    <div className="animate-fade-in mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <EncabezadoPagina
        titulo={reporte.title}
        volverA="/mis-reportes"
        volverEtiqueta={t('reportDetail.backToMyReports')}
      />

      <TalonSeguimiento
        codigo={reporte.id}
        nivelConfianza={reporte.trustLevel}
        conAdvertenciaCenso={reporte.reportType === 'afectado'}
      />

      {/* ── Qué pasó ─────────────────────────────────────────────────────── */}
      <div className="mt-6">
        <Ficha>
          <div className="flex items-start gap-4">
            <EmergencyIcon type={reporte.type} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={reporte.prioridad} />
              </div>
              <p className="mt-3 leading-relaxed text-tinta-700">{reporte.description}</p>
              {reporte.location && (
                <p className="mt-3 flex items-center gap-2 font-semibold">
                  <MapPin className="h-5 w-5 shrink-0 text-tinta-500" aria-hidden="true" />
                  {reporte.location}
                </p>
              )}
              <p className="mt-1 text-sm text-tinta-500">
                {t('reportDetail.reportedOn', { date: formatearFecha(reporte.createdAt) })}
              </p>
            </div>
          </div>
        </Ficha>
      </div>

      {/* ── Dónde ocurrió ────────────────────────────────────────────────── */}
      {(reporte.coordinates.lat !== 0 || reporte.coordinates.lng !== 0) && (
        <div className="mt-6">
          <Ficha titulo={t('mapa.tituloReporte')} sinRelleno>
            <MapaUbicacion valor={reporte.coordinates} alto="h-64" />
          </Ficha>
        </div>
      )}

      {/* ── El ciclo real, no un porcentaje ──────────────────────────────── */}
      <div className="mt-6">
        <Ficha titulo={t('reportDetail.cycleProgress')}>
          <ol className="grid gap-2 sm:grid-cols-2">
            {CICLO.map((estado, indice) => {
              const alcanzado = indice <= pasoActual;
              const esActual = indice === pasoActual;
              return (
                <li
                  key={estado}
                  className={`flex items-center gap-3 rounded-control border-2 px-3 py-2.5 ${
                    esActual
                      ? 'border-azul-600 bg-azul-50'
                      : alcanzado
                        ? 'border-transparent bg-tinta-50'
                        : 'border-transparent'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      alcanzado ? 'bg-azul-600 text-white' : 'bg-tinta-200 text-tinta-500'
                    }`}
                    aria-hidden="true"
                  >
                    {alcanzado && !esActual ? (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    ) : (
                      indice + 1
                    )}
                  </span>
                  <span
                    className={`font-semibold ${alcanzado ? 'text-tinta-900' : 'text-tinta-400'}`}
                  >
                    {t(`status.${estado}`)}
                  </span>
                  {esActual && (
                    <span className="ml-auto rounded-full bg-azul-600 px-2 py-0.5 text-xs font-bold uppercase text-white">
                      {t('ui.trustLadder.current')}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </Ficha>
      </div>

      {/* ── Nivel de confianza del dato ──────────────────────────────────── */}
      <div className="mt-6">
        <Ficha titulo={t('landing.trustTitle')}>
          <EscaleraConfianza nivel={reporte.trustLevel} />
        </Ficha>
      </div>

      {/* ── Bloques externos: si el servicio falla, no se dibujan ────────── */}
      {(reporte.satelliteVerified || reporte.publicSpending) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {reporte.satelliteVerified && (
            <div className="ficha border-l-4 border-l-seguro-600 p-5">
              <div className="flex items-center gap-2">
                <Satellite className="h-6 w-6 shrink-0 text-seguro-600" aria-hidden="true" />
                <h3 className="text-lg">{t('reportDetail.satelliteVerified')}</h3>
              </div>
              <p className="mt-2 text-tinta-700">{t('reportDetail.satelliteBody')}</p>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1.5 font-bold text-seguro-700 underline underline-offset-4"
              >
                {t('reportDetail.seeSatellite')}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {reporte.publicSpending && (
            <div className="ficha border-l-4 border-l-oro-500 p-5">
              <div className="flex items-center gap-2">
                <Banknote className="h-6 w-6 shrink-0 text-oro-700" aria-hidden="true" />
                <h3 className="text-lg">{t('reportDetail.publicSpending')}</h3>
              </div>
              <p className="mt-2 text-2xl font-bold">{formatearPesos(reporte.publicSpending)}</p>
              <p className="mt-1 text-sm text-tinta-600">{t('reportDetail.spendingBody')}</p>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1.5 font-bold text-oro-700 underline underline-offset-4"
              >
                {t('reportDetail.seeSecop')}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Cronología ───────────────────────────────────────────────────── */}
      <div className="mt-6">
        <Ficha titulo={t('reportDetail.history')}>
          <Timeline events={reporte.timeline} />
        </Ficha>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <BotonCompartir
          titulo={reporte.title}
          texto={`${t('wizard.submitted.shareText')} ${reporte.id}`}
          className="flex-1"
        />
        <Link to="/ayudas" className="btn-secondary flex-1">
          {t('reportDetail.seeAid')}
        </Link>
      </div>
    </div>
  );
}
