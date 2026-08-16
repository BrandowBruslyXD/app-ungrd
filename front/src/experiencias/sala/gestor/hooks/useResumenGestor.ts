import { useCallback, useEffect, useState } from 'react';
import type { ResumenEstadisticas } from '@/shared/types/contrato';
import { obtenerResumenEstadisticas } from '@/shared/api/reportes';

/** Lo que la pantalla necesita para pintar las cifras del día y sus caminos de fallo. */
interface UsoResumenGestor {
  resumen: ResumenEstadisticas | null;
  cargando: boolean;
  fallo: boolean;
  /** Vuelve a pedir las cifras después de un fallo, sin recargar la pantalla entera. */
  reintentar: () => void;
}

/**
 * Cifras del día para la cabecera del panel.
 *
 * Si la consulta falla, la pantalla lo dice y sigue funcionando: la cola de atención no depende
 * de estas cifras y no puede caerse con ellas.
 */
export function useResumenGestor(): UsoResumenGestor {
  const [resumen, setResumen] = useState<ResumenEstadisticas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;

    obtenerResumenEstadisticas()
      .then((datos) => {
        if (vigente) {
          setResumen(datos);
          setFallo(false);
        }
      })
      .catch(() => {
        if (vigente) {
          setFallo(true);
        }
      })
      .finally(() => {
        if (vigente) {
          setCargando(false);
        }
      });

    return () => {
      vigente = false;
    };
  }, [intento]);

  const reintentar = useCallback((): void => {
    setCargando(true);
    setFallo(false);
    setIntento((previo) => previo + 1);
  }, []);

  return { resumen, cargando, fallo, reintentar };
}
