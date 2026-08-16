import { useCallback, useEffect, useState } from 'react';
import type { Report } from '@/types';
import { apiFetch, ErrorApi } from '@/api/client';
import {
  aReporte,
  aReporteDetalle,
  type ReporteApi,
  type ReporteDetalleApi,
} from '@/api/adaptadores';
import { listarPropios } from '@/api/reportes';

/**
 * Trae los reportes del backend, con sus tres estados explícitos.
 *
 * Cargando, error y vacío se devuelven por separado a propósito: son tres cosas
 * distintas en pantalla y confundirlas es lo que produce la pantalla en blanco
 * que no explica nada. Quien use esto tiene que resolver los tres.
 *
 * Ante un fallo se cae a lo guardado en el dispositivo en vez de dejar la
 * pantalla vacía. Alguien que reportó sin señal y vuelve a abrir la aplicación
 * tiene que seguir viendo su reporte y su código: es lo único que se llevó de la
 * emergencia.
 */
interface EstadoReportes {
  reportes: Report[];
  cargando: boolean;
  error: string | null;
  /** Cierto cuando lo que se muestra salió del dispositivo, no del servidor. */
  sinConexion: boolean;
  reintentar: () => void;
}

export function useReportes(): EstadoReportes {
  const [reportes, setReportes] = useState<Report[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sinConexion, setSinConexion] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    // Se cancela al desmontar: si alguien sale de la pantalla antes de que
    // responda, no tiene sentido seguir esperando ni tocar un estado muerto.
    const control = new AbortController();
    let vigente = true;

    async function traer() {
      setCargando(true);
      setError(null);

      try {
        const datos = await apiFetch<ReporteApi[]>('/reportes', { signal: control.signal });
        if (!vigente) return;
        setReportes(datos.map(aReporte));
        setSinConexion(false);
      } catch (causa) {
        if (!vigente || control.signal.aborted) return;

        const propios = listarPropios();
        setReportes(propios);
        setSinConexion(propios.length > 0);
        setError(
          causa instanceof ErrorApi
            ? causa.message
            : 'No pudimos traer los reportes. Inténtalo de nuevo.'
        );
      } finally {
        if (vigente) setCargando(false);
      }
    }

    void traer();
    return () => {
      vigente = false;
      control.abort();
    };
  }, [intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  return { reportes, cargando, error, sinConexion, reintentar };
}

interface EstadoDetalle {
  reporte: Report | null;
  cargando: boolean;
  error: string | null;
  /** Cierto solo si el servidor respondió que ese código no existe. */
  noExiste: boolean;
  reintentar: () => void;
}

/**
 * Trae un reporte por su código.
 *
 * Distingue «no existe» de «no se pudo consultar», que para quien acaba de
 * reportar no es lo mismo: lo primero significa que se equivocó al escribir el
 * código, lo segundo que vuelva a intentar en un momento.
 */
export function useReporte(codigo: string | undefined): EstadoDetalle {
  const [reporte, setReporte] = useState<Report | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noExiste, setNoExiste] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!codigo) {
      setCargando(false);
      setNoExiste(true);
      return;
    }

    const control = new AbortController();
    let vigente = true;

    async function traer() {
      setCargando(true);
      setError(null);
      setNoExiste(false);

      try {
        const datos = await apiFetch<ReporteDetalleApi>(`/reportes/${encodeURIComponent(codigo!)}`, {
          signal: control.signal,
        });
        if (!vigente) return;
        setReporte(aReporteDetalle(datos));
      } catch (causa) {
        if (!vigente || control.signal.aborted) return;

        if (causa instanceof ErrorApi && causa.estado === 404) {
          setNoExiste(true);
          return;
        }

        // Puede ser uno hecho desde este teléfono que aún no llegó al servidor.
        const local = listarPropios().find((r) => r.id === codigo);
        if (local) {
          setReporte(local);
          return;
        }

        setError(
          causa instanceof ErrorApi
            ? causa.message
            : 'No pudimos consultar el reporte. Inténtalo de nuevo.'
        );
      } finally {
        if (vigente) setCargando(false);
      }
    }

    void traer();
    return () => {
      vigente = false;
      control.abort();
    };
  }, [codigo, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  return { reporte, cargando, error, noExiste, reintentar };
}
