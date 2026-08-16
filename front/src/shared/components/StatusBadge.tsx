import { useTranslation } from 'react-i18next';
import type { ReportStatus, Prioridad } from '@/shared/types';

export function StatusBadge({ status }: { status: ReportStatus }) {
  const { t } = useTranslation();
  return (
    <span className={`badge status-${status}`}>
      {t(`status.${status}`)}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Prioridad }) {
  const { t } = useTranslation();
  return (
    <span className={`badge severity-${severity}`}>
      {t(`prioridad.${severity}`)}
    </span>
  );
}
