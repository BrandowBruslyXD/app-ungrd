import type { LucideIcon } from 'lucide-react';

/**
 * Cronología vertical: el punto, la línea que lo une con el siguiente y el texto.
 *
 * Es la pieza de presentación única para todas las cronologías de la aplicación.
 * Existía tres veces copiada a mano con medidas y colores distintos, y ese era
 * justo el motivo por el que la misma información se veía diferente en cada pantalla.
 * Quien tenga otro origen de datos lo traduce a `PasoLineaDeTiempo` y lo pasa aquí.
 */

export interface PasoLineaDeTiempo {
  /** Clave estable de la fila. */
  id: string;
  icono: LucideIcon;
  /**
   * Clases de fondo y de color del icono del punto, juntas.
   * Van juntas a propósito: el icono sobre oro tiene que ser oscuro y sobre azul, blanco.
   */
  clasePunto: string;
  titulo: string;
  descripcion?: string;
  /** Fecha, responsable o cualquier dato al margen. */
  meta?: string;
}

interface Props {
  pasos: PasoLineaDeTiempo[];
  /**
   * En listas densas de la sala de crisis el cuerpo puede bajar un escalón.
   * En terreno nunca: se lee bajo el sol.
   */
  densa?: boolean;
}

export default function LineaDeTiempo({ pasos, densa = false }: Props) {
  const claseTexto = densa ? 'text-sm' : 'text-base';

  return (
    <ol className="relative">
      {pasos.map((paso, indice) => {
        const esUltimo = indice === pasos.length - 1;
        const Icono = paso.icono;

        return (
          <li key={paso.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!esUltimo && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-[18px] top-10 w-0.5 -translate-x-1/2 bg-slate-200"
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${paso.clasePunto}`}
            >
              <Icono className="h-4 w-4" strokeWidth={2.5} />
            </span>
            {/* pt-1.5 alinea el centro de la primera línea de texto con el centro del punto. */}
            <div className="min-w-0 flex-1 pt-1.5">
              <p className={`font-semibold text-slate-900 ${claseTexto}`}>{paso.titulo}</p>
              {paso.descripcion && (
                <p className={`mt-0.5 leading-relaxed text-slate-600 ${claseTexto}`}>
                  {paso.descripcion}
                </p>
              )}
              {paso.meta && <p className="mt-1 text-sm text-slate-500">{paso.meta}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
