import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Barra de navegación al pie de un asistente.
 *
 * En celular la acción principal va arriba y ocupa todo el ancho: es la que el pulgar alcanza sin
 * mover la mano. «Atrás» queda debajo, disponible pero fuera del camino.
 */

interface Props {
  atras: {
    etiqueta: string;
    onClick: () => void;
    deshabilitado?: boolean;
  };
  /** Acción principal del paso. Debe llevar `btn-lg` para medir los 56 px de terreno. */
  children: ReactNode;
}

export default function PieAsistente({ atras, children }: Props) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={atras.onClick}
        disabled={atras.deshabilitado}
        className="btn-secondary w-full sm:w-auto"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        {atras.etiqueta}
      </button>
      {children}
    </div>
  );
}
