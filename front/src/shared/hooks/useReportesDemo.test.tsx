import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import i18n from '@/shared/i18n';
import { cambiarEstadoReporte } from '@/shared/api/reportes';
import { reporteEstrella } from '@/shared/mocks/mockContrato';
import type { ReporteDetalle } from '@/shared/types/contrato';
import { ProveedorReportesDemo, useReportesDemo } from './useReportesDemo';
import { aReporteLegado } from './reporteLegado';

vi.mock('@/shared/api/reportes', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@/shared/api/reportes')>();
  return { ...original, cambiarEstadoReporte: vi.fn() };
});

const cambiarEstadoMock = vi.mocked(cambiarEstadoReporte);

function Envoltura({ children }: { children: ReactNode }) {
  return <ProveedorReportesDemo>{children}</ProveedorReportesDemo>;
}

const CODIGO = reporteEstrella.codigo;

/** Un reporte como el que arma el asistente del ciudadano al enviar. */
const NUEVO: ReporteDetalle = {
  codigo: 'RPT-2026-08-15-0099',
  tipo: 'Inundacion',
  descripcion: 'El agua entró a la casa y subió hasta la rodilla',
  latitud: 4.710989,
  longitud: -74.072092,
  direccion: 'Calle 123 #45-67',
  municipio: 'Bogotá',
  urlFoto: null,
  estado: 'Reportado',
  prioridad: 'Alta',
  creadoEn: '2026-08-15T17:00:00Z',
  reportadoPor: 'María R.',
  cronologia: [
    {
      estado: 'Reportado',
      nota: 'Reporte recibido',
      fecha: '2026-08-15T17:00:00Z',
      responsable: 'Sistema',
    },
  ],
  verificacionSatelital: null,
  transparencia: [],
};

beforeEach(() => {
  cambiarEstadoMock.mockReset();
  cambiarEstadoMock.mockImplementation((codigo, cambio) =>
    Promise.resolve({ codigo, estado: cambio.estado, actualizadoEn: new Date().toISOString() }),
  );
});

describe('ProveedorReportesDemo', () => {
  it('el avance del gestor llega al seguimiento del ciudadano', async () => {
    const { result } = renderHook(() => useReportesDemo(), { wrapper: Envoltura });

    await act(async () => {
      await result.current.avanzarEstado(CODIGO, {
        estado: 'Atendido',
        nota: 'Atención finalizada',
        responsable: 'Carlos M.',
      });
    });

    const detalle = result.current.obtenerDetalle(CODIGO);
    expect(detalle).toBeDefined();

    // La pantalla de terreno consume la forma antigua: el evento tiene que sobrevivir la conversión.
    const vistaCiudadano = aReporteLegado(detalle!, i18n.t);
    expect(vistaCiudadano.status).toBe('Atendido');
    expect(vistaCiudadano.timeline[vistaCiudadano.timeline.length - 1].description).toBe(
      'Atención finalizada',
    );
  });

  it('no muta los datos sembrados: otro montaje arranca limpio', async () => {
    const primero = renderHook(() => useReportesDemo(), { wrapper: Envoltura });

    await act(async () => {
      await primero.result.current.avanzarEstado(CODIGO, {
        estado: 'Cerrado',
        nota: 'Caso cerrado',
        responsable: 'Carlos M.',
      });
    });
    primero.unmount();

    const segundo = renderHook(() => useReportesDemo(), { wrapper: Envoltura });
    const detalle = segundo.result.current.obtenerDetalle(CODIGO);
    expect(detalle?.estado).toBe(reporteEstrella.estado);
    expect(detalle?.cronologia).toHaveLength(reporteEstrella.cronologia.length);
  });

  it('rechaza retroceder en el flujo de estados', async () => {
    const { result } = renderHook(() => useReportesDemo(), { wrapper: Envoltura });

    await expect(
      result.current.avanzarEstado(CODIGO, {
        estado: 'Reportado',
        nota: 'Vuelta atrás',
        responsable: 'Carlos M.',
      }),
    ).rejects.toThrow();
    expect(cambiarEstadoMock).not.toHaveBeenCalled();
    expect(result.current.obtenerDetalle(CODIGO)?.estado).toBe(reporteEstrella.estado);
  });

  it('un reporte recién registrado queda visible para la cola del gestor', () => {
    const { result } = renderHook(() => useReportesDemo(), { wrapper: Envoltura });
    const antes = result.current.reportes.length;

    act(() => {
      result.current.registrarReporte(NUEVO, { reportType: 'afectado', householdSize: 4 });
    });

    expect(result.current.reportes).toHaveLength(antes + 1);
    expect(result.current.obtenerDetalle(NUEVO.codigo)?.estado).toBe('Reportado');
    expect(result.current.obtenerExtras(NUEVO.codigo)?.reportType).toBe('afectado');
  });

  it('el reporte recién creado puede avanzar y el ciudadano ve el evento nuevo', async () => {
    const { result } = renderHook(() => useReportesDemo(), { wrapper: Envoltura });

    act(() => {
      result.current.registrarReporte(NUEVO, { reportType: 'afectado' });
    });
    await act(async () => {
      await result.current.avanzarEstado(NUEVO.codigo, {
        estado: 'Verificado',
        nota: 'Confirmado por la alcaldía',
        responsable: 'Carlos M.',
      });
    });

    const vistaCiudadano = aReporteLegado(
      result.current.obtenerDetalle(NUEVO.codigo)!,
      i18n.t,
      result.current.obtenerExtras(NUEVO.codigo),
    );
    expect(vistaCiudadano.status).toBe('Verificado');
    expect(vistaCiudadano.reportType).toBe('afectado');
    expect(vistaCiudadano.timeline.map((evento) => evento.description)).toContain(
      'Confirmado por la alcaldía',
    );
  });

  it('no duplica un reporte cuando se registra dos veces el mismo código', () => {
    const { result } = renderHook(() => useReportesDemo(), { wrapper: Envoltura });
    const antes = result.current.reportes.length;

    act(() => {
      result.current.registrarReporte(NUEVO);
      result.current.registrarReporte(NUEVO);
    });

    expect(result.current.reportes).toHaveLength(antes + 1);
  });

  it('rechaza un código que no existe sin tocar la API', async () => {
    const { result } = renderHook(() => useReportesDemo(), { wrapper: Envoltura });

    await expect(
      result.current.avanzarEstado('RPT-9999-99-99-9999', {
        estado: 'Cerrado',
        nota: 'Caso cerrado',
        responsable: 'Carlos M.',
      }),
    ).rejects.toThrow();
    expect(cambiarEstadoMock).not.toHaveBeenCalled();
  });
});
