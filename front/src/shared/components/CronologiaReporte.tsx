import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { EstadoReporte, EventoCronologia } from '@/shared/types/contrato';

/**
 * La cronología del reporte con la forma del contrato.
 *
 * La comparten las dos experiencias a propósito: es la prueba de que el gestor y el ciudadano
 * están viendo exactamente lo mismo.
 */

const COLOR_POR_ESTADO: Record<EstadoReporte, string> = {
  Reportado: 'bg-slate-400',
  Verificado: 'bg-ungrd-500',
  // gold-700 y no un amarillo más claro: el ícono blanco encima tiene que seguir contrastando.
  Asignado: 'bg-gold-700',
  EnAtencion: 'bg-ungrd-600',
  Atendido: 'bg-blue-600',
  Cerrado: 'bg-emerald-600',
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  eventos: EventoCronologia[];
  /** En listas densas conviene la versión compacta, sin el nombre del responsable en línea. */
  compacta?: boolean;
}

export default function CronologiaReporte({ eventos, compacta = false }: Props) {
  const { t } = useTranslation();

  if (eventos.length === 0) {
    return <p className="text-sm text-slate-500">{t('cronologia.vacia')}</p>;
  }

  return (
    <ol className="relative space-y-0">
      {eventos.map((evento, indice) => {
        const esUltimo = indice === eventos.length - 1;

        return (
          <li key={`${evento.estado}-${evento.fecha}`} className="relative flex gap-3 pb-5 last:pb-0">
            {!esUltimo && (
              <span
                aria-hidden="true"
                className="absolute left-[15px] top-8 h-[calc(100%-20px)] w-0.5 bg-slate-200"
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${COLOR_POR_ESTADO[evento.estado]}`}
            >
              <Check className="h-4 w-4 text-white" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-semibold text-slate-800">{t(`status.${evento.estado}`)}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{evento.nota}</p>
              <p className="mt-1 text-xs text-slate-400">
                {formatearFecha(evento.fecha)}
                {!compacta && ` · ${t('cronologia.responsable', { responsable: evento.responsable })}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
