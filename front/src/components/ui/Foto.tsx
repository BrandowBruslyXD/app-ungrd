import { useState } from 'react';

export interface FuenteFoto {
  /** Nombre base del archivo en `public/imagenes`, sin ancho ni extensión. */
  base: string;
  /** Anchos disponibles, de mayor a menor. El menor es el `src` por defecto. */
  anchos: readonly [number, number];
}

interface FotoProps {
  fuente: FuenteFoto;
  /**
   * Qué se ve en la foto, para quien no la ve. Cadena vacía si es decorativa:
   * en ese caso el lector de pantalla la salta, que es lo correcto.
   */
  alt: string;
  /** Proporción del hueco. Reserva el espacio y evita que la página salte. */
  proporcion?: 'ancha' | 'panoramica' | 'cuadrada' | 'alta';
  className?: string;
  /** La imagen de portada carga de inmediato; el resto, al acercarse. */
  prioritaria?: boolean;
  /** Pista para el navegador de cuánto ancho ocupará la imagen. */
  sizes?: string;
}

const proporciones: Record<NonNullable<FotoProps['proporcion']>, string> = {
  ancha: 'aspect-[16/9]',
  panoramica: 'aspect-[21/9]',
  cuadrada: 'aspect-square',
  alta: 'aspect-[3/4]',
};

/**
 * Foto con carga responsable.
 *
 * Tres cosas que no son opcionales para el público de esta app:
 *
 * - **Dos tamaños reales.** Un teléfono de gama baja en 3G recibe el archivo de
 *   400-800px, no el de 1600. La diferencia es de segundos, no de milisegundos.
 * - **El hueco se reserva antes de cargar.** Sin proporción fija la página da un
 *   salto cuando entra la imagen y el dedo termina pulsando otra cosa.
 * - **Si la imagen no llega, no pasa nada.** Queda el fondo sólido y el texto
 *   encima sigue siendo legible. Una foto es un adorno; el contenido, no.
 */
export default function Foto({
  fuente,
  alt,
  proporcion = 'ancha',
  className = '',
  prioritaria = false,
  sizes = '100vw',
}: FotoProps) {
  const [fallo, setFallo] = useState(false);
  const [mayor, menor] = fuente.anchos;
  const ruta = (ancho: number): string => `/imagenes/${fuente.base}-${ancho}.jpg`;

  return (
    <div className={`relative overflow-hidden bg-azul-800 ${proporciones[proporcion]} ${className}`}>
      {!fallo && (
        <img
          src={ruta(menor)}
          srcSet={`${ruta(menor)} ${menor}w, ${ruta(mayor)} ${mayor}w`}
          sizes={sizes}
          alt={alt}
          loading={prioritaria ? 'eager' : 'lazy'}
          decoding={prioritaria ? 'sync' : 'async'}
          fetchPriority={prioritaria ? 'high' : 'auto'}
          onError={() => setFallo(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
