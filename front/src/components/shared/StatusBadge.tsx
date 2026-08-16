import type { ReportStatus, Prioridad } from '@/types';

const statusLabels: Record<ReportStatus, string> = {
  Reportado: 'Reportado',
  Verificado: 'Verificado',
  Asignado: 'Asignado',
  EnAtencion: 'En atención',
  Atendido: 'Atendido',
  Cerrado: 'Cerrado',
};

const prioridadLabels: Record<Prioridad, string> = {
  Baja: 'Baja',
  Media: 'Media',
  Alta: 'Alta',
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`badge status-${status}`}>
      {statusLabels[status]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Prioridad }) {
  return (
    <span className={`badge severity-${severity}`}>
      {prioridadLabels[severity]}
    </span>
  );
}
