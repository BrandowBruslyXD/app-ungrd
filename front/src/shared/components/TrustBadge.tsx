import { useTranslation } from 'react-i18next';
import { BadgeCheck, ClipboardCheck, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { TrustLevel } from '@/shared/types';

/**
 * De dónde viene el dato: autorreportado, verificado, censado o avalado.
 *
 * Cada nivel lleva icono propio además del color, porque el ministerio decide con esto
 * y el color por sí solo no es una señal accesible.
 */

const config: Record<TrustLevel, { icon: typeof ShieldAlert; clases: string }> = {
  autorreportado: { icon: ShieldAlert, clases: 'bg-amber-50 text-amber-800 ring-amber-200' },
  verificado: { icon: ShieldCheck, clases: 'bg-blue-50 text-blue-800 ring-blue-200' },
  censado: { icon: ClipboardCheck, clases: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  avalado: { icon: BadgeCheck, clases: 'bg-ungrd-50 text-ungrd-700 ring-ungrd-200' },
};

interface TrustBadgeProps {
  level: TrustLevel;
  /** `md` cuando la insignia es el dato y no un metadato al margen. */
  size?: 'sm' | 'md';
}

export default function TrustBadge({ level, size = 'sm' }: TrustBadgeProps) {
  const { t } = useTranslation();
  const { icon: Icon, clases } = config[level];

  return (
    <span className={`badge ring-1 ${clases} ${size === 'md' ? 'badge-lg' : ''}`}>
      <Icon className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden="true" />
      {t(`trust.${level}`)}
    </span>
  );
}
