import { FileText, Search, Satellite, Truck, Banknote, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TimelineEvent } from '@/types';

const iconos: Record<TimelineEvent['type'], LucideIcon> = {
  report: FileText,
  verification: Search,
  satellite: Satellite,
  action: Truck,
  spending: Banknote,
  resolved: CheckCircle2,
};

const colores: Record<TimelineEvent['type'], string> = {
  report: 'bg-tinta-600',
  verification: 'bg-azul-600',
  satellite: 'bg-azul-500',
  action: 'bg-espera-600',
  spending: 'bg-seguro-600',
  resolved: 'bg-seguro-600',
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Cronología del reporte.
 *
 * Es una lista ordenada de verdad (`ol`), no una pila de `div`: el lector de
 * pantalla anuncia «1 de 5» y quien no ve la línea vertical igual entiende que
 * hay una secuencia. La fecha va con el mes escrito, porque «14 nov» abreviado
 * se lee mal y «14/11» se confunde con el formato de otros países.
 */
export default function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative">
      {events.map((evento, indice) => {
        const Icono = iconos[evento.type];
        const esUltimo = indice === events.length - 1;

        return (
          <li key={evento.id} className="relative flex gap-4 pb-7 last:pb-0">
            {!esUltimo && (
              <div
                className="absolute left-[21px] top-12 h-[calc(100%-32px)] w-0.5 bg-tinta-200"
                aria-hidden="true"
              />
            )}

            <div
              className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${colores[evento.type]}`}
              aria-hidden="true"
            >
              <Icono className="h-5 w-5 text-white" />
            </div>

            <div className="min-w-0 flex-1 pt-1.5">
              <p className="font-bold leading-snug text-tinta-900">{evento.title}</p>
              <p className="mt-1 leading-snug text-tinta-600">{evento.description}</p>
              <p className="mt-1.5 text-sm text-tinta-500">{formatearFecha(evento.date)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
