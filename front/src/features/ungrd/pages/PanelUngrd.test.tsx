import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { renderWithI18n } from '@/test/render';
import { mockDanosSinSector } from '@/mocks/mockSectorial';
import PanelUngrd from './PanelUngrd';

/*
 * Lo que se prueba aquí es lo que el panel promete y no se ve mirando una
 * captura: que el silencio va primero, que los trece sectores están aunque uno
 * vaya en cero, y que corregir la clasificación de un daño mueve el reparto en
 * el momento. Si eso último se rompiera, el funcionario asignaría un sector y
 * la pantalla no cambiaría: parecería que el sistema perdió su trabajo.
 */

function montar() {
  return renderWithI18n(
    <MemoryRouter initialEntries={['/gestor/reparto']}>
      <PanelUngrd />
    </MemoryRouter>,
  );
}

function filaDelSector(sector: string): HTMLElement {
  const enlace = screen.getByRole('link', { name: `Abrir el paquete de ${sector}` });
  const fila = enlace.closest('tr');
  if (fila === null) throw new Error(`El sector ${sector} no está dentro de una fila`);
  return fila;
}

/** Las celdas de una fila del reparto, sin contar el encabezado de fila. */
function celdas(fila: HTMLElement): HTMLElement[] {
  return within(fila).getAllByRole('cell');
}

/** La hoja completa de un subpanel, buscada por el título de su banda. */
function subpanel(titulo: string): HTMLElement {
  const banda = screen.getByRole('heading', { level: 2, name: titulo });
  const hoja = banda.closest('section');
  if (hoja === null) throw new Error(`El subpanel ${titulo} no está dentro de una sección`);
  return hoja;
}

function formularioDeLaBandeja(indice: number): HTMLElement {
  const selector = screen.getAllByLabelText('Asignar sector')[indice];
  const formulario = selector.closest('form');
  if (formulario === null) throw new Error('El selector de sector no está dentro de un formulario');
  return formulario;
}

describe('PanelUngrd — panel del evento', () => {
  it('encabeza con el evento, su decreto y los días corridos desde la declaratoria', () => {
    montar();

    expect(
      screen.getByRole('heading', { level: 1, name: /Inundaciones del bajo San Jorge/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Decreto Departamental 0642 de 2026')).toBeInTheDocument();
    expect(screen.getByText('días desde la declaratoria')).toBeInTheDocument();
  });

  it('muestra los cuatro subpaneles en el orden del documento', () => {
    montar();

    const titulos = screen
      .getAllByRole('heading', { level: 2 })
      .map((titulo) => titulo.textContent);

    expect(titulos).toEqual([
      'Cifras del evento',
      'A · Cobertura territorial',
      'B · Reparto por sector',
      'C · Sin clasificar',
      'D · Bitácora de envíos',
    ]);
  });

  it('cuenta los municipios con información sobre el total de afectados', () => {
    montar();

    // 4 con EDAN + 7 con autorreportes, de 24 municipios afectados.
    expect(screen.getByText('11 de 24')).toBeInTheDocument();
    expect(
      screen.getByText('Municipios con información, de los afectados'),
    ).toBeInTheDocument();
  });

  it('ordena la cobertura con los municipios en silencio primero', () => {
    montar();

    const tabla = screen.getByRole('table', { name: /Municipios afectados por el evento/i });
    const filas = within(tabla).getAllByRole('row');

    // La primera fila es el encabezado de la tabla.
    expect(within(filas[1]).getByRole('rowheader')).toHaveTextContent('Buenavista');
    expect(within(filas[1]).getByText('En silencio')).toBeInTheDocument();
    expect(within(filas[filas.length - 1]).getByText('Con EDAN')).toBeInTheDocument();
  });

  /*
   * Una gráfica montada en el subpanel equivocado no rompe nada y por eso hay
   * que probarlo: la página responde cuatro preguntas en orden, y la respuesta
   * gráfica tiene que caer junto a la tabla que la detalla.
   */
  it('monta cada gráfica en su subpanel, antes de la tabla que la detalla', () => {
    montar();

    const cobertura = subpanel('A · Cobertura territorial');
    const reparto = subpanel('B · Reparto por sector');

    const enCobertura = within(cobertura).getAllByRole('img');
    const enReparto = within(reparto).getAllByRole('img');

    expect(enCobertura.map((grafica) => grafica.getAttribute('aria-label'))).toEqual([
      expect.stringContaining('municipios afectados'),
      expect.stringMatching(/entraron \d+ daños/),
    ]);
    expect(enReparto.map((grafica) => grafica.getAttribute('aria-label'))).toEqual([
      expect.stringContaining('% del costo estimado del evento'),
      expect.stringContaining('sectores con daños'),
    ]);

    // La gráfica del daño va antes de las trece filas, no después.
    const tabla = within(reparto).getByRole('table', {
      name: /estado del paquete de cada uno de los trece sectores/i,
    });
    expect(enReparto[0].compareDocumentPosition(tabla)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('muestra los trece sectores, incluido el que no tiene ni un daño', () => {
    montar();

    // Por el estado del paquete, que solo nombra la tabla del reparto: las
    // tablas equivalentes de las gráficas también hablan de «trece sectores».
    const tabla = screen.getByRole('table', {
      name: /estado del paquete de cada uno de los trece sectores/i,
    });
    // Trece sectores, más el encabezado y el pie de totales.
    expect(within(tabla).getAllByRole('row')).toHaveLength(15);

    // Dentro de la tabla: «Deporte» también es una opción del selector de la bandeja.
    expect(within(tabla).getByText('Deporte')).toBeInTheDocument();
    expect(within(tabla).getByText('Sin daños reportados')).toBeInTheDocument();
    // Un sector en cero no se abre: no hay paquete que revisar.
    expect(screen.queryByRole('link', { name: 'Abrir el paquete de Deporte' })).toBeNull();
  });

  it('muestra la confianza como proporción y no como promedio', () => {
    montar();

    const fila = filaDelSector('Transporte');
    const confianza = celdas(fila)[4];

    expect(within(confianza).getByText('verificados')).toBeInTheDocument();
    expect(within(confianza).getByText('autorreportados')).toBeInTheDocument();
  });

  it('asignar un sector a mano saca el daño de la bandeja y lo suma al reparto', async () => {
    const usuario = userEvent.setup();
    montar();

    expect(screen.getAllByLabelText('Asignar sector')).toHaveLength(mockDanosSinSector.length);
    expect(celdas(filaDelSector('Transporte'))[1]).toHaveTextContent('6');

    const formulario = formularioDeLaBandeja(0);
    await usuario.selectOptions(within(formulario).getByLabelText('Asignar sector'), 'Transporte');
    await usuario.click(within(formulario).getByRole('button', { name: 'Asignar' }));

    expect(screen.getAllByLabelText('Asignar sector')).toHaveLength(
      mockDanosSinSector.length - 1,
    );
    expect(celdas(filaDelSector('Transporte'))[1]).toHaveTextContent('7');
    expect(screen.getByRole('status')).toHaveTextContent(/quedó en Transporte/i);
  });

  it('marca todos los envíos de la bitácora como simulados', () => {
    montar();

    const tabla = screen.getByRole('table', { name: /Envíos registrados del evento/i });
    const filas = within(tabla).getAllByRole('row').slice(1);

    expect(filas).toHaveLength(3);
    for (const fila of filas) {
      expect(within(fila).getByText('Simulado')).toBeInTheDocument();
    }
    expect(screen.getByText('Ningún correo sale de verdad')).toBeInTheDocument();
  });
});
