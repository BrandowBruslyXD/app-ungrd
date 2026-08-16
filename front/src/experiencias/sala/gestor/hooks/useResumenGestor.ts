import { useEffect, useState } from 'react';
import type { ResumenEstadisticas } from '@/shared/types/contrato';
import { obtenerResumenEstadisticas } from '@/shared/api/reportes';

/**
 * Cifras del día para la cabecera del panel.
 *
 * Si la consulta falla, la pantalla lo dice y sigue funcionando: la cola de atención no depende
 * de estas cifras y no puede caerse con ellas.
 */
export function useResumenGestor() {
  const [resumen, setResumen] = useState<ResumenEstadisticas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);

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
  }, []);

  return { resumen, cargando, fallo };
}
