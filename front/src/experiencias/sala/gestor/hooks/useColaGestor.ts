import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EstadoReporte, Prioridad, ReporteDetalle } from '@/shared/types/contrato';
import { useReportesDemo } from '@/shared/hooks/useReportesDemo';
import { estadosSiguientes } from '@/shared/hooks/flujoEstados';

/**
 * La cola de atención del gestor: qué se atiende primero y cómo avanza cada reporte.
 *
 * La pantalla solo pinta lo que sale de aquí; las reglas de orden, de avance y de qué se le
 * dice al usuario cuando algo falla viven en este hook.
 */

/**
 * Quién firma los avances en la demo.
 *
 * En producción sale del token, nunca del cliente: aquí es un dato sembrado porque todavía no
 * hay sesión real.
 */
export const RESPONSABLE_GESTOR = 'Carlos M.';

/** Primero lo más grave. */
const PESO_PRIORIDAD: Record<Prioridad, number> = { Alta: 0, Media: 1, Baja: 2 };

/** Un reporte de la cola junto con los estados a los que todavía puede avanzar. */
export interface FilaCola {
  reporte: ReporteDetalle;
  siguientes: EstadoReporte[];
}

/** Aviso al gestor sobre el último cambio que intentó, en lenguaje comprensible. */
export interface AvisoCambio {
  codigo: string;
  tipo: 'exito' | 'error';
  mensaje: string;
}

export function useColaGestor() {
  const { t } = useTranslation();
  const { reportes, avanzarEstado } = useReportesDemo();
  const [codigoGuardando, setCodigoGuardando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<AvisoCambio | null>(null);

  /**
   * Prioridad y, a igual prioridad, antigüedad: quien lleva más tiempo esperando va primero.
   * Se recalcula con cada cambio del estado compartido, así que la cola se refresca sola.
   */
  const cola = useMemo<FilaCola[]>(
    () =>
      [...reportes]
        .sort((uno, otro) => {
          const porPrioridad = PESO_PRIORIDAD[uno.prioridad] - PESO_PRIORIDAD[otro.prioridad];
          if (porPrioridad !== 0) {
            return porPrioridad;
          }
          return new Date(uno.creadoEn).getTime() - new Date(otro.creadoEn).getTime();
        })
        .map((reporte) => ({ reporte, siguientes: estadosSiguientes(reporte.estado) })),
    [reportes],
  );

  const pendientes = useMemo(
    () => reportes.filter((reporte) => reporte.estado !== 'Cerrado').length,
    [reportes],
  );

  const porVerificar = useMemo(
    () => reportes.filter((reporte) => reporte.estado === 'Reportado').length,
    [reportes],
  );

  /**
   * Avanza un reporte y deja listo el aviso que verá el gestor.
   *
   * La nota es opcional para quien la escribe, pero nunca viaja vacía: el ciudadano tiene que
   * leer algo en su cronología.
   *
   * @returns `true` si el cambio quedó guardado.
   */
  const cambiarEstado = useCallback(
    async (codigo: string, estado: EstadoReporte, nota: string): Promise<boolean> => {
      const estadoPrevio = reportes.find((reporte) => reporte.codigo === codigo)?.estado;
      const notaLimpia = nota.trim();

      setCodigoGuardando(codigo);
      setAviso(null);

      try {
        await avanzarEstado(codigo, {
          estado,
          nota:
            notaLimpia === ''
              ? t('gestor.notaPorDefecto', { estado: t(`status.${estado}`) })
              : notaLimpia,
          responsable: RESPONSABLE_GESTOR,
        });
        setAviso({
          codigo,
          tipo: 'exito',
          mensaje: t('gestor.cambioGuardado', { codigo, estado: t(`status.${estado}`) }),
        });
        return true;
      } catch {
        setAviso({
          codigo,
          tipo: 'error',
          mensaje: t('gestor.errorCambio', {
            estado: estadoPrevio === undefined ? '' : t(`status.${estadoPrevio}`),
          }),
        });
        return false;
      } finally {
        setCodigoGuardando(null);
      }
    },
    [avanzarEstado, reportes, t],
  );

  const descartarAviso = useCallback((): void => {
    setAviso(null);
  }, []);

  return { cola, pendientes, porVerificar, codigoGuardando, aviso, cambiarEstado, descartarAviso };
}
