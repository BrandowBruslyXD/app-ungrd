import { useTranslation } from 'react-i18next';
import type { Prioridad, ReportStatus } from '@/shared/types';

/**
 * Insignias de estado y de prioridad.
 *
 * El color y el texto viajan siempre juntos: la etiqueta traducida es la señal,
 * el fondo solo la acompaña. Los tonos viven en `index.css` (`status-*`, `severity-*`).
 */

interface TamanoInsignia {
  /** `md` cuando la insignia es el dato principal de la fila y no un metadato. */
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: { status: ReportStatus } & TamanoInsignia) {
  const { t } = useTranslation();
  return (
    <span className={`badge status-${status} ${size === 'md' ? 'badge-lg' : ''}`}>
      {t(`status.${status}`)}
    </span>
  );
}

export function SeverityBadge({ severity, size = 'sm' }: { severity: Prioridad } & TamanoInsignia) {
  const { t } = useTranslation();
  return (
    <span className={`badge severity-${severity} ${size === 'md' ? 'badge-lg' : ''}`}>
      {t(`prioridad.${severity}`)}
    </span>
  );
}
