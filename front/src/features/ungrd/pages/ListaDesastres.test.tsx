import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { renderWithI18n } from '@/test/render';
import { mockEventos } from '@/mocks/mockSectorial';
import ListaDesastres from './ListaDesastres';

/*
 * La lista es la puerta del módulo, y lo que promete no se ve en una captura:
 * que están todos los desastres, que el que más informes tiene sin remitir va
 * primero, y que la fila entera abre el detalle. Si lo último se rompiera, la
 * pantalla parecería un tablero de solo lectura.
 */

function montar() {
  return renderWithI18n(
    <MemoryRouter initialEntries={['/gestor/reparto']}>
      <ListaDesastres />
    </MemoryRouter>,
  );
}

function filas(): HTMLElement[] {
  return screen.getAllByRole('listitem');
}

describe('ListaDesastres — la lista de desastres en reparto', () => {
  it('muestra una fila por desastre, con su código y su nombre', () => {
    montar();

    expect(filas()).toHaveLength(mockEventos.length);

    for (const evento of mockEventos) {
      expect(screen.getByText(evento.codigo)).toBeInTheDocument();
      expect(screen.getByText(evento.nombre)).toBeInTheDocument();
    }
  });

  it('hace de cada fila entera el enlace al detalle de su desastre', () => {
    montar();

    for (const evento of mockEventos) {
      const enlace = screen.getByRole('link', { name: `Abrir el reparto de ${evento.nombre}` });
      expect(enlace).toHaveAttribute('href', `/gestor/reparto/${evento.codigo}`);
      // La fila entera es el enlace, no un botón «ver más» al final.
      expect(within(enlace).getByText(evento.codigo)).toBeInTheDocument();
    }
  });

  it('encabeza con los desastres en curso y lo que falta por enviar en todos ellos', () => {
    montar();

    const abiertos = mockEventos.filter((evento) => evento.estado !== 'Cerrado');

    expect(screen.getByText(`${abiertos.length} desastres en curso`)).toBeInTheDocument();
    expect(screen.getByText(/informes pendientes de enviar/)).toBeInTheDocument();
  });

  /*
   * El orden es la única decisión de esta pantalla: primero lo que exige
   * atención. Se comprueba contra el evento que tiene más informes sin remitir
   * y contra el que ya pasó a recuperación.
   */
  it('pone primero el desastre con más informes sin enviar y último el que ya se recupera', () => {
    montar();

    const codigos = filas().map((fila) => within(fila).getByRole('link').getAttribute('href'));

    expect(codigos[0]).toBe('/gestor/reparto/EVT-2026-08-15-003');
    expect(codigos[codigos.length - 1]).toBe('/gestor/reparto/EVT-2026-06-19-001');
  });

  it('avisa desde la lista que el desastre sin declaratoria no se puede remitir', () => {
    montar();

    const enlace = screen.getByRole('link', { name: /Deslizamientos de la cordillera nariñense/i });

    expect(within(enlace).getByText('Sin declaratoria vigente')).toBeInTheDocument();
    expect(within(enlace).getByText('Sin decreto no se puede remitir')).toBeInTheDocument();
  });

  it('dice de cuántos municipios afectados hay información, que es el hueco del módulo', () => {
    montar();

    const enlace = screen.getByRole('link', { name: /Inundaciones del bajo San Jorge/i });

    expect(within(enlace).getByText('11 de 24 con información')).toBeInTheDocument();
  });
});
