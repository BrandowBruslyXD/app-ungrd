import type { ReportStatus, SeverityLevel } from '@/types';

const statusLabels: Record<ReportStatus, string> = {
  recibido: 'Recibido',
  verificando: 'En verificación',
  confirmado: 'Confirmado',
  en_atencion: 'En atención',
  resuelto: 'Resuelto',
};

const severityLabels: Record<SeverityLevel, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`badge status-${status}`}>
      {statusLabels[status]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: SeverityLevel }) {
  return (
    <span className={`badge severity-${severity}`}>
      {severityLabels[severity]}
    </span>
  );
}
