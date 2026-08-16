import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldAlert, ClipboardCheck, BadgeCheck } from 'lucide-react';
import type { TrustLevel } from '@/shared/types';

const config: Record<TrustLevel, { icon: typeof ShieldAlert; bg: string; text: string; ring: string }> = {
  autorreportado: { icon: ShieldAlert, bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  verificado: { icon: ShieldCheck, bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200' },
  censado: { icon: ClipboardCheck, bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  avalado: { icon: BadgeCheck, bg: 'bg-ungrd-50', text: 'text-ungrd-700', ring: 'ring-ungrd-200' },
};

interface TrustBadgeProps {
  level: TrustLevel;
  size?: 'sm' | 'md';
}

export default function TrustBadge({ level, size = 'sm' }: TrustBadgeProps) {
  const { t } = useTranslation();
  const { icon: Icon, bg, text, ring } = config[level];
  const label = t(`trust.${level}`);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ring-1 font-medium ${bg} ${text} ${ring} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden="true" />
      {label}
    </span>
  );
}
