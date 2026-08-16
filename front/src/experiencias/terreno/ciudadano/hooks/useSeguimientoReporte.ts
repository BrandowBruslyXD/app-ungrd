/**
 * Lógica de la pantalla de seguimiento del ciudadano: de dónde sale el reporte, cómo se arma la
 * cronología de los seis estados del contrato y cómo se copia el código sin mentirle al usuario.
 */
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getReporte } from '@/shared/api/reportes';
import { useDetalleCompartido } from '@/shared/hooks/useReportesDemo';
import { aReporteLegado } from '@/shared/hooks/reporteLegado';
import { ESTADOS_REPORTE } from '@/shared/types';
import type { EstadoReporte, Report } from '@/shared/types';

/**
 * Estado de navegación con el que el asistente entrega el reporte recién enviado.
 *
 * El reporte ya vive en el estado compartido, así que esto no es de dónde se leen los datos: es la
 * única señal de que el ciudadano acaba de enviarlo, y por eso decide si se muestra el aviso de
 * confirmación. Sirve además de respaldo si la pantalla se monta sin el proveedor.
 */
export interface EstadoNavegacionSeguimiento {
  reporteCreado: Report;
}

/** Un estado del flujo oficial, ya resuelto para pintarlo. */
export interface PasoSeguimiento {
  estado: EstadoReporte;
  /** El reporte ya pasó por este estado. */
  cumplido: boolean;
  /** Es el estado en el que está el reporte ahora mismo. */
  actual: boolean;
  /** Solo se llena cuando el reporte conoce la fecha de verdad; nunca se estima. */
  fecha: string | null;
}

/**
 * Convierte el estado actual del reporte en los seis pasos del flujo oficial.
 *
 * Un estado desconocido deja todos los pasos como pendientes: es preferible a inventar avance.
 */
export function construirPasosSeguimiento(reporte: Report): PasoSeguimiento[] {
  const indiceActual = ESTADOS_REPORTE.indexOf(reporte.status);

  return ESTADOS_REPORTE.map((estado, indice) => ({
    estado,
    cumplido: indiceActual >= 0 && indice <= indiceActual,
    actual: indice === indiceActual,
    fecha: fechaConocida(reporte, indice, indiceActual),
  }));
}

/**
 * El reporte solo trae dos fechas fiables: cuándo se creó y cuándo cambió por última vez.
 * Los pasos intermedios se muestran cumplidos pero sin fecha, en vez de con una inventada.
 */
function fechaConocida(reporte: Report, indice: number, indiceActual: number): string | null {
  if (indice === 0) {
    return reporte.createdAt;
  }
  if (indice === indiceActual) {
    return reporte.updatedAt;
  }
  return null;
}

/** Verifica que lo que viajó en el estado de navegación tenga forma de reporte antes de confiar en él. */
function esReporte(valor: unknown): valor is Report {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }
  const posible = valor as Partial<Report>;
  return (
    typeof posible.id === 'string' &&
    typeof posible.status === 'string' &&
    typeof posible.createdAt === 'string' &&
    Array.isArray(posible.timeline)
  );
}

/**
 * Recupera el reporte recién creado que el asistente dejó en el estado de navegación.
 *
 * Solo se acepta si su código coincide con el de la URL: así un enlace compartido nunca muestra
 * el reporte de otra persona que quedó en el historial del navegador.
 */
export function leerReporteCreado(estado: unknown, codigo: string | undefined): Report | undefined {
  if (typeof estado !== 'object' || estado === null || codigo === undefined) {
    return undefined;
  }
  const posible = (estado as Partial<EstadoNavegacionSeguimiento>).reporteCreado;
  if (!esReporte(posible) || posible.id !== codigo) {
    return undefined;
  }
  return posible;
}

/** Resultado del seguimiento: el reporte a mostrar y si el ciudadano acaba de enviarlo. */
export interface Seguimiento {
  codigo: string | undefined;
  reporte: Report | undefined;
  esRecienCreado: boolean;
}

/**
 * Resuelve qué reporte muestra `/reportes/:codigo`.
 *
 * El estado compartido va primero: es donde aterrizan los cambios que hace el gestor desde la
 * sala de crisis, y es lo que permite que la cronología avance sin recargar la pantalla.
 */
export function useSeguimientoReporte(): Seguimiento {
  const { codigo } = useParams<{ codigo: string }>();
  const location = useLocation();
  const { t } = useTranslation();
  const { detalle, extras } = useDetalleCompartido(codigo);

  const reporteCreado = leerReporteCreado(location.state, codigo);
  // El estado compartido va primero, y no el que viajó en la navegación: si el gestor ya avanzó el
  // reporte, el ciudadano tiene que ver la cronología nueva y no la foto del momento en que envió.
  const reporteCompartido = detalle === undefined ? undefined : aReporteLegado(detalle, t, extras);
  const reporte =
    reporteCompartido ?? reporteCreado ?? (codigo === undefined ? undefined : getReporte(codigo));

  return { codigo, reporte, esRecienCreado: reporteCreado !== undefined };
}

/**
 * Enlaces públicos a las dos fuentes que sostienen el discurso de verificación y transparencia.
 *
 * Se abren en el portal oficial y no en una pantalla propia: la app no puede prometer un
 * contrato concreto que todavía no consulta, pero sí puede dejar al ciudadano en la fuente.
 */

/** Mapa de focos de calor de la NASA, centrado en las coordenadas del reporte. */
export function enlaceFirms(coordenadas: { lat: number; lng: number }): string {
  return `https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@${coordenadas.lng},${coordenadas.lat},11z`;
}

/** Buscador público de procesos de contratación de SECOP II. */
export const ENLACE_SECOP = 'https://community.secop.gov.co/Public/Tendering/ContractNoticeManagement/Index';

/** Qué pasó con el último intento de copiar el código. */
export type ResultadoCopia = 'inactivo' | 'copiado' | 'fallido';

/** Cuánto tiempo se le muestra al usuario el resultado de la copia. */
const MS_RESULTADO_COPIA = 4000;

/**
 * Copia el código al portapapeles informando el fallo.
 *
 * Sin HTTPS el navegador no expone el portapapeles: si no se avisa, el usuario cree que copió su
 * código y se queda sin él.
 */
export function useCopiarCodigo(): {
  resultado: ResultadoCopia;
  copiar: (texto: string) => Promise<void>;
} {
  const [resultado, setResultado] = useState<ResultadoCopia>('inactivo');

  useEffect(() => {
    if (resultado === 'inactivo') {
      return;
    }
    const temporizador = window.setTimeout(() => setResultado('inactivo'), MS_RESULTADO_COPIA);
    return () => window.clearTimeout(temporizador);
  }, [resultado]);

  const copiar = useCallback(async (texto: string): Promise<void> => {
    try {
      const portapapeles = navigator.clipboard;
      if (!portapapeles) {
        throw new Error('El navegador no expone el portapapeles');
      }
      await portapapeles.writeText(texto);
      setResultado('copiado');
    } catch {
      setResultado('fallido');
    }
  }, []);

  return { resultado, copiar };
}

/** Qué pasó con el último intento de compartir el seguimiento. */
export type ResultadoCompartir = 'inactivo' | 'compartido' | 'copiado' | 'fallido';

/**
 * Comparte el enlace del seguimiento.
 *
 * `/reportes/:codigo` es la única ruta pública con datos y se comparte por WhatsApp, así que se
 * usa el diálogo nativo del sistema cuando existe. Si no, se copia el enlace y se dice que se
 * copió: quedarse callado haría creer que el botón no hace nada.
 */
export function useCompartirSeguimiento(): {
  resultado: ResultadoCompartir;
  compartir: (titulo: string) => Promise<void>;
} {
  const [resultado, setResultado] = useState<ResultadoCompartir>('inactivo');

  useEffect(() => {
    if (resultado === 'inactivo') {
      return;
    }
    const temporizador = window.setTimeout(() => setResultado('inactivo'), MS_RESULTADO_COPIA);
    return () => window.clearTimeout(temporizador);
  }, [resultado]);

  const compartir = useCallback(async (titulo: string): Promise<void> => {
    const url = window.location.href;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: titulo, url });
        setResultado('compartido');
        return;
      }
      const portapapeles = navigator.clipboard;
      if (!portapapeles) {
        throw new Error('El navegador no expone el portapapeles');
      }
      await portapapeles.writeText(url);
      setResultado('copiado');
    } catch (error) {
      // Cerrar el diálogo del sistema no es un fallo: no hay nada que avisarle al usuario.
      if (error instanceof DOMException && error.name === 'AbortError') {
        setResultado('inactivo');
        return;
      }
      setResultado('fallido');
    }
  }, []);

  return { resultado, compartir };
}
