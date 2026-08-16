import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface FichaProps {
  /** Rótulo de la banda superior. Si se omite, la ficha va sin banda. */
  titulo?: string;
  icono?: LucideIcon;
  /** Dato corto alineado a la derecha de la banda: un código, un conteo. */
  apunte?: string;
  children: ReactNode;
  /** Quita el relleno interior cuando el contenido trae el suyo (listas). */
  sinRelleno?: boolean;
}

/**
 * Hoja de contenido.
 *
 * La banda superior viene del encabezado de los formatos oficiales de la UNGRD,
 * donde el bloque de arriba lleva proceso, título y código. Aquí cumple la misma
 * función: decir de qué trata la hoja antes de que haya que leerla entera.
 */
export default function Ficha({ titulo, icono: Icono, apunte, children, sinRelleno }: FichaProps) {
  return (
    <section className="ficha overflow-hidden">
      {titulo && (
        <div className="ficha-banda">
          {Icono && <Icono className="h-6 w-6 shrink-0" aria-hidden="true" />}
          <h2 className="min-w-0 flex-1 text-lg font-bold text-white">{titulo}</h2>
          {apunte && (
            <span className="shrink-0 font-mono text-sm font-semibold text-oro-300">{apunte}</span>
          )}
        </div>
      )}
      <div className={sinRelleno ? undefined : 'p-4 sm:p-5'}>{children}</div>
    </section>
  );
}
