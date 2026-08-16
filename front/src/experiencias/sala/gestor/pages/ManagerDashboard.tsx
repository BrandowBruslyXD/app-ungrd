import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Clock,
  Inbox,
  ListChecks,
  MapPin,
  Percent,
  RotateCcw,
  Satellite,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useColaGestor } from '../hooks/useColaGestor';
import { useResumenGestor } from '../hooks/useResumenGestor';
import FilaReporte from '../components/FilaReporte';

/**
 * El puesto de trabajo del gestor.
 *
 * La cola manda: está ordenada por prioridad y, a igual prioridad, por antigüedad, y desde cada
 * fila se hace avanzar el reporte. Ese cambio es lo que el ciudadano ve aparecer en su
 * cronología de seguimiento. Por eso la cola ocupa la columna ancha y va primero: el mapa
 * acompaña, no decide.
 */

interface Tarjeta {
  clave: string;
  etiqueta: string;
  valor: string;
  icono: LucideIcon;
  color: string;
}

export default function ManagerDashboard() {
  const { t } = useTranslation();
  const { cola, pendientes, porVerificar, codigoGuardando, aviso, cambiarEstado } = useColaGestor();
  const { resumen, cargando, fallo, reintentar } = useResumenGestor();

  const sinDato = '—';
  const tarjetas: Tarjeta[] = [
    {
      clave: 'hoy',
      etiqueta: t('gestor.statHoy'),
      valor: resumen === null ? sinDato : String(resumen.totalHoy),
      icono: TrendingUp,
      color: 'text-ungrd-600 bg-ungrd-50',
    },
    {
      clave: 'atendidos',
      etiqueta: t('gestor.statAtendidos'),
      valor: resumen === null ? sinDato : String(resumen.atendidos),
      icono: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      clave: 'porcentaje',
      etiqueta: t('gestor.statPorcentaje'),
      valor: resumen === null ? sinDato : `${resumen.porcentajeAtendidos} %`,
      icono: Percent,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      clave: 'promedio',
      etiqueta: t('gestor.statPromedio'),
      valor:
        resumen === null ? sinDato : t('gestor.minutos', { minutos: resumen.tiempoPromedioMinutos }),
      icono: Clock,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      clave: 'cola',
      etiqueta: t('gestor.statEnCola'),
      valor: String(pendientes),
      icono: ListChecks,
      color: 'text-slate-600 bg-slate-100',
    },
    {
      clave: 'verificar',
      etiqueta: t('gestor.statPorVerificar'),
      valor: String(porVerificar),
      icono: Satellite,
      color: 'text-gold-800 bg-gold-100',
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">{t('manager.title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('manager.subtitle')}</p>
        </div>
        <span className="badge shrink-0 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          {t('manager.online')}
        </span>
      </header>

      <section aria-labelledby="titulo-cifras" className="space-y-3">
        <h2 id="titulo-cifras" className="sr-only">
          {t('gestor.cifrasTitulo')}
        </h2>

        {cargando ? (
          <CifrasCargando etiqueta={t('gestor.resumenCargando')} cantidad={tarjetas.length} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {tarjetas.map(({ clave, etiqueta, valor, icono: Icono, color }) => (
              <div key={clave} className="card min-w-0 p-4">
                <div
                  className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${color}`}
                >
                  <Icono className="h-4 w-4" aria-hidden="true" />
                </div>
                {/* Invertido en pantalla para que el ojo caiga en la cifra, sin alterar el
                    orden término → descripción que necesita el lector de pantalla. */}
                <dl className="flex flex-col-reverse">
                  <dt className="mt-0.5 text-xs font-medium text-slate-600">{etiqueta}</dt>
                  <dd className="text-2xl font-bold tabular-nums text-slate-900">{valor}</dd>
                </dl>
              </div>
            ))}
          </div>
        )}

        {fallo && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200"
          >
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{t('gestor.resumenError')}</span>
            <button
              type="button"
              onClick={reintentar}
              className="btn-secondary btn-sm shrink-0"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t('gestor.resumenReintentar')}
            </button>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="titulo-cola" className="min-w-0 lg:col-span-2">
          <h2 id="titulo-cola" className="text-base font-bold text-slate-900">
            {t('gestor.colaTitulo')}
          </h2>
          <p className="mb-3 mt-0.5 text-sm text-slate-600">{t('gestor.colaApoyo')}</p>

          {cola.length === 0 ? (
            <div className="card p-8 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                <Inbox className="h-6 w-6 text-emerald-700" aria-hidden="true" />
              </span>
              <p className="text-base font-semibold text-slate-800">{t('gestor.colaVacia')}</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
                {t('gestor.colaVaciaApoyo')}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {cola.map((fila) => (
                <FilaReporte
                  key={fila.reporte.codigo}
                  fila={fila}
                  guardando={codigoGuardando === fila.reporte.codigo}
                  aviso={aviso !== null && aviso.codigo === fila.reporte.codigo ? aviso : null}
                  onCambiar={(estado, nota) => cambiarEstado(fila.reporte.codigo, estado, nota)}
                />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="titulo-mapa" className="min-w-0">
          <h2 id="titulo-mapa" className="text-base font-bold text-slate-900">
            {t('manager.opsMap')}
          </h2>
          <p className="mb-3 mt-0.5 text-sm text-slate-600">{t('manager.mapHint')}</p>

          <div className="card overflow-hidden">
            <div className="flex h-56 items-center justify-center bg-slate-100 lg:h-72">
              <MapPin className="h-9 w-9 text-slate-400" aria-hidden="true" />
            </div>
            <div className="border-t border-slate-200 bg-slate-50 p-3">
              <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-700">
                {[
                  { clave: 'critico', color: 'bg-red-500', texto: t('manager.legendCritical') },
                  { clave: 'alto', color: 'bg-orange-500', texto: t('manager.legendHigh') },
                  { clave: 'medio', color: 'bg-amber-500', texto: t('manager.legendMedium') },
                  {
                    clave: 'resuelto',
                    color: 'bg-emerald-500',
                    texto: t('manager.legendResolved'),
                  },
                ].map(({ clave, color, texto }) => (
                  <li key={clave} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
                    {texto}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

interface CifrasCargandoProps {
  etiqueta: string;
  cantidad: number;
}

/** Esqueletos con la forma de las tarjetas: la fila de cifras no salta al llegar los datos. */
function CifrasCargando({ etiqueta, cantidad }: CifrasCargandoProps) {
  return (
    <div role="status" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <span className="sr-only">{etiqueta}</span>
      {Array.from({ length: cantidad }, (_, posicion) => (
        <div key={posicion} className="card p-4" aria-hidden="true">
          <div className="mb-2 h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-7 w-16 animate-pulse rounded bg-slate-200" />
          <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
