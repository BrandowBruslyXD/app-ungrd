import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Clock,
  ListChecks,
  MapPin,
  Percent,
  Satellite,
  TrendingUp,
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
 * cronología de seguimiento.
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
  const { resumen, cargando, fallo } = useResumenGestor();

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
      color: 'text-gold-700 bg-gold-50',
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="border-b border-slate-200 bg-white px-4 py-4 lg:px-8 lg:py-5">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-slate-800 lg:text-2xl">
                {t('manager.title')}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{t('manager.subtitle')}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 sm:px-3 sm:py-1.5 sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {t('manager.online')}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8 lg:py-6">
        {cargando && (
          <p role="status" className="mb-3 text-sm text-slate-500">
            {t('gestor.resumenCargando')}
          </p>
        )}
        {fallo && (
          <p role="status" className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {t('gestor.resumenError')}
          </p>
        )}

        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:mb-8 lg:grid-cols-6">
          {tarjetas.map(({ clave, etiqueta, valor, icono: Icono, color }) => (
            <div key={clave} className="card p-3 sm:p-4">
              <div
                className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg sm:mb-2 sm:h-8 sm:w-8 ${color}`}
              >
                <Icono className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
              </div>
              <p className="text-base font-bold text-slate-800 sm:text-xl">{valor}</p>
              <p className="text-[10px] text-slate-500 sm:text-xs">{etiqueta}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-1">
            <h2 className="mb-2 text-sm font-bold text-slate-800 sm:mb-3 sm:text-base">
              {t('manager.opsMap')}
            </h2>
            <div className="card overflow-hidden">
              <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 sm:h-80">
                <div className="text-center">
                  <MapPin className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                  <p className="mt-2 text-xs text-slate-400">{t('manager.mapHint')}</p>
                </div>
              </div>
              <div className="border-t border-slate-100 bg-slate-50 p-2.5 sm:p-3">
                <div className="flex flex-wrap gap-2 text-[11px] sm:gap-3 sm:text-xs">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> {t('manager.legendCritical')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-orange-500" /> {t('manager.legendHigh')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> {t('manager.legendMedium')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />{' '}
                    {t('manager.legendResolved')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-sm font-bold text-slate-800 sm:text-base">{t('gestor.colaTitulo')}</h2>
            <p className="mb-2 text-xs text-slate-500 sm:mb-3">{t('gestor.colaApoyo')}</p>

            {cola.length === 0 ? (
              <div className="card p-6 text-center text-sm text-slate-500">
                {t('gestor.colaVacia')}
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
          </div>
        </div>
      </div>
    </div>
  );
}
