import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderWithI18n } from '@/test/render';
import { armarNecesidades } from '../hooks/usePaqueteMinisterio';
import PaqueteMinisterio from './PaqueteMinisterio';

function montar(sector: string) {
  return renderWithI18n(
    <MemoryRouter initialEntries={[`/gestor/reparto/${sector}`]}>
      <Routes>
        <Route path="/gestor/reparto/:sector" element={<PaqueteMinisterio />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PaqueteMinisterio', () => {
  it('encabeza con el ministerio destinatario y el decreto que ampara el envío', () => {
    montar('Educacion');

    expect(
      screen.getByRole('heading', { level: 1, name: /Ministerio de Educación Nacional/i }),
    ).toBeInTheDocument();
    // Aparece dos veces a propósito: en la ficha del paquete y citado dentro
    // del cuerpo del oficio, que es donde de verdad ampara la actuación.
    expect(screen.getAllByText(/Decreto Departamental 0642 de 2026/).length).toBeGreaterThan(0);
  });

  /*
   * La prueba que sostiene la credibilidad del módulo. Un ministerio tiene que
   * poder separar lo verificado por el CMGRD de lo que solo dijo un ciudadano;
   * si esta columna desaparece, el paquete deja de ser confiable sin que nada
   * falle en pantalla.
   */
  it('muestra el nivel de confianza de cada daño del detalle', () => {
    montar('Educacion');

    const detalle = screen.getByRole('table', { name: /detalle de los daños/i });
    expect(within(detalle).getAllByText(/Verificado por el CMGRD/).length).toBeGreaterThan(0);
    expect(within(detalle).getAllByText(/Autorreportado/).length).toBeGreaterThan(0);
  });

  it('trae los totales por municipio, que es como el ministerio pide la información', () => {
    montar('Educacion');

    const municipios = screen.getByRole('table', { name: /totales por municipio/i });
    expect(within(municipios).getByRole('rowheader', { name: 'Montería' })).toBeInTheDocument();
    expect(within(municipios).getByRole('rowheader', { name: 'Cereté' })).toBeInTheDocument();
  });

  it('cierra con la tabla de necesidades del formato oficial', () => {
    montar('Educacion');

    const necesidades = screen.getByRole('table', { name: /necesidades del sector/i });
    expect(
      within(necesidades).getByRole('columnheader', { name: /equipos o elementos requeridos/i }),
    ).toBeInTheDocument();
  });

  it('anuncia el PDF como pendiente en vez de ofrecer un botón que no hace nada', () => {
    montar('Educacion');

    expect(screen.getByRole('button', { name: /descargar el oficio en pdf/i })).toBeDisabled();
    expect(screen.getByText(/todavía no se genera/i)).toBeInTheDocument();
  });

  it('deja ver el correo completo antes de aprobarlo', () => {
    montar('Educacion');

    // La dirección está en la ficha del paquete y en el «Para» del correo.
    expect(screen.getAllByText('educacion@ejemplo.gov.co')).toHaveLength(2);
    expect(screen.getByText(/Remisión de daños sector Educacion/)).toBeInTheDocument();
  });

  it('dice que el envío es simulado sin que haya que buscarlo', () => {
    montar('Educacion');

    expect(screen.getByText('Envío simulado')).toBeInTheDocument();
  });

  /*
   * El envío no puede salir solo: el formato oficial exige firma humana. Que la
   * confirmación exista es tan importante como que el envío funcione.
   */
  it('pide confirmación antes de dejar el paquete en enviado', async () => {
    const usuario = userEvent.setup();
    montar('Educacion');

    await usuario.click(screen.getByRole('button', { name: /^aprobar y enviar$/i }));
    expect(screen.getByText(/¿Aprueba la remisión de este paquete\?/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /sí, aprobar y enviar/i }));
    expect(screen.getByText(/Paquete remitido, con envío simulado/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^aprobar y enviar$/i })).not.toBeInTheDocument();
  });

  it('deja cancelar la confirmación sin enviar nada', async () => {
    const usuario = userEvent.setup();
    montar('Educacion');

    await usuario.click(screen.getByRole('button', { name: /^aprobar y enviar$/i }));
    await usuario.click(screen.getByRole('button', { name: /todavía no/i }));

    expect(screen.queryByText(/Paquete remitido/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^aprobar y enviar$/i })).toBeInTheDocument();
  });

  it('un sector sin daños se muestra en cero y no ofrece nada que enviar', () => {
    montar('Deporte');

    expect(screen.getByText(/no le corresponde ningún daño/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /descargar el detalle en csv/i })).toBeNull();
  });

  it('un sector que no existe recibe una explicación y una salida, sin códigos de error', () => {
    montar('Turismo');

    expect(screen.getByRole('heading', { level: 1, name: /no encontramos ese paquete/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver el reparto del evento/i })).toHaveAttribute(
      'href',
      '/gestor/reparto',
    );
  });
});

describe('descarga del CSV del paquete', () => {
  const crear = vi.fn(() => 'blob:paquete');
  const revocar = vi.fn();

  beforeEach(() => {
    // jsdom no implementa la API de blobs: se sustituye para poder comprobar
    // que la descarga se dispara de verdad y no solo que el botón existe.
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: crear, revokeObjectURL: revocar }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    crear.mockClear();
    revocar.mockClear();
  });

  it('genera el archivo con el código del paquete en el nombre', async () => {
    const usuario = userEvent.setup();
    let descargado: string | undefined;

    const clic = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        descargado = this.download;
      });

    montar('Educacion');
    await usuario.click(screen.getByRole('button', { name: /descargar el detalle en csv/i }));

    expect(crear).toHaveBeenCalledTimes(1);
    expect(descargado).toMatch(/^PQT-2026-08-15-\d{4}-Educacion\.csv$/);

    clic.mockRestore();
  });
});

/*
 * La tabla de necesidades es lo único de esta pantalla que no sale tal cual de
 * `lib/sectorial`: se deriva aquí. Si se derivara mal, el funcionario aprobaría
 * un costo que no corresponde con el detalle que va adjunto.
 */
describe('armarNecesidades', () => {
  const base = {
    id: 'DS-1',
    eventoId: 'EVT-1',
    sector: 'Vivienda' as const,
    origen: 'CargaEdan' as const,
    origenId: 'EDAN-1',
    nivelConfianza: 'Verificado' as const,
    municipio: 'Montería',
    departamento: 'Córdoba',
    descripcion: 'Viviendas averiadas',
    cantidad: 1,
    unidad: 'viviendas',
    clasificadoPor: 'Regla' as const,
    registradoEn: '2026-08-14T15:00:00Z',
  };

  it('ordenaLoDestruidoPrimeroYLoSinNivelAlFinal', () => {
    const filas = armarNecesidades([
      { ...base, id: 'a', nivel: 'Leve' },
      { ...base, id: 'b' },
      { ...base, id: 'c', nivel: 'DestruccionTotal' },
      { ...base, id: 'd', nivel: 'Grave' },
    ]);

    expect(filas.map((fila) => fila.nivel)).toEqual(['DestruccionTotal', 'Grave', 'Leve', null]);
  });

  it('sumaLasCantidadesPorUnidadYNoInventaCostos', () => {
    const filas = armarNecesidades([
      { ...base, id: 'a', nivel: 'Grave', cantidad: 12, costoEstimado: 100 },
      { ...base, id: 'b', nivel: 'Grave', cantidad: 8 },
      { ...base, id: 'c', nivel: 'Grave', cantidad: 3, unidad: 'km de vía', costoEstimado: 50 },
    ]);

    expect(filas).toHaveLength(1);
    expect(filas[0].elementos).toEqual([
      { unidad: 'viviendas', cantidad: 20 },
      { unidad: 'km de vía', cantidad: 3 },
    ]);
    expect(filas[0].costoEstimado).toBe(150);
    expect(filas[0].sinCosto).toBe(1);
  });
});
