import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldAlert, ClipboardCheck, BadgeCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TrustLevel } from '@/types';

/** Peldaño de la escalera, para poder mostrar «3/4» sin ambigüedad. */
const ORDEN: Record<TrustLevel, number> = {
  autorreportado: 1,
  verificado: 2,
  censado: 3,
  avalado: 4,
};

const CONFIG: Record<TrustLevel, { icono: LucideIcon; clases: string }> = {
  autorreportado: { icono: ShieldAlert, clases: 'bg-espera-50 text-espera-700' },
  verificado: { icono: ShieldCheck, clases: 'bg-azul-50 text-azul-700' },
  censado: { icono: ClipboardCheck, clases: 'bg-seguro-50 text-seguro-700' },
  avalado: { icono: BadgeCheck, clases: 'bg-azul-600 text-white' },
};

interface TrustBadgeProps {
  level: TrustLevel;
  /**
   * Solo el icono y el peldaño «3/4». Para tarjetas de tablero y filas de
   * listado, donde el rótulo completo —«Avalado por CMGRD»— no cabe y termina
   * empujando la tarjeta o partiéndose en tres líneas.
   *
   * El nombre completo sigue disponible para el lector de pantalla y en el
   * `title`, así que no se pierde información: se deja de gritar.
   */
  compacto?: boolean;
}

/**
 * Distintivo del nivel de confianza del dato.
 *
 * Mostrarlo es una decisión de producto, no de estilo: la diferencia entre un
 * dato autorreportado y uno censado es la que separa un aviso de un registro con
 * efectos legales, y hoy nadie se la explica al ciudadano.
 */
export default function TrustBadge({ level, compacto }: TrustBadgeProps) {
  const { t } = useTranslation();
  const { icono: Icono, clases } = CONFIG[level];
  const etiqueta = t(`trust.${level}`);

  if (compacto) {
    return (
      <span className={`distintivo ${clases}`} title={etiqueta}>
        <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="font-mono">{ORDEN[level]}/4</span>
        <span className="solo-lector">{etiqueta}</span>
      </span>
    );
  }

  return (
    <span className={`distintivo ${clases}`}>
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{etiqueta}</span>
    </span>
  );
}
