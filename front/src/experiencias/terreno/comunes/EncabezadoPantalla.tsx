import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Encabezado de una pantalla de terreno.
 *
 * Existe para que las nueve pantallas abran igual: mismo tamaño de título, misma distancia al
 * contenido y la acción principal siempre en el mismo sitio. Antes cada pantalla resolvía su
 * cabecera a mano y ninguna coincidía con la de al lado.
 */

interface Props {
  titulo: string;
  descripcion?: string;
  icono?: LucideIcon;
  /** Acción principal de la pantalla, si la tiene. Se coloca a la derecha en pantallas anchas. */
  accion?: ReactNode;
}

export default function EncabezadoPantalla({ titulo, descripcion, icono: Icono, accion }: Props) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icono && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ungrd-50 text-ungrd-600">
            <Icono className="h-6 w-6" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
          {descripcion && <p className="mt-1 text-base leading-relaxed text-slate-600">{descripcion}</p>}
        </div>
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </header>
  );
}
