import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderWithI18n } from '@/test/render';
import { armarNecesidades } from '../hooks/usePaqueteMinisterio';
import PaqueteMinisterio from './PaqueteMinisterio';

/** El desastre sembrado que usan casi todas las pruebas: el bajo San Jorge. */
const EVENTO = 'EVT-2026-08-15-003';

function montar(sector: string, evento: string = EVENTO) {
  return renderWithI18n(
    <MemoryRouter initialEntries={[`/gestor/reparto/${evento}/${sector}`]}>
      <Routes>
        <Route path="/gestor/reparto/:evento/:sector" element={<PaqueteMinisterio />} />
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

  /*
   * El orden de los tres pasos no es decorativo: el PDF lleva la fecha y el
   * responsable que fija el paso 1. Un oficio impreso sin eso es un papel sin
   * autor ni corte de información.
   */
  it('no deja descargar el PDF antes de generar el informe, y dice por qué', () => {
    montar('Educacion');

    expect(screen.getByRole('button', { name: /descargar el oficio en pdf/i })).toBeDisabled();
    expect(screen.getByText(/todavía no se genera/i)).toBeInTheDocument();
  });

  it('avisa de que el PDF sale del diálogo de impresión, junto al botón', () => {
    montar('Educacion');

    expect(screen.getByText(/Guardar como PDF/)).toBeInTheDocument();
  });

  it('el CSV se puede descargar desde el principio, sin generar el informe', () => {
    montar('Educacion');

    expect(screen.getByRole('button', { name: /descargar el detalle en csv/i })).toBeEnabled();
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
    expect(screen.getByRole('link', { name: /ver la lista de desastres/i })).toHaveAttribute(
      'href',
      '/gestor/reparto',
    );
  });

  /*
   * El paquete cuelga del desastre. Si el código del evento no existe, el sector
   * puede ser válido y aun así no haber nada que abrir: se dice, en vez de
   * enseñar el paquete del primer desastre sembrado como si fuera este.
   */
  it('un desastre que no existe no cae en el paquete de otro evento', () => {
    montar('Educacion', 'EVT-2026-01-01-999');

    expect(
      screen.getByRole('heading', { level: 1, name: /no encontramos ese paquete/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/EVT-2026-01-01-999/)).toBeInTheDocument();
  });

  it('abre el paquete del desastre que pide la URL, no el del primero sembrado', () => {
    montar('Educacion', 'EVT-2026-08-14-007');

    expect(screen.getAllByText(/Sismo de la cordillera Central/).length).toBeGreaterThan(0);
  });

  it('vuelve al reparto del desastre del que cuelga el paquete', () => {
    montar('Educacion');

    expect(screen.getByRole('link', { name: /volver al reparto del desastre/i })).toHaveAttribute(
      'href',
      `/gestor/reparto/${EVENTO}`,
    );
  });
});

/*
 * El PDF no lo genera una librería: lo genera el navegador con la hoja
 * `impresion.css` y «Guardar como PDF». Lo que estas pruebas sostienen es la
 * secuencia y el contenido del documento; el aspecto en papel no se puede
 * comprobar en jsdom, que no calcula estilos ni pagina.
 */
describe('el informe imprimible del paquete', () => {
  async function generar() {
    const usuario = userEvent.setup();
    montar('Educacion');
    await usuario.click(screen.getByRole('button', { name: /generar ahora/i }));
    return usuario;
  }

  it('habilita el PDF al generar el informe y deja constancia de la fecha', async () => {
    await generar();

    expect(screen.getByRole('button', { name: /descargar el oficio en pdf/i })).toBeEnabled();
    expect(screen.getByText(/Informe generado el/)).toBeInTheDocument();
    expect(screen.queryByText(/todavía no se genera/i)).not.toBeInTheDocument();
  });

  it('abre el diálogo de impresión del navegador al pedir el PDF', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => {});
    const usuario = await generar();

    await usuario.click(screen.getByRole('button', { name: /descargar el oficio en pdf/i }));

    expect(imprimir).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Se abrió el diálogo de impresión/)).toBeInTheDocument();

    imprimir.mockRestore();
  });

  /*
   * El membrete es lo único que el ministerio ve al recibir la hoja impresa: sin
   * evento, decreto y responsable, el consolidado no se puede archivar ni citar.
   */
  it('el documento lleva membrete con el evento, el amparo legal y quién lo generó', async () => {
    await generar();

    expect(screen.getByText(/Consolidado sectorial de daños para remisión/)).toBeInTheDocument();
    expect(screen.getAllByText(/Decreto Departamental 0642 de 2026/).length).toBeGreaterThan(1);
    expect(screen.getByText(/Por el funcionario de la sesión de demostración/)).toBeInTheDocument();
  });

  it('el documento cierra advirtiendo que los autorreportes no están verificados', async () => {
    await generar();

    expect(
      screen.getByText(/Advertencia: los daños marcados como autorreportados/),
    ).toBeInTheDocument();
    expect(screen.getByText(/el envío por correo es simulado/i)).toBeInTheDocument();
  });

  it('marca el envío como último paso hecho cuando se firma la remisión', async () => {
    const usuario = await generar();

    await usuario.click(screen.getByRole('button', { name: /^aprobar y enviar$/i }));
    await usuario.click(screen.getByRole('button', { name: /sí, aprobar y enviar/i }));

    expect(screen.getByText(/Envío registrado el/)).toBeInTheDocument();
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
