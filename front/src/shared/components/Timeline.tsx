import { Banknote, CheckCircle2, FileText, Satellite, Search, Truck } from 'lucide-react';
import type { TimelineEvent } from '@/shared/types';
import LineaDeTiempo, { type PasoLineaDeTiempo } from './LineaDeTiempo';

/**
 * Cronología de los datos de demostración heredados (`TimelineEvent`).
 *
 * Se mantiene mientras las pantallas viejas no migren a `CronologiaReporte`, pero
 * ya dibuja con la misma pieza: dos cronologías con medidas distintas en la misma
 * aplicación era el defecto, no la falta de un componente.
 */

const ICONO_POR_TIPO: Record<TimelineEvent['type'], typeof FileText> = {
  report: FileText,
  verification: Search,
  satellite: Satellite,
  action: Truck,
  spending: Banknote,
  resolved: CheckCircle2,
};

/** Fondo y color del icono. El oro lleva icono oscuro; el resto, blanco. */
const PUNTO_POR_TIPO: Record<TimelineEvent['type'], string> = {
  report: 'bg-slate-500 text-white',
  verification: 'bg-ungrd-500 text-white',
  satellite: 'bg-gold-500 text-ungrd-900',
  action: 'bg-amber-600 text-white',
  spending: 'bg-emerald-600 text-white',
  resolved: 'bg-emerald-700 text-white',
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  const pasos: PasoLineaDeTiempo[] = events.map((evento) => ({
    id: evento.id,
    icono: ICONO_POR_TIPO[evento.type],
    clasePunto: PUNTO_POR_TIPO[evento.type],
    titulo: evento.title,
    descripcion: evento.description,
    meta: formatearFecha(evento.date),
  }));

  return <LineaDeTiempo pasos={pasos} />;
}
