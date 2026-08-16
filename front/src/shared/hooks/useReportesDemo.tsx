import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CitizenReportType } from '@/shared/types';
import type { EstadoReporte, EventoCronologia, ReporteDetalle } from '@/shared/types/contrato';
import { detallesPorCodigo } from '@/shared/mocks/mockContrato';
import { cambiarEstadoReporte } from '@/shared/api/reportes';
import { puedeAvanzar } from './flujoEstados';

/**
 * Los reportes de la demo, vivos en memoria y compartidos por las dos experiencias.
 *
 * Es la costura del pitch: el gestor cambia el estado en la sala de crisis y el ciudadano ve
 * aparecer el evento en su cronología, sin backend de por medio. Cuando el backend exista, este
 * proveedor se reemplaza por la consulta real y ninguna pantalla cambia: ya consumen la forma
 * exacta del contrato.
 *
 * El estado vive en memoria, así que se pierde al recargar. Es aceptable en la demo y deja de
 * serlo el día que haya persistencia.
 */

/** Datos de un avance de estado: qué se decidió, qué lee el ciudadano y quién respondió. */
export interface AvanceEstado {
  estado: EstadoReporte;
  nota: string;
  responsable: string;
}

/**
 * Lo que el ciudadano declaró al reportar y el contrato de API todavía no transporta.
 *
 * Se guarda aparte del detalle en vez de inventarle campos a `ReporteDetalle`: el contrato manda,
 * y el día que la API los incluya este tipo desaparece sin tocar las pantallas.
 */
export interface ExtrasCiudadano {
  reportType: CitizenReportType;
  contactPhone?: string;
  householdSize?: number;
  isHabitable?: boolean;
  urgentNeed?: string;
}

interface ReportesDemo {
  /** Todos los reportes conocidos, sin ordenar: el orden es decisión de cada pantalla. */
  reportes: ReporteDetalle[];
  obtenerDetalle: (codigo: string) => ReporteDetalle | undefined;
  obtenerExtras: (codigo: string) => ExtrasCiudadano | undefined;
  /**
   * Suma un reporte recién creado al estado compartido.
   *
   * Es la entrada de la cadena del pitch: en cuanto el ciudadano envía, el reporte queda visible
   * en «Mis reportes» y en la cola del gestor. Reenviar el mismo código no lo duplica.
   */
  registrarReporte: (detalle: ReporteDetalle, extras?: ExtrasCiudadano) => void;
  /**
   * Aplica el cambio de inmediato y lo confirma contra la API.
   *
   * @throws {Error} si el reporte no existe, si el avance retrocede en el flujo o si la API
   * falla. En ese último caso el reporte ya volvió a su estado anterior antes de lanzar.
   */
  avanzarEstado: (codigo: string, avance: AvanceEstado) => Promise<void>;
}

const ContextoReportes = createContext<ReportesDemo | null>(null);

/** Copia los mocks para que el cambio de estado nunca mute el módulo importado. */
function sembrarReportes(): Record<string, ReporteDetalle> {
  const inicial: Record<string, ReporteDetalle> = {};
  for (const [codigo, detalle] of Object.entries(detallesPorCodigo)) {
    inicial[codigo] = { ...detalle, cronologia: [...detalle.cronologia] };
  }
  return inicial;
}

export function ProveedorReportesDemo({ children }: { children: ReactNode }) {
  const [porCodigo, setPorCodigo] = useState<Record<string, ReporteDetalle>>(sembrarReportes);
  const [extrasPorCodigo, setExtrasPorCodigo] = useState<Record<string, ExtrasCiudadano>>({});

  const reportes = useMemo<ReporteDetalle[]>(() => Object.values(porCodigo), [porCodigo]);

  const obtenerDetalle = useCallback(
    (codigo: string): ReporteDetalle | undefined => porCodigo[codigo],
    [porCodigo],
  );

  const obtenerExtras = useCallback(
    (codigo: string): ExtrasCiudadano | undefined => extrasPorCodigo[codigo],
    [extrasPorCodigo],
  );

  const registrarReporte = useCallback(
    (detalle: ReporteDetalle, extras?: ExtrasCiudadano): void => {
      setPorCodigo((actual) => ({
        ...actual,
        [detalle.codigo]: { ...detalle, cronologia: [...detalle.cronologia] },
      }));
      if (extras !== undefined) {
        setExtrasPorCodigo((actual) => ({ ...actual, [detalle.codigo]: extras }));
      }
    },
    [],
  );

  const avanzarEstado = useCallback(
    async (codigo: string, avance: AvanceEstado): Promise<void> => {
      const anterior = porCodigo[codigo];
      if (anterior === undefined) {
        throw new Error(`No existe el reporte ${codigo}`);
      }
      if (!puedeAvanzar(anterior.estado, avance.estado)) {
        throw new Error(`El reporte ${codigo} no puede pasar a ${avance.estado}`);
      }

      const evento: EventoCronologia = {
        estado: avance.estado,
        nota: avance.nota,
        fecha: new Date().toISOString(),
        responsable: avance.responsable,
      };

      // Cambio optimista: la sala de crisis no puede quedarse esperando a la red para reaccionar.
      setPorCodigo((actual) => ({
        ...actual,
        [codigo]: {
          ...anterior,
          estado: avance.estado,
          cronologia: [...anterior.cronologia, evento],
        },
      }));

      try {
        await cambiarEstadoReporte(codigo, { estado: avance.estado, nota: avance.nota });
      } catch (error) {
        // Nunca dejar en pantalla un estado que no se guardó.
        setPorCodigo((actual) => ({ ...actual, [codigo]: anterior }));
        throw error;
      }
    },
    [porCodigo],
  );

  const valor = useMemo<ReportesDemo>(
    () => ({ reportes, obtenerDetalle, obtenerExtras, registrarReporte, avanzarEstado }),
    [reportes, obtenerDetalle, obtenerExtras, registrarReporte, avanzarEstado],
  );

  return <ContextoReportes.Provider value={valor}>{children}</ContextoReportes.Provider>;
}

export function useReportesDemo(): ReportesDemo {
  const contexto = useContext(ContextoReportes);
  if (!contexto) {
    throw new Error('useReportesDemo debe usarse dentro de ProveedorReportesDemo');
  }
  return contexto;
}

/** Lo que el seguimiento necesita de un reporte compartido: el detalle y lo que el contrato no trae. */
export interface ReporteCompartido {
  detalle: ReporteDetalle | undefined;
  extras: ExtrasCiudadano | undefined;
}

/**
 * Busca un reporte tolerando que no haya proveedor.
 *
 * El seguimiento es una pantalla pública que se monta en muchos contextos; si el proveedor no
 * está, se comporta como si no hubiera reportes de la sesión en vez de tumbar la pantalla.
 */
export function useDetalleCompartido(codigo: string | undefined): ReporteCompartido {
  const contexto = useContext(ContextoReportes);
  if (contexto === null || codigo === undefined) {
    return { detalle: undefined, extras: undefined };
  }
  return { detalle: contexto.obtenerDetalle(codigo), extras: contexto.obtenerExtras(codigo) };
}

/**
 * Devuelve cómo registrar un reporte, tolerando que no haya proveedor.
 *
 * El asistente de reporte se prueba aislado del árbol de la aplicación: sin esta tolerancia, cada
 * prueba del asistente tendría que montar el proveedor solo para que el hook no se caiga.
 */
export function useRegistrarReporte(): (detalle: ReporteDetalle, extras?: ExtrasCiudadano) => void {
  const contexto = useContext(ContextoReportes);
  return contexto === null ? sinRegistrar : contexto.registrarReporte;
}

function sinRegistrar(): void {}
