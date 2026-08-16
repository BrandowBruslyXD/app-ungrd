import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/shared/i18n';
import { ProveedorReportesDemo, useReportesDemo } from '@/shared/hooks/useReportesDemo';
import { ErrorApi } from '@/shared/api/client';
import { cambiarEstadoReporte } from '@/shared/api/reportes';
import { useColaGestor, RESPONSABLE_GESTOR } from './useColaGestor';

vi.mock('@/shared/api/reportes', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@/shared/api/reportes')>();
  return { ...original, cambiarEstadoReporte: vi.fn() };
});

const cambiarEstadoMock = vi.mocked(cambiarEstadoReporte);

function Envoltura({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <ProveedorReportesDemo>{children}</ProveedorReportesDemo>
    </I18nextProvider>
  );
}

function montarPanel() {
  return renderHook(() => ({ gestor: useColaGestor(), reportes: useReportesDemo() }), {
    wrapper: Envoltura,
  });
}

const PESO: Record<string, number> = { Alta: 0, Media: 1, Baja: 2 };

beforeEach(() => {
  cambiarEstadoMock.mockReset();
  cambiarEstadoMock.mockImplementation((codigo, cambio) =>
    Promise.resolve({ codigo, estado: cambio.estado, actualizadoEn: new Date().toISOString() }),
  );
});

describe('useColaGestor — orden de la cola', () => {
  it('ordena por prioridad y, a igual prioridad, deja primero el más antiguo', () => {
    const { result } = montarPanel();
    const filas = result.current.gestor.cola;

    expect(filas.length).toBeGreaterThan(1);
    for (let indice = 1; indice < filas.length; indice += 1) {
      const anterior = filas[indice - 1].reporte;
      const actual = filas[indice].reporte;
      expect(PESO[anterior.prioridad]).toBeLessThanOrEqual(PESO[actual.prioridad]);
      if (anterior.prioridad === actual.prioridad) {
        expect(new Date(anterior.creadoEn).getTime()).toBeLessThanOrEqual(
          new Date(actual.creadoEn).getTime(),
        );
      }
    }
  });

  it('cada fila solo ofrece estados hacia adelante', () => {
    const { result } = montarPanel();

    for (const { reporte, siguientes } of result.current.gestor.cola) {
      expect(siguientes).not.toContain(reporte.estado);
      if (reporte.estado === 'EnAtencion') {
        expect(siguientes).toEqual(['Atendido', 'Cerrado']);
      }
    }
  });
});

describe('useColaGestor — cambio de estado', () => {
  it('agrega un evento a la cronología con la nota y el responsable', async () => {
    const { result } = montarPanel();
    const codigo = result.current.gestor.cola[0].reporte.codigo;
    const eventosAntes = result.current.reportes.obtenerDetalle(codigo)?.cronologia.length ?? 0;

    await act(async () => {
      await result.current.gestor.cambiarEstado(codigo, 'Cerrado', 'Atención finalizada');
    });

    const detalle = result.current.reportes.obtenerDetalle(codigo);
    expect(detalle?.estado).toBe('Cerrado');
    expect(detalle?.cronologia).toHaveLength(eventosAntes + 1);

    const ultimo = detalle?.cronologia[detalle.cronologia.length - 1];
    expect(ultimo?.estado).toBe('Cerrado');
    expect(ultimo?.nota).toBe('Atención finalizada');
    expect(ultimo?.responsable).toBe(RESPONSABLE_GESTOR);
    expect(ultimo?.fecha).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('sin nota escrita guarda una nota por defecto, nunca una vacía', async () => {
    const { result } = montarPanel();
    const codigo = result.current.gestor.cola[0].reporte.codigo;

    await act(async () => {
      await result.current.gestor.cambiarEstado(codigo, 'Cerrado', '   ');
    });

    const detalle = result.current.reportes.obtenerDetalle(codigo);
    const ultimo = detalle?.cronologia[detalle.cronologia.length - 1];
    expect(ultimo?.nota.trim()).not.toBe('');
    expect(ultimo?.nota).toContain('Cerrado');
  });

  it('reordena la cola después del cambio', async () => {
    const { result } = montarPanel();
    const codigo = result.current.gestor.cola[0].reporte.codigo;

    await act(async () => {
      await result.current.gestor.cambiarEstado(codigo, 'Cerrado', 'Atención finalizada');
    });

    const fila = result.current.gestor.cola.find((actual) => actual.reporte.codigo === codigo);
    expect(fila?.reporte.estado).toBe('Cerrado');
    expect(fila?.siguientes).toEqual([]);
  });

  it('avisa del éxito nombrando el reporte y el estado nuevo', async () => {
    const { result } = montarPanel();
    const codigo = result.current.gestor.cola[0].reporte.codigo;

    await act(async () => {
      await result.current.gestor.cambiarEstado(codigo, 'Cerrado', 'Atención finalizada');
    });

    expect(result.current.gestor.aviso?.tipo).toBe('exito');
    expect(result.current.gestor.aviso?.codigo).toBe(codigo);
    expect(result.current.gestor.aviso?.mensaje).toContain(codigo);
  });
});

describe('useColaGestor — la operación falla', () => {
  it('devuelve el reporte a su estado anterior y no deja el evento en la cronología', async () => {
    cambiarEstadoMock.mockRejectedValue(new ErrorApi(500, 'Se cayó el servidor'));

    const { result } = montarPanel();
    const filaInicial = result.current.gestor.cola[0];
    const codigo = filaInicial.reporte.codigo;
    const estadoPrevio = filaInicial.reporte.estado;
    const eventosAntes = filaInicial.reporte.cronologia.length;

    let guardado = true;
    await act(async () => {
      guardado = await result.current.gestor.cambiarEstado(codigo, 'Cerrado', 'Atención finalizada');
    });

    expect(guardado).toBe(false);
    await waitFor(() => {
      const detalle = result.current.reportes.obtenerDetalle(codigo);
      expect(detalle?.estado).toBe(estadoPrevio);
      expect(detalle?.cronologia).toHaveLength(eventosAntes);
    });
  });

  it('avisa en lenguaje comprensible, sin códigos ni jerga', async () => {
    cambiarEstadoMock.mockRejectedValue(new ErrorApi(500, 'Se cayó el servidor'));

    const { result } = montarPanel();
    const codigo = result.current.gestor.cola[0].reporte.codigo;

    await act(async () => {
      await result.current.gestor.cambiarEstado(codigo, 'Cerrado', 'Atención finalizada');
    });

    const aviso = result.current.gestor.aviso;
    expect(aviso?.tipo).toBe('error');
    expect(aviso?.mensaje).not.toMatch(/500|Error|undefined/);
    expect(aviso?.mensaje.length).toBeGreaterThan(0);
  });

  it('deja de marcar el reporte como guardando cuando termina', async () => {
    cambiarEstadoMock.mockRejectedValue(new ErrorApi(500, 'Se cayó el servidor'));

    const { result } = montarPanel();
    const codigo = result.current.gestor.cola[0].reporte.codigo;

    await act(async () => {
      await result.current.gestor.cambiarEstado(codigo, 'Cerrado', 'Atención finalizada');
    });

    expect(result.current.gestor.codigoGuardando).toBeNull();
  });
});
