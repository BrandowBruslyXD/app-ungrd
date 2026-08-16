import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { renderWithI18n } from '@/shared/test/render';
import { ProveedorReportesDemo } from '@/shared/hooks/useReportesDemo';
import { ErrorApi } from '@/shared/api/client';
import { cambiarEstadoReporte, obtenerResumenEstadisticas } from '@/shared/api/reportes';
import { estadisticasResumen } from '@/shared/mocks/mockContrato';
import ManagerDashboard from './ManagerDashboard';

vi.mock('@/shared/api/reportes', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@/shared/api/reportes')>();
  return {
    ...original,
    cambiarEstadoReporte: vi.fn(),
    obtenerResumenEstadisticas: vi.fn(),
  };
});

const cambiarEstadoMock = vi.mocked(cambiarEstadoReporte);
const resumenMock = vi.mocked(obtenerResumenEstadisticas);

/** El reporte más antiguo de prioridad alta: el primero de la cola. */
const CODIGO_PRIMERO = 'RPT-2026-08-15-0048';

function montarPanel() {
  return renderWithI18n(
    <MemoryRouter>
      <ProveedorReportesDemo>
        <ManagerDashboard />
      </ProveedorReportesDemo>
    </MemoryRouter>,
  );
}

function filaDe(codigo: string): HTMLElement {
  const boton = screen.getByRole('button', { name: `Cambiar el estado del reporte ${codigo}` });
  const fila = boton.closest('li');
  if (fila === null) {
    throw new Error(`No se encontró la fila del reporte ${codigo}`);
  }
  return fila;
}

beforeEach(() => {
  cambiarEstadoMock.mockReset();
  cambiarEstadoMock.mockImplementation((codigo, cambio) =>
    Promise.resolve({ codigo, estado: cambio.estado, actualizadoEn: new Date().toISOString() }),
  );
  resumenMock.mockReset();
  resumenMock.mockResolvedValue(estadisticasResumen);
});

describe('ManagerDashboard — la cola', () => {
  it('pone primero el reporte de prioridad alta que lleva más tiempo esperando', async () => {
    montarPanel();

    const filas = await screen.findAllByRole('listitem');
    expect(within(filas[0]).getByText(CODIGO_PRIMERO)).toBeInTheDocument();
  });

  it('muestra las cifras del día cuando llegan', async () => {
    montarPanel();

    expect(await screen.findByText('47')).toBeInTheDocument();
    expect(screen.getByText('28 min')).toBeInTheDocument();
  });

  it('avisa sin jerga cuando las cifras del día no cargan', async () => {
    resumenMock.mockRejectedValue(new ErrorApi(500, 'se cayó'));
    montarPanel();

    expect(
      await screen.findByText(
        'No pudimos cargar las cifras del día. La cola de atención sigue funcionando.',
      ),
    ).toBeInTheDocument();
  });
});

describe('ManagerDashboard — cerrar el ciclo', () => {
  it('cambia el estado del reporte y lo deja visible en la fila', async () => {
    const usuario = userEvent.setup();
    montarPanel();

    const fila = filaDe(CODIGO_PRIMERO);
    expect(within(fila).getByText('Asignado')).toBeInTheDocument();

    await usuario.click(
      within(fila).getByRole('button', {
        name: `Cambiar el estado del reporte ${CODIGO_PRIMERO}`,
      }),
    );
    await usuario.click(within(fila).getByRole('radio', { name: 'En atención' }));
    await usuario.click(
      within(fila).getByRole('button', { name: 'Usar la nota: Brigada en camino' }),
    );
    await usuario.click(within(fila).getByRole('button', { name: 'Guardar cambio' }));

    await waitFor(() => {
      expect(cambiarEstadoMock).toHaveBeenCalledWith(CODIGO_PRIMERO, {
        estado: 'EnAtencion',
        nota: 'Brigada en camino',
      });
    });

    const filaActualizada = filaDe(CODIGO_PRIMERO);
    expect(within(filaActualizada).getByText('En atención')).toBeInTheDocument();
    expect(within(filaActualizada).getByRole('status')).toHaveTextContent(CODIGO_PRIMERO);
  });

  it('si el cambio falla deja la fila en su estado anterior y lo dice', async () => {
    cambiarEstadoMock.mockRejectedValue(new ErrorApi(500, 'se cayó'));
    const usuario = userEvent.setup();
    montarPanel();

    const fila = filaDe(CODIGO_PRIMERO);
    await usuario.click(
      within(fila).getByRole('button', {
        name: `Cambiar el estado del reporte ${CODIGO_PRIMERO}`,
      }),
    );
    await usuario.click(within(fila).getByRole('radio', { name: 'Atendido' }));
    await usuario.click(within(fila).getByRole('button', { name: 'Guardar cambio' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(
      'No pudimos guardar el cambio. El reporte sigue en Asignado. Vuelve a intentarlo.',
    );

    // El formulario sigue abierto para reintentar; al cerrarlo la fila muestra su estado real.
    await usuario.click(
      within(fila).getByRole('button', {
        name: `Cerrar el cambio de estado del reporte ${CODIGO_PRIMERO}`,
      }),
    );
    expect(within(fila).getByText('Asignado')).toBeInTheDocument();
    expect(within(fila).queryByText('Atendido')).not.toBeInTheDocument();
  });
});
