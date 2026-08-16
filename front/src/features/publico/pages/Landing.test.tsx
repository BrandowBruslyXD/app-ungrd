import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { renderWithI18n } from '@/test/render';
import Landing from './Landing';

function montar() {
  return renderWithI18n(
    <MemoryRouter initialEntries={['/']}>
      <Landing onRoleChange={() => {}} />
    </MemoryRouter>,
  );
}

describe('Landing', () => {
  it('muestra la acción principal de reportar', () => {
    montar();
    expect(screen.getByRole('link', { name: /reportar una emergencia/i })).toBeInTheDocument();
  });

  it('permite abrir el tutorial desde la portada', () => {
    montar();
    expect(screen.getByRole('link', { name: /ver tutorial/i })).toHaveAttribute(
      'href',
      '/tutorial',
    );
  });

  it('muestra el aviso del 123 antes que cualquier otra cosa', () => {
    montar();
    expect(screen.getByRole('link', { name: /llamar al 123/i })).toBeInTheDocument();
  });

  it('deja claro que reportar no inscribe en el censo', () => {
    montar();
    expect(screen.getByText(/no es lo mismo que quedar en el censo/i)).toBeInTheDocument();
  });

  it('tiene un solo h1', () => {
    montar();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  /*
   * Esta es la prueba que importa para el pie de la página.
   *
   * Las preguntas salen de `t('faq.items', { returnObjects: true })`. Si esa
   * llamada devolviera una cadena en vez de un arreglo —cosa que cambia entre
   * versiones de i18next— el listado quedaría vacío y el final de la página se
   * vería en blanco, sin que nada fallara en consola.
   */
  it('pinta las preguntas frecuentes al final de la página', () => {
    montar();
    expect(
      screen.getByRole('heading', { name: /preguntas frecuentes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/¿Reportar aquí me inscribe en el censo de damnificados\?/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/¿Me cobran algo por reportar/i)).toBeInTheDocument();
  });

  it('muestra las ocho preguntas, no menos', () => {
    montar();
    // Cada pregunta es un `<summary>` dentro de un `<details>`.
    expect(document.querySelectorAll('details')).toHaveLength(8);
  });

  it('cierra con la nota de que no reemplaza al 123 ni al censo', () => {
    montar();
    // La nota vive en la portada; el pie de página completo lo pone el armazón
    // de la aplicación y se prueba aparte, en PieDePagina.test.tsx.
    expect(screen.getByText(/es una herramienta de apoyo/i)).toBeInTheDocument();
  });
});
