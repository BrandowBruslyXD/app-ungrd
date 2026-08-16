import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { prefiereMenosMovimiento } from '@/lib/movimiento';

interface RevelarAlBajarProps {
  children: ReactNode;
  /** Retraso en milisegundos, para escalonar varios elementos seguidos. */
  retraso?: number;
  className?: string;
}

/**
 * Revela su contenido cuando entra en pantalla al desplazarse.
 *
 * Usa `IntersectionObserver`, que el navegador resuelve por su cuenta, en vez
 * de escuchar el evento de desplazamiento: en un teléfono de gama baja un
 * listener de scroll que recalcula posiciones en cada píxel es de las cosas que
 * más trancan la página.
 *
 * **Respeta `prefers-reduced-motion`.** Quien pidió menos movimiento ve el
 * contenido ya presente, sin animación y sin retraso: nunca se queda esperando
 * a que aparezca algo.
 *
 * El contenido se revela una sola vez y el observador se desconecta. Volver a
 * ocultarlo al subir marea y no aporta nada.
 */
export default function RevelarAlBajar({ children, retraso = 0, className = '' }: RevelarAlBajarProps) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) {
      return;
    }

    if (prefiereMenosMovimiento() || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          observador.disconnect();
        }
      },
      // Se dispara un poco antes de que el borde entre en pantalla, para que la
      // animación termine justo cuando la sección queda a la vista.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );

    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={contenedor}
      className={`transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      } ${className}`}
      style={visible && retraso ? { transitionDelay: `${retraso}ms` } : undefined}
    >
      {children}
    </div>
  );
}
