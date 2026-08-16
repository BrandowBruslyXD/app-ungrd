import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Report } from '@/shared/types';
import { ProveedorReportesDemo } from '@/shared/hooks/useReportesDemo';
import { reporteEstrella } from '@/shared/mocks/mockContrato';
import {
  construirPasosSeguimiento,
  leerReporteCreado,
  useCopiarCodigo,
  useSeguimientoReporte,
} from './useSeguimientoReporte';

const CODIGO = reporteEstrella.codigo;

const REPORTE_BASE: Report = {
  id: 'RPT-2026-08-15-0047',
  type: 'Inundacion',
  reportType: 'afectado',
  title: 'Inundación',
  description: 'Se está inundando la vía principal, el agua ya llega a las casas',
  status: 'EnAtencion',
  prioridad: 'Alta',
  trustLevel: 'autorreportado',
  location: 'Calle 123 #45-67',
  coordinates: { lat: 4.710989, lng: -74.072092 },
  createdAt: '2026-08-15T14:30:00Z',
  updatedAt: '2026-08-15T15:30:00Z',
  satelliteVerified: false,
  timeline: [],
};

describe('construirPasosSeguimiento', () => {
  it('devuelve los seis estados del contrato en orden', () => {
    const pasos = construirPasosSeguimiento(REPORTE_BASE);

    expect(pasos.map((paso) => paso.estado)).toEqual([
      'Reportado',
      'Verificado',
      'Asignado',
      'EnAtencion',
      'Atendido',
      'Cerrado',
    ]);
  });

  it('marca como cumplidos los estados hasta el actual y deja pendientes los siguientes', () => {
    const pasos = construirPasosSeguimiento(REPORTE_BASE);

    expect(pasos.map((paso) => paso.cumplido)).toEqual([true, true, true, true, false, false]);
    expect(pasos.filter((paso) => paso.actual).map((paso) => paso.estado)).toEqual(['EnAtencion']);
  });

  it('solo pone fecha en los pasos cuya fecha conoce el reporte', () => {
    const pasos = construirPasosSeguimiento(REPORTE_BASE);

    expect(pasos[0].fecha).toBe(REPORTE_BASE.createdAt);
    expect(pasos[1].fecha).toBeNull();
    expect(pasos[3].fecha).toBe(REPORTE_BASE.updatedAt);
    expect(pasos[5].fecha).toBeNull();
  });

  it('deja todo pendiente cuando el reporte apenas se creó', () => {
    const pasos = construirPasosSeguimiento({ ...REPORTE_BASE, status: 'Reportado' });

    expect(pasos.map((paso) => paso.cumplido)).toEqual([true, false, false, false, false, false]);
  });
});

describe('leerReporteCreado', () => {
  it('devuelve el reporte cuando el código coincide con el de la ruta', () => {
    const leido = leerReporteCreado({ reporteCreado: REPORTE_BASE }, REPORTE_BASE.id);
    expect(leido).toEqual(REPORTE_BASE);
  });

  it('ignora un reporte de otro código', () => {
    const leido = leerReporteCreado({ reporteCreado: REPORTE_BASE }, 'RPT-2026-08-15-9999');
    expect(leido).toBeUndefined();
  });

  it('ignora un estado de navegación sin forma de reporte', () => {
    expect(leerReporteCreado(null, REPORTE_BASE.id)).toBeUndefined();
    expect(leerReporteCreado({ reporteCreado: { id: 7 } }, REPORTE_BASE.id)).toBeUndefined();
    expect(leerReporteCreado({ reporteCreado: REPORTE_BASE }, undefined)).toBeUndefined();
  });
});

describe('useSeguimientoReporte', () => {
  /** Monta el seguimiento en la ruta del reporte, con el estado compartido y el de navegación. */
  function renderizarSeguimiento(estadoNavegacion?: { reporteCreado: Report }) {
    function Envoltura({ children }: { children: ReactNode }) {
      return (
        <MemoryRouter
          initialEntries={[{ pathname: `/reportes/${CODIGO}`, state: estadoNavegacion }]}
        >
          <ProveedorReportesDemo>
            <Routes>
              <Route path="/reportes/:codigo" element={<>{children}</>} />
            </Routes>
          </ProveedorReportesDemo>
        </MemoryRouter>
      );
    }
    return renderHook(() => useSeguimientoReporte(), { wrapper: Envoltura });
  }

  it('lee el reporte del estado compartido', () => {
    const { result } = renderizarSeguimiento();

    expect(result.current.codigo).toBe(CODIGO);
    expect(result.current.reporte?.status).toBe(reporteEstrella.estado);
    expect(result.current.esRecienCreado).toBe(false);
  });

  it('prefiere el estado compartido al reporte que viajó en la navegación', () => {
    // El ciudadano llegó con su reporte recién enviado, pero el gestor ya lo avanzó: tiene que
    // ver el avance, no la foto del momento en que lo envió.
    const recienEnviado: Report = { ...REPORTE_BASE, id: CODIGO, status: 'Reportado', timeline: [] };
    const { result } = renderizarSeguimiento({ reporteCreado: recienEnviado });

    expect(result.current.reporte?.status).toBe(reporteEstrella.estado);
    expect(result.current.reporte?.timeline.length).toBe(reporteEstrella.cronologia.length);
    // Sigue siendo un envío reciente: el aviso de confirmación no se pierde.
    expect(result.current.esRecienCreado).toBe(true);
  });
});

describe('useCopiarCodigo', () => {
  it('avisa que copió cuando el portapapeles responde', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const { result } = renderHook(() => useCopiarCodigo());
    await act(async () => {
      await result.current.copiar('RPT-2026-08-15-0047');
    });

    expect(writeText).toHaveBeenCalledWith('RPT-2026-08-15-0047');
    await waitFor(() => expect(result.current.resultado).toBe('copiado'));
    vi.unstubAllGlobals();
  });

  it('avisa del fallo cuando el navegador no expone el portapapeles', async () => {
    vi.stubGlobal('navigator', {});

    const { result } = renderHook(() => useCopiarCodigo());
    await act(async () => {
      await result.current.copiar('RPT-2026-08-15-0047');
    });

    await waitFor(() => expect(result.current.resultado).toBe('fallido'));
    vi.unstubAllGlobals();
  });

  it('avisa del fallo cuando el portapapeles rechaza la escritura', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permiso denegado'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const { result } = renderHook(() => useCopiarCodigo());
    await act(async () => {
      await result.current.copiar('RPT-2026-08-15-0047');
    });

    await waitFor(() => expect(result.current.resultado).toBe('fallido'));
    vi.unstubAllGlobals();
  });
});
