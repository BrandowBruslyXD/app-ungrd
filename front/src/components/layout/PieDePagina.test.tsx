import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { renderWithI18n } from '@/test/render';
import PieDePagina from './PieDePagina';

function montar(completo = false) {
  return renderWithI18n(
    <MemoryRouter>
      <PieDePagina completo={completo} />
    </MemoryRouter>,
  );
}

/*
 * El pie tiene dos versiones a propósito.
 *
 * La completa, con el descargo legal y la atribución de mapas, va solo en la
 * portada. En las vistas internas va una barra delgada: repetir en cada
 * pantalla qué es ConectaRiesgo ocupaba media pantalla y no le servía a nadie
 * que ya está adentro llenando un censo.
 */
describe('PieDePagina — barra delgada de las vistas internas', () => {
  it('ofrece la línea de emergencias como enlace telefónico', () => {
    montar();
    expect(screen.getByRole('link', { name: /llamar al 123/i })).toHaveAttribute('href', 'tel:123');
  });

  it('lleva a las secciones principales', () => {
    montar();
    expect(screen.getByRole('link', { name: /reportar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ayudas/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /alertas/i })).toBeInTheDocument();
  });

  it('no repite el descargo legal en cada pantalla', () => {
    montar();
    expect(screen.queryByText(/no reemplaza a la línea 123/i)).not.toBeInTheDocument();
  });
});

describe('PieDePagina — versión completa de la portada', () => {
  it('aclara que no reemplaza al 123 ni al censo oficial', () => {
    montar(true);
    expect(screen.getByText(/no reemplaza a la línea 123/i)).toBeInTheDocument();
  });

  it('acredita a OpenStreetMap, como exige la licencia ODbL de los mapas', () => {
    montar(true);
    expect(screen.getByText(/OpenStreetMap/i)).toBeInTheDocument();
  });

  it('mantiene la línea de emergencias a la vista', () => {
    montar(true);
    expect(screen.getByRole('link', { name: /llamar al 123/i })).toHaveAttribute('href', 'tel:123');
  });
});
