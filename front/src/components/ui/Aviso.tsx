import type { ReactNode } from 'react';
import { Info, AlertTriangle, CircleCheck, Clock } from 'lucide-react';

export type TonoAviso = 'info' | 'alerta' | 'espera' | 'seguro';

const iconos: Record<TonoAviso, typeof Info> = {
  info: Info,
  alerta: AlertTriangle,
  espera: Clock,
  seguro: CircleCheck,
};

const clases: Record<TonoAviso, string> = {
  info: 'aviso-info',
  alerta: 'aviso-alerta',
  espera: 'aviso-espera',
  seguro: 'aviso-seguro',
};

interface AvisoProps {
  tono?: TonoAviso;
  titulo?: string;
  children: ReactNode;
  /** Un aviso que el usuario debe oír apenas aparece (errores, riesgo). */
  urgente?: boolean;
}

/**
 * Bloque de aviso con borde grueso a la izquierda.
 *
 * El borde importa: distingue el aviso del cuerpo del texto aunque la persona no
 * distinga colores o traiga la pantalla lavada por el sol. El icono acompaña,
 * nunca sustituye a la palabra.
 */
export default function Aviso({ tono = 'info', titulo, children, urgente }: AvisoProps) {
  const Icono = iconos[tono];

  return (
    <div
      className={clases[tono]}
      role={urgente ? 'alert' : undefined}
      aria-live={urgente ? 'assertive' : undefined}
    >
      <Icono className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {titulo && <p className="font-bold">{titulo}</p>}
        <div className={titulo ? 'mt-1' : undefined}>{children}</div>
      </div>
    </div>
  );
}
