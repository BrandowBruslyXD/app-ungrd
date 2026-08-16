import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AlertCircle, CheckCircle2, Clock, ExternalLink, MapPin } from 'lucide-react';
import type { EstadoReporte } from '@/shared/types/contrato';
import { SeverityBadge, StatusBadge } from '@/shared/components/StatusBadge';
import EmergencyIcon from '@/shared/components/EmergencyIcon';
import CronologiaReporte from '@/shared/components/CronologiaReporte';
import type { AvisoCambio, FilaCola } from '../hooks/useColaGestor';
import CambioEstado from './CambioEstado';

/** Una fila de la cola: lo que el gestor necesita para decidir, y el botón para decidirlo. */

function tiempoTranscurrido(iso: string, t: TFunction): string {
  const milisegundos = Math.max(0, Date.now() - new Date(iso).getTime());
  const horas = Math.floor(milisegundos / (1000 * 60 * 60));
  if (horas < 1) {
    return t('time.lessThanOneHourShort');
  }
  if (horas < 24) {
    return t('time.hoursShort', { hours: horas });
  }
  return t('time.days', { days: Math.floor(horas / 24) });
}

interface Props {
  fila: FilaCola;
  guardando: boolean;
  /** Aviso del último intento sobre este reporte; `null` si el aviso es de otra fila. */
  aviso: AvisoCambio | null;
  onCambiar: (estado: EstadoReporte, nota: string) => Promise<boolean>;
}

export default function FilaReporte({ fila, guardando, aviso, onCambiar }: Props) {
  const { t } = useTranslation();
  const [abierto, setAbierto] = useState(false);
  const { reporte, siguientes } = fila;

  const idPanel = `cambio-${reporte.codigo}`;
  const ultimoEvento = reporte.cronologia[reporte.cronologia.length - 1];

  const guardar = async (estado: EstadoReporte, nota: string): Promise<void> => {
    const guardado = await onCambiar(estado, nota);
    if (guardado) {
      setAbierto(false);
    }
  };

  return (
    <li className="card overflow-hidden">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <EmergencyIcon type={reporte.tipo} size="sm" />

        <div className="min-w-0 flex-1">
          {/* Prioridad y estado van primero: es por donde el gestor decide a qué fila entra. */}
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={reporte.prioridad} />
            <StatusBadge status={reporte.estado} />
            <span className="font-mono text-sm text-slate-500">{reporte.codigo}</span>
          </div>

          <p className="mt-2 text-base font-semibold text-slate-900">{reporte.descripcion}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              {reporte.direccion ?? reporte.municipio}
            </span>
            <span
              className={`flex items-center gap-1.5 ${
                reporte.prioridad === 'Alta' ? 'font-semibold text-slate-700' : ''
              }`}
            >
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('gestor.esperando', { tiempo: tiempoTranscurrido(reporte.creadoEn, t) })}
            </span>
          </div>

          {ultimoEvento !== undefined && (
            <p className="mt-1.5 text-sm text-slate-500">
              {t('gestor.ultimoEvento', {
                estado: t(`status.${ultimoEvento.estado}`),
                responsable: ultimoEvento.responsable,
              })}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {siguientes.length > 0 ? (
            <button
              type="button"
              onClick={() => setAbierto((previo) => !previo)}
              aria-expanded={abierto}
              aria-controls={idPanel}
              aria-label={
                abierto
                  ? t('gestor.cerrarCambioDe', { codigo: reporte.codigo })
                  : t('gestor.cambiarEstadoDe', { codigo: reporte.codigo })
              }
              className="btn-secondary btn-sm"
            >
              {abierto ? t('gestor.cerrarCambio') : t('gestor.cambiarEstado')}
            </button>
          ) : (
            <p className="text-sm text-slate-500 sm:max-w-[200px] sm:text-right">
              {t('gestor.sinAvance')}
            </p>
          )}

          {/* Se abre en otra pestaña a propósito: /reportes/:codigo es una pantalla de terreno y
              volver desde ahí sacaría al gestor de la sala de crisis. */}
          <Link
            to={`/reportes/${reporte.codigo}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('gestor.verSeguimientoDe', { codigo: reporte.codigo })}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-ungrd-700 hover:bg-ungrd-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ungrd-400"
          >
            {t('gestor.verSeguimiento')}
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {aviso !== null && (
        <p
          role={aviso.tipo === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-2 border-t px-4 py-2.5 text-sm ${
            aviso.tipo === 'error'
              ? 'border-red-100 bg-red-50 text-red-700'
              : 'border-emerald-100 bg-emerald-50 text-emerald-700'
          }`}
        >
          {aviso.tipo === 'error' ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {aviso.mensaje}
        </p>
      )}

      <div id={idPanel} hidden={!abierto}>
        {abierto && (
          <>
            <CambioEstado
              codigo={reporte.codigo}
              siguientes={siguientes}
              guardando={guardando}
              onGuardar={(estado, nota) => {
                void guardar(estado, nota);
              }}
              onCancelar={() => setAbierto(false)}
            />
            <div className="border-t border-slate-200 bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-slate-800">
                {t('gestor.cronologiaTitulo')}
              </p>
              <CronologiaReporte eventos={reporte.cronologia} compacta />
            </div>
          </>
        )}
      </div>
    </li>
  );
}
