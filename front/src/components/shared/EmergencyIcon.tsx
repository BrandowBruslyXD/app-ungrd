import { useTranslation } from 'react-i18next';
import {
  Droplets,
  Mountain,
  Flame,
  AlertTriangle,
  Construction,
  Route,
  Activity,
  Wind,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { EmergencyType } from '@/types';

const iconos: Record<EmergencyType, LucideIcon> = {
  Inundacion: Droplets,
  Deslizamiento: Mountain,
  Incendio: Flame,
  ViaAfectada: Route,
  ColapsoEstructural: Construction,
  Sismo: Activity,
  Vendaval: Wind,
  AvenidaTorrencial: Waves,
  Otro: AlertTriangle,
};

const colores: Record<EmergencyType, string> = {
  Inundacion: 'text-azul-600 bg-azul-50',
  Deslizamiento: 'text-espera-700 bg-espera-50',
  Incendio: 'text-alerta-600 bg-alerta-50',
  ViaAfectada: 'text-tinta-700 bg-tinta-100',
  ColapsoEstructural: 'text-espera-600 bg-espera-100',
  Sismo: 'text-alerta-700 bg-alerta-100',
  Vendaval: 'text-azul-700 bg-azul-100',
  AvenidaTorrencial: 'text-azul-800 bg-azul-100',
  Otro: 'text-tinta-600 bg-tinta-50',
};

interface Props {
  type: EmergencyType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * Icono del tipo de emergencia, con su nombre disponible para lectores de pantalla.
 *
 * Los tamaños subieron respecto al diseño anterior: un icono de 32px dentro de
 * una lista es lo que permite reconocer «inundación» de un vistazo sin leer.
 */
export default function EmergencyIcon({ type, size = 'md', showLabel }: Props) {
  const { t } = useTranslation();
  const Icono = iconos[type];
  const caja = { sm: 'h-11 w-11', md: 'h-13 w-13 h-[3.25rem] w-[3.25rem]', lg: 'h-16 w-16' };
  const glifo = { sm: 'h-6 w-6', md: 'h-7 w-7', lg: 'h-9 w-9' };
  const label = t(`emergencyType.${type}`);

  return (
    <div className="flex items-center gap-3" role="img" aria-label={label}>
      <div
        className={`flex shrink-0 items-center justify-center rounded-control ${caja[size]} ${colores[type]}`}
      >
        <Icono className={glifo[size]} aria-hidden="true" />
      </div>
      {showLabel && <span className="font-semibold text-tinta-800">{label}</span>}
    </div>
  );
}
