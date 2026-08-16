import { ClipboardCheck, ShieldAlert, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { NivelConfianza } from '@/experiencias/sala/ungrd/types/paquete';

/** Cómo se pinta cada nivel de confianza. Un solo sitio para que resumen, tablas e insignias coincidan. */
interface EstiloConfianza {
  icono: LucideIcon;
  insignia: string;
  /** Color sólido para las barras y los puntos de leyenda. */
  barra: string;
}

export const estilosConfianza: Record<NivelConfianza, EstiloConfianza> = {
  Verificado: {
    icono: ShieldCheck,
    insignia: 'bg-ungrd-50 text-ungrd-700 ring-ungrd-200',
    barra: 'bg-ungrd-600',
  },
  Censado: {
    icono: ClipboardCheck,
    insignia: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    barra: 'bg-emerald-500',
  },
  Autorreportado: {
    icono: ShieldAlert,
    insignia: 'bg-amber-50 text-amber-800 ring-amber-200',
    barra: 'bg-amber-400',
  },
};
