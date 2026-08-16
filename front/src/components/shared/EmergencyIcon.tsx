import {
  Droplets,
  Mountain,
  Flame,
  AlertTriangle,
  Construction,
  Route,
} from 'lucide-react';
import type { EmergencyType } from '@/types';

const icons: Record<EmergencyType, typeof Droplets> = {
  Inundacion: Droplets,
  Deslizamiento: Mountain,
  Incendio: Flame,
  ViaAfectada: Route,
  ColapsoEstructural: Construction,
  Otro: AlertTriangle,
};

const colors: Record<EmergencyType, string> = {
  Inundacion: 'text-ungrd-600 bg-ungrd-50',
  Deslizamiento: 'text-amber-700 bg-amber-50',
  Incendio: 'text-red-600 bg-red-50',
  ViaAfectada: 'text-slate-600 bg-slate-100',
  ColapsoEstructural: 'text-orange-600 bg-orange-50',
  Otro: 'text-slate-500 bg-slate-50',
};

const labels: Record<EmergencyType, string> = {
  Inundacion: 'Inundación',
  Deslizamiento: 'Deslizamiento',
  Incendio: 'Incendio',
  ViaAfectada: 'Vía afectada',
  ColapsoEstructural: 'Colapso estructural',
  Otro: 'Otro',
};

interface Props {
  type: EmergencyType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function EmergencyIcon({ type, size = 'md', showLabel }: Props) {
  const Icon = icons[type];
  const sizeMap = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' };
  const iconSize = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center justify-center rounded-xl ${sizeMap[size]} ${colors[type]}`}>
        <Icon className={iconSize[size]} />
      </div>
      {showLabel && <span className="text-sm font-medium text-slate-700">{labels[type]}</span>}
    </div>
  );
}

export { labels as emergencyLabels };
