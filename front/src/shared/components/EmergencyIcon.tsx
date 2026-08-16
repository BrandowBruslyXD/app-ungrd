import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Construction,
  Droplets,
  Flame,
  Mountain,
  Route,
} from 'lucide-react';
import type { EmergencyType } from '@/shared/types';

/**
 * El tipo de emergencia como icono con color propio.
 *
 * Sin etiqueta visible el icono se anuncia solo (`role="img"`); con etiqueta el icono
 * se oculta al lector y habla el texto, para no repetir lo mismo dos veces.
 */

const icons: Record<EmergencyType, typeof Droplets> = {
  Inundacion: Droplets,
  Deslizamiento: Mountain,
  Incendio: Flame,
  ViaAfectada: Route,
  ColapsoEstructural: Construction,
  Otro: AlertTriangle,
};

const colors: Record<EmergencyType, string> = {
  Inundacion: 'bg-ungrd-50 text-ungrd-700',
  Deslizamiento: 'bg-amber-50 text-amber-800',
  Incendio: 'bg-red-50 text-red-700',
  ViaAfectada: 'bg-slate-100 text-slate-700',
  ColapsoEstructural: 'bg-orange-50 text-orange-700',
  Otro: 'bg-slate-100 text-slate-600',
};

interface Props {
  type: EmergencyType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const cajaPorTamano = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' };
const iconoPorTamano = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };

export default function EmergencyIcon({ type, size = 'md', showLabel }: Props) {
  const { t } = useTranslation();
  const Icon = icons[type];
  const label = t(`emergencyType.${type}`);
  const caja = `flex shrink-0 items-center justify-center rounded-xl ${cajaPorTamano[size]} ${colors[type]}`;

  if (!showLabel) {
    return (
      <span role="img" aria-label={label} className={caja}>
        <Icon className={iconoPorTamano[size]} />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2.5">
      <span aria-hidden="true" className={caja}>
        <Icon className={iconoPorTamano[size]} />
      </span>
      <span className="text-base font-medium text-slate-800">{label}</span>
    </span>
  );
}
