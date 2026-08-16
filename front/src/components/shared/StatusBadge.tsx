import { useTranslation } from 'react-i18next';
import {
  CircleDot,
  ShieldCheck,
  UserCheck,
  Wrench,
  CheckCheck,
  Archive,
  ChevronsDown,
  Equal,
  ChevronsUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReportStatus, Prioridad } from '@/types';

/*
 * Cada estado y cada prioridad llevan icono propio, no solo color.
 *
 * Un 8% de los hombres no distingue rojo de verde, y bajo el sol del mediodía en
 * una pantalla barata se lava cualquier tinte. Si el color es el único portador
 * del significado, la información se pierde justo cuando más se necesita.
 */
const iconosEstado: Record<ReportStatus, LucideIcon> = {
  Reportado: CircleDot,
  Verificado: ShieldCheck,
  Asignado: UserCheck,
  EnAtencion: Wrench,
  Atendido: CheckCheck,
  Cerrado: Archive,
};

const iconosPrioridad: Record<Prioridad, LucideIcon> = {
  Baja: ChevronsDown,
  Media: Equal,
  Alta: ChevronsUp,
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  const { t } = useTranslation();
  const Icono = iconosEstado[status];

  return (
    <span className={`distintivo estado-${status}`}>
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t(`status.${status}`)}</span>
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Prioridad }) {
  const { t } = useTranslation();
  const Icono = iconosPrioridad[severity];

  return (
    <span className={`distintivo prioridad-${severity}`}>
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t(`prioridad.${severity}`)}</span>
    </span>
  );
}
