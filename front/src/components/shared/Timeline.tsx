import {
  FileText,
  Search,
  Satellite,
  Truck,
  Banknote,
  CheckCircle2,
} from 'lucide-react';
import type { TimelineEvent } from '@/types';

const iconMap: Record<TimelineEvent['type'], typeof FileText> = {
  report: FileText,
  verification: Search,
  satellite: Satellite,
  action: Truck,
  spending: Banknote,
  resolved: CheckCircle2,
};

const colorMap: Record<TimelineEvent['type'], string> = {
  report: 'bg-slate-500',
  verification: 'bg-ungrd-500',
  satellite: 'bg-gold-500',
  action: 'bg-amber-500',
  spending: 'bg-emerald-500',
  resolved: 'bg-emerald-600',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="relative space-y-0">
      {events.map((event, i) => {
        const Icon = iconMap[event.type];
        const isLast = i === events.length - 1;

        return (
          <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
              <div className="absolute left-[17px] top-10 h-[calc(100%-24px)] w-0.5 bg-slate-200" />
            )}
            <div
              className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colorMap[event.type]} shadow-sm`}
            >
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 pt-1">
              <p className="text-sm font-semibold text-slate-800">{event.title}</p>
              <p className="mt-0.5 text-sm text-slate-500 leading-relaxed">{event.description}</p>
              <p className="mt-1 text-xs text-slate-400">{formatDate(event.date)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
