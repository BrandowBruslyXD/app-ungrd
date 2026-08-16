import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { EstadoReporte, EventoCronologia } from '@/shared/types/contrato';
import LineaDeTiempo, { type PasoLineaDeTiempo } from './LineaDeTiempo';

/**
 * La cronología del reporte con la forma del contrato.
 *
 * La comparten las dos experiencias a propósito: es la prueba de que el gestor y el ciudadano
 * están viendo exactamente lo mismo. Solo traduce el evento del contrato al paso visual;
 * el dibujo vive en `LineaDeTiempo`.
 */

/** Fondo y color del icono de cada estado. El oro lleva icono oscuro; nunca blanco encima. */
const PUNTO_POR_ESTADO: Record<EstadoReporte, string> = {
  Reportado: 'bg-slate-500 text-white',
  Verificado: 'bg-ungrd-500 text-white',
  Asignado: 'bg-gold-500 text-ungrd-900',
  EnAtencion: 'bg-ungrd-600 text-white',
  Atendido: 'bg-blue-600 text-white',
  Cerrado: 'bg-emerald-600 text-white',
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
    return <p className="text-base text-slate-600">{t('cronologia.vacia')}</p>;
  }

  const pasos: PasoLineaDeTiempo[] = eventos.map((evento) => ({
    id: `${evento.estado}-${evento.fecha}`,
    icono: Check,
    clasePunto: PUNTO_POR_ESTADO[evento.estado],
    titulo: t(`status.${evento.estado}`),
    descripcion: evento.nota,
    meta: compacta
      ? formatearFecha(evento.fecha)
      : `${formatearFecha(evento.fecha)} · ${t('cronologia.responsable', { responsable: evento.responsable })}`,
  }));

  return <LineaDeTiempo pasos={pasos} densa={compacta} />;
}
