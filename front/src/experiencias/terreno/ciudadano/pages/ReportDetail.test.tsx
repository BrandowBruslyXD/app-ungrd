import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderWithI18n } from '@/shared/test/render';
import type { Report } from '@/shared/types';
import ReportDetail from './ReportDetail';

const REPORTE: Report = {
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

/** Monta la pantalla con el reporte entregado en el estado de navegación, como hace el asistente. */
function renderSeguimiento(reporte: Report) {
  return renderWithI18n(
    <MemoryRouter initialEntries={[{ pathname: `/reportes/${reporte.id}`, state: { reporteCreado: reporte } }]}>
      <Routes>
        <Route path="/reportes/:codigo" element={<ReportDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReportDetail', () => {
  it('muestra los seis estados del flujo, cumplidos y pendientes', () => {
    renderSeguimiento(REPORTE);

    const pasos = screen.getAllByRole('listitem');
    expect(pasos).toHaveLength(6);
    expect(pasos[3]).toHaveTextContent('En atención');
    expect(pasos[4]).toHaveTextContent('pendiente');
    expect(pasos[5]).toHaveTextContent('pendiente');
    expect(screen.getByText('Aquí va tu reporte ahora')).toBeInTheDocument();
  });

  it('muestra el bloque de gasto público cuando la inversión fue cero', () => {
    renderSeguimiento({ ...REPORTE, publicSpending: 0 });

    expect(screen.getByText('Gasto público')).toBeInTheDocument();
    expect(
      screen.getByText('La alcaldía no destinó ni un peso a prevención en esta zona'),
    ).toBeInTheDocument();
  });

  it('oculta los bloques de satélite y de gasto público cuando no hay datos', () => {
    renderSeguimiento(REPORTE);

    expect(screen.queryByText('Gasto público')).not.toBeInTheDocument();
    expect(screen.queryByText('Verificado por satélite')).not.toBeInTheDocument();
  });

  it('avisa cuando el navegador no deja copiar el código', async () => {
    renderSeguimiento(REPORTE);

    fireEvent.click(screen.getByRole('button', { name: `Copiar el código ${REPORTE.id}` }));

    expect(
      await screen.findByText(
        'No pudimos copiar el código. Anótalo o mantén presionado el código para copiarlo.',
      ),
    ).toBeInTheDocument();
  });

  it('avisa cuando el reporte no existe', () => {
    renderWithI18n(
      <MemoryRouter initialEntries={['/reportes/RPT-2026-08-15-9999']}>
        <Routes>
          <Route path="/reportes/:codigo" element={<ReportDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Reporte no encontrado')).toBeInTheDocument();
    expect(
      screen.getByText('El reporte RPT-2026-08-15-9999 no existe o fue eliminado.'),
    ).toBeInTheDocument();
  });
});
