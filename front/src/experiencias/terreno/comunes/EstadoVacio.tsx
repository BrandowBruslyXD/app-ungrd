import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Lo que se muestra cuando una lista no tiene nada.
 *
 * Una pantalla en blanco bajo un título deja al usuario sin saber si la app falló o si de verdad
 * no hay nada. Aquí siempre se dice qué pasa y, cuando existe, qué puede hacer.
 */

interface Props {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  /** Camino de salida: reportar, limpiar el filtro, volver al panel. */
  accion?: ReactNode;
}

export default function EstadoVacio({ icono: Icono, titulo, descripcion, accion }: Props) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Icono className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="text-lg font-semibold text-slate-800">{titulo}</p>
      <p className="max-w-md text-base leading-relaxed text-slate-600">{descripcion}</p>
      {accion && <div className="mt-2 w-full sm:w-auto">{accion}</div>}
    </div>
  );
}
