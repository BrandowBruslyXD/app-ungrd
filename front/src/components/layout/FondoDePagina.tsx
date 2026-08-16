import { useEffect, useState } from 'react';
import type { FuenteFoto } from '@/components/ui/Foto';
import { prefiereMenosMovimiento } from '@/lib/movimiento';

interface FondoDePaginaProps {
  /** Las fotos de esta ruta. Cada vista tiene las suyas. */
  fotos: readonly FuenteFoto[];
}

/**
 * Fondo fotográfico de la página entera.
 *
 * Es la capa que se ve **a los lados** de la columna de contenido. Sin ella,
 * en un monitor ancho la aplicación son dos franjas de color plano flanqueando
 * una tira de texto; con ella el contenido se lee como una hoja apoyada sobre
 * el territorio, que es justo la idea que sostiene todo el diseño.
 *
 * Va `fixed`, así que no se desplaza con la página: el contenido pasa por
 * encima. Se evita `background-attachment: fixed` a propósito, porque en móvil
 * provoca repintados en cada desplazamiento y traba los teléfonos lentos.
 *
 * Encima lleva un velo muy cargado del color de papel. La foto tiene que
 * **insinuarse**, no competir: si alguien la mira y la reconoce antes de leer el
 * contenido, el velo está demasiado suave.
 */
export default function FondoDePagina({ fotos }: FondoDePaginaProps) {
  const [actual, setActual] = useState(0);

  // Al cambiar de ruta cambia el juego de fotos: hay que volver a la primera o
  // el índice quedaría apuntando a una foto que ya no está en el arreglo.
  useEffect(() => {
    setActual(0);
  }, [fotos]);

  useEffect(() => {
    if (fotos.length < 2 || prefiereMenosMovimiento()) {
      return;
    }
    // Muy lento: es ambiente, no un pase de diapositivas. Cambiar cada pocos
    // segundos detrás de un formulario distrae de lo que se está llenando.
    const temporizador = window.setInterval(() => {
      setActual((i) => (i + 1) % fotos.length);
    }, 18000);
    return () => window.clearInterval(temporizador);
  }, [fotos]);

  const ruta = (base: string, ancho: number): string => `/imagenes/${base}-${ancho}.jpg`;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-papel" aria-hidden="true">
      {fotos.map((foto, indice) => (
        <img
          key={foto.base}
          src={ruta(foto.base, foto.anchos[0])}
          srcSet={`${ruta(foto.base, foto.anchos[1])} ${foto.anchos[1]}w, ${ruta(foto.base, foto.anchos[0])} ${foto.anchos[0]}w`}
          sizes="100vw"
          alt=""
          loading={indice === 0 ? 'eager' : 'lazy'}
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms] ease-in-out motion-reduce:transition-none ${
            indice === actual ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {/*
        Velo liviano, no una tapa.
        La primera versión iba al 90% y dejaba las fotos casi invisibles: se
        veía color plano con una sombra rara. Puede ser suave porque **el texto
        no va encima de la foto**, va sobre la hoja sólida que se dibuja arriba;
        aquí solo se protege el contraste de los bordes de esa hoja.
      */}
      <div className="absolute inset-0 bg-papel/45" />
      <div className="absolute inset-0 bg-gradient-to-b from-azul-900/5 via-transparent to-azul-900/10" />
    </div>
  );
}
