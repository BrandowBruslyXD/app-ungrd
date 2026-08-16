import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderWithI18n } from '@/shared/test/render';
import PaqueteMinisterio from '@/experiencias/sala/ungrd/pages/PaqueteMinisterio';

function renderizarPaquete(codigo: string) {
  return renderWithI18n(
    <MemoryRouter initialEntries={[`/panel/paquetes/${codigo}`]}>
      <Routes>
        <Route path="/panel/paquetes/:codigo" element={<PaqueteMinisterio />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PaqueteMinisterio', () => {
  it('muestra el ministerio destinatario cuando el paquete existe', async () => {
    renderizarPaquete('PQT-2026-08-15-0007');

    expect(
      await screen.findByRole('heading', { name: /Ministerio de Educación Nacional/ }),
    ).toBeInTheDocument();
  });

  it('avisa que está armando el paquete mientras llegan los datos', () => {
    renderizarPaquete('PQT-2026-08-15-0007');

    expect(screen.getByRole('status')).toHaveTextContent('Armando el paquete del ministerio');
  });

  it('separa los daños por nivel de confianza en el resumen', async () => {
    renderizarPaquete('PQT-2026-08-15-0007');
    await screen.findByRole('heading', { name: /Ministerio de Educación Nacional/ });

    expect(screen.getByText('De qué confianza son los datos')).toBeInTheDocument();
    expect(screen.getByText('Verificado por el CMGRD con EDAN municipal')).toBeInTheDocument();
    expect(screen.getByText('Reporte ciudadano sin verificar')).toBeInTheDocument();
  });

  it('deja visible que el envío es simulado', async () => {
    renderizarPaquete('PQT-2026-08-15-0007');
    await screen.findByRole('heading', { name: /Ministerio de Educación Nacional/ });

    expect(screen.getAllByText('Envío simulado').length).toBeGreaterThan(0);
  });

  it('deshabilita la descarga del PDF y explica que llega después', async () => {
    renderizarPaquete('PQT-2026-08-15-0007');
    await screen.findByRole('heading', { name: /Ministerio de Educación Nacional/ });

    expect(screen.getByRole('button', { name: /Descargar el oficio en PDF/ })).toBeDisabled();
    expect(screen.getByText(/El oficio en PDF llega después/)).toBeInTheDocument();
  });

  it('pide confirmación antes de enviar y registra el envío cuando se confirma', async () => {
    const usuario = userEvent.setup();
    renderizarPaquete('PQT-2026-08-15-0007');
    await screen.findByRole('heading', { name: /Ministerio de Educación Nacional/ });

    await usuario.click(screen.getByRole('button', { name: /Aprobar y enviar/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Sí, aprobar y enviar/ }));

    expect(await screen.findByText('Envío registrado', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(
      screen.getByText('Este paquete ya fue aprobado y su envío quedó registrado.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('no envía nada cuando el funcionario cancela la confirmación', async () => {
    const usuario = userEvent.setup();
    renderizarPaquete('PQT-2026-08-15-0007');
    await screen.findByRole('heading', { name: /Ministerio de Educación Nacional/ });

    await usuario.click(screen.getByRole('button', { name: /Aprobar y enviar/ }));
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Envío registrado')).not.toBeInTheDocument();
  });

  it('explica en lenguaje comprensible cuando el código no corresponde a ningún paquete', async () => {
    renderizarPaquete('PQT-INEXISTENTE');

    expect(
      await screen.findByRole('heading', { name: 'No encontramos este paquete' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir un paquete de ejemplo/ })).toBeInTheDocument();
  });
});
