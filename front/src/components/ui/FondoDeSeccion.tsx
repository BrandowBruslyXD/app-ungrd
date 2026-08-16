import { useEffect, useState } from 'react';
import type { FuenteFoto } from './Foto';
import { prefiereMenosMovimiento } from '@/lib/movimiento';

/** Cuánto se oscurece la foto. Manda la legibilidad, no la foto. */
export type IntensidadVelo = 'fuerte' | 'medio' | 'suave';

const VELO: Record<IntensidadVelo, string> = {
  // Texto blanco encima de párrafos largos.
  fuerte: 'bg-gradient-to-br from-azul-950/95 via-azul-900/90 to-azul-800/85',
  // Texto blanco encima de títulos y bloques cortos.
  medio: 'bg-gradient-to-br from-azul-950/90 via-azul-900/78 to-azul-700/60',
  // Solo tiñe: para franjas sin texto encima.
  suave: 'bg-gradient-to-b from-azul-950/45 to-azul-900/65',
};

interface FondoDeSeccionProps {
  /**
   * Una o varias fotos. Con más de una se van pasando con fundido, que es la
   * forma de que el fondo tenga vida sin pedirle nada al usuario.
   */
  fotos: readonly FuenteFoto[];
  velo?: IntensidadVelo;
  /** Milisegundos entre fotos. Largo a propósito: es fondo, no un espectáculo. */
  intervalo?: number;
}

/**
 * Capa de fondo fotográfico para una sección.
 *
 * Reemplaza al color plano. La aplicación entera era azul sobre blanco sobre
 * azul, y una herramienta que la gente abre en el peor día de su vida no debería
 * sentirse como un formulario de trámites.
 *
 * Va **detrás** del contenido, no al lado: la sección que la usa lleva
 * `relative isolate` y esta capa `absolute inset-0 -z-10`. Encima siempre hay un
 * velo del azul de marca, así que el texto blanco mantiene su contraste pase lo
 * que pase con la imagen —y si la imagen no carga, debajo queda el color sólido
 * y no se rompe nada—.
 *
 * Es puramente decorativa: `alt` vacío y `aria-hidden`. Nadie que use lector de
 * pantalla necesita oír «paisaje de montaña» antes de cada sección.
 */
export default function FondoDeSeccion({
  fotos,
  velo = 'medio',
  intervalo = 7000,
}: FondoDeSeccionProps) {
  const [actual, setActual] = useState(0);

  useEffect(() => {
    if (fotos.length < 2 || prefiereMenosMovimiento()) {
      return;
    }
    const temporizador = window.setInterval(() => {
      setActual((i) => (i + 1) % fotos.length);
    }, intervalo);
    return () => window.clearInterval(temporizador);
  }, [fotos.length, intervalo]);

  const ruta = (foto: FuenteFoto, ancho: number): string => `/imagenes/${foto.base}-${ancho}.jpg`;

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-azul-900" aria-hidden="true">
      {fotos.map((foto, indice) => (
        <img
          key={foto.base}
          src={ruta(foto, foto.anchos[1])}
          srcSet={`${ruta(foto, foto.anchos[1])} ${foto.anchos[1]}w, ${ruta(foto, foto.anchos[0])} ${foto.anchos[0]}w`}
          sizes="100vw"
          alt=""
          loading={indice === 0 ? 'eager' : 'lazy'}
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ease-in-out motion-reduce:transition-none ${
            indice === actual ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div className={`absolute inset-0 ${VELO[velo]}`} />
    </div>
  );
}
