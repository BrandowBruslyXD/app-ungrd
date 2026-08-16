import { useTranslation } from 'react-i18next';
import type { EstadoPaquete } from '@/types/sectorial';
import { CLASES_ESTADO_PAQUETE, ICONO_ESTADO_PAQUETE } from './estadoPaquete';

/**
 * Distintivo del estado del paquete de un ministerio.
 *
 * Lo usan las dos pantallas del módulo —la columna «estado del paquete» del
 * reparto y el encabezado del paquete—, y por eso vive fuera de `paquete/`: el
 * mismo estado tiene que verse igual en las dos.
 */
export default function DistintivoEstadoPaquete({ estado }: { estado: EstadoPaquete }) {
  const { t } = useTranslation();
  const Icono = ICONO_ESTADO_PAQUETE[estado];

  return (
    <span className={`distintivo ${CLASES_ESTADO_PAQUETE[estado]}`}>
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t(`ungrd.estadoPaquete.${estado}`)}</span>
    </span>
  );
}
