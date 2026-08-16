import { useEffect, useState } from 'react';
import {
  obtenerAlertasColombia,
  obtenerSismosCercanos,
  type AlertaMultiamenaza,
  type SismoObservado,
} from '@/lib/observacion';

/**
 * Trae de una sola vez lo que observan las fuentes externas del panel.
 *
 * Las dos consultas salen **en paralelo**: son independientes y encadenarlas
 * duplicaría la espera de un bloque que además es secundario. Cada cliente trae
 * su propio tiempo límite de cinco segundos y su propia degradación, así que
 * una fuente lenta no arrastra a la otra.
 *
 * **Vacío y caído son lo mismo aquí, y es deliberado.** Los clientes convierten
 * cualquier fallo —red caída, 5xx, tiempo agotado, cuerpo ilegible— en lista
 * vacía, sin distinguirlo de «hoy no hay nada». La consecuencia práctica es que
 * la ficha de una fuente sin resultados **desaparece** en vez de anunciar «0
 * alertas». Es la lectura correcta: decirle a un gestor que hay cero alertas
 * cuando en realidad no lo sabemos es peor que no decirle nada.
 */
export interface ObservacionExterna {
  readonly sismos: readonly SismoObservado[];
  readonly alertas: readonly AlertaMultiamenaza[];
  /** Cierto mientras las dos consultas siguen en curso. */
  readonly cargando: boolean;
}

const SIN_DATOS: ObservacionExterna = { sismos: [], alertas: [], cargando: true };

/**
 * Consulta USGS y GDACS al montar y devuelve lo que respondieron.
 *
 * Nunca lanza y nunca deja el panel esperando: pasados cinco segundos, lo que no
 * llegó se queda en lista vacía y el resto de la pantalla ya está trabajando.
 */
export function useObservacionExterna(): ObservacionExterna {
  const [observacion, setObservacion] = useState<ObservacionExterna>(SIN_DATOS);

  useEffect(() => {
    const control = new AbortController();

    async function consultar(): Promise<void> {
      const [sismos, alertas] = await Promise.all([
        obtenerSismosCercanos(control.signal),
        obtenerAlertasColombia(control.signal),
      ]);

      // Al desmontar el panel la respuesta ya no le sirve a nadie, y escribir
      // estado sobre un componente que se fue es un aviso en consola por nada.
      if (control.signal.aborted) {
        return;
      }

      setObservacion({ sismos, alertas, cargando: false });
    }

    void consultar();

    return () => {
      control.abort();
    };
  }, []);

  return observacion;
}
