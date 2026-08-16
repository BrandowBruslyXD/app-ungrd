/**
 * El «− valor +» de terreno.
 *
 * Estaba resuelto a mano en cuatro pantallas con tres tamaños distintos, y el peor de ellos
 * medía 32 px: se usa con una mano, en escena y a veces con guantes. Aquí es siempre el mismo
 * `.btn-stepper` de 44 px.
 */

interface Props {
  valor: number;
  /** Recibe el delta, no el valor final: el mínimo lo decide quien administra el estado. */
  onCambiar: (delta: number) => void;
  etiquetaDisminuir: string;
  etiquetaAumentar: string;
  /** Cuando ya está en el mínimo, restar no hace nada: mejor decirlo que fingir que responde. */
  enMinimo?: boolean;
}

export default function Contador({
  valor,
  onCambiar,
  etiquetaDisminuir,
  etiquetaAumentar,
  enMinimo = false,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => onCambiar(-1)}
        disabled={enMinimo}
        aria-label={etiquetaDisminuir}
        className="btn-stepper text-xl font-semibold"
      >
        -
      </button>
      <span
        aria-live="polite"
        className="flex h-11 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xl font-bold text-slate-900"
      >
        {valor}
      </span>
      <button
        type="button"
        onClick={() => onCambiar(1)}
        aria-label={etiquetaAumentar}
        className="btn-stepper text-xl font-semibold"
      >
        +
      </button>
    </div>
  );
}
