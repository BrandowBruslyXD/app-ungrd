import { CircleCheck, Clock, FileText, Send } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { EstadoPaquete } from '@/types/sectorial';

/**
 * Cómo se ve cada casilla del flujo del paquete, en un solo sitio.
 *
 * Lo comparten las dos pantallas del módulo —la columna «estado del paquete»
 * del reparto y el encabezado del paquete del ministerio—. Cuando cada una
 * tenía su copia, `Aprobado` salía con un glifo distinto en cada pantalla:
 * quien pasa de una a la otra lee dos estados donde solo hay uno.
 *
 * El icono no es decoración. Sobre la banda fotográfica del encabezado la
 * cápsula pierde saturación con el sol de frente, y ahí el glifo es lo que
 * sigue diciendo si el paquete salió o todavía está en borrador. El color nunca
 * va solo: al lado siempre está la palabra.
 */
export const ICONO_ESTADO_PAQUETE: Record<EstadoPaquete, LucideIcon> = {
  Borrador: FileText,
  EnRevision: Clock,
  Aprobado: CircleCheck,
  Enviado: Send,
};

/** @see ICONO_ESTADO_PAQUETE */
export const CLASES_ESTADO_PAQUETE: Record<EstadoPaquete, string> = {
  Borrador: 'bg-tinta-100 text-tinta-700',
  EnRevision: 'bg-espera-50 text-espera-700',
  Aprobado: 'bg-azul-50 text-azul-700',
  Enviado: 'bg-seguro-50 text-seguro-700',
};
