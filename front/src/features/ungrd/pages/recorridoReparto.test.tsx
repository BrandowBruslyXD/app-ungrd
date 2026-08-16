import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderWithI18n } from '@/test/render';
import { eventoPorCodigo, mockEventos } from '@/mocks/mockSectorial';
import ListaDesastres from './ListaDesastres';
import PanelUngrd from './PanelUngrd';
import PaqueteMinisterio from './PaqueteMinisterio';

/*
 * La costura entre las tres pantallas del reparto sectorial.
 *
 * Cada una tiene sus propias pruebas; lo que aquí se comprueba es lo que solo
 * falla cuando se recorren en orden y que ninguna de las tres podía detectar por
 * separado: que el desastre elegido en la lista es el que abre el detalle, y que
 * el informe que se descarga al final trae los daños de **ese** desastre.
 *
 * El módulo nació con un solo evento sembrado y la ruta entraba directo a su
 * detalle. Al pasar a cuatro, el riesgo real no es que una pantalla se rompa
 * —eso se ve— sino que siga leyendo el primer evento en silencio y le remita a
 * un ministerio los daños de una emergencia que no es la suya. Por eso las
 * afirmaciones de abajo comparan siempre contra un desastre que NO es el
 * primero de la semilla.
 */

/** El segundo desastre sembrado: sirve para distinguir «el de la URL» de «el primero». */
const CODIGO_SISMO = 'EVT-2026-08-14-007';

/** El desastre sin declaratoria. No hay decreto que citar, así que no se remite. */
const CODIGO_SIN_DECRETO = 'EVT-2026-08-11-004';

/** Las tres rutas reales del módulo, tal como las monta `App`. */
function montarRecorrido(rutaInicial: string) {
  return renderWithI18n(
    <MemoryRouter initialEntries={[rutaInicial]}>
      <Routes>
        <Route path="/gestor/reparto" element={<ListaDesastres />} />
        <Route path="/gestor/reparto/:evento" element={<PanelUngrd />} />
        <Route path="/gestor/reparto/:evento/:sector" element={<PaqueteMinisterio />} />
      </Routes>
    </MemoryRouter>,
  );
}

function eventoSembrado(codigo: string) {
  const evento = eventoPorCodigo(codigo);
  if (evento === undefined) throw new Error(`El desastre ${codigo} no está sembrado`);
  return evento;
}

describe('Recorrido del reparto sectorial', () => {
  it('lista los cuatro desastres sembrados, y no solo uno', () => {
    montarRecorrido('/gestor/reparto');

    const filas = screen.getAllByRole('link', { name: /^Abrir el reparto de/ });
    expect(filas).toHaveLength(mockEventos.length);
    expect(filas).toHaveLength(4);
  });

  it('abre el desastre que se pulsa y carga sus datos, no los del primero', async () => {
    const usuario = userEvent.setup();
    const sismo = eventoSembrado(CODIGO_SISMO);
    const primero = mockEventos[0];

    montarRecorrido('/gestor/reparto');

    await usuario.click(screen.getByRole('link', { name: `Abrir el reparto de ${sismo.nombre}` }));

    expect(screen.getByRole('heading', { level: 1, name: sismo.nombre })).toBeInTheDocument();
    expect(screen.getByText(sismo.codigo)).toBeInTheDocument();

    /* La afirmación que de verdad importa: el detalle NO se quedó en el evento
       único que el módulo traía sembrado antes de que hubiera cuatro. */
    expect(screen.queryByText(primero.codigo)).toBeNull();
    expect(screen.queryByRole('heading', { level: 1, name: primero.nombre })).toBeNull();
  });

  it('desde el reparto por sector llega al informe del ministerio de ese mismo desastre', async () => {
    const usuario = userEvent.setup();
    const sismo = eventoSembrado(CODIGO_SISMO);

    montarRecorrido(`/gestor/reparto/${CODIGO_SISMO}`);

    await usuario.click(screen.getByRole('link', { name: 'Abrir el paquete de Vivienda' }));

    /* El informe se identifica por el evento que cita su ficha: es el dato que
       acabaría impreso en el oficio y el que delataría el desastre equivocado. */
    const encabezado = screen.getByRole('heading', { name: 'Ficha del paquete' });
    const ficha = encabezado.closest('section');
    if (ficha === null) throw new Error('La ficha del paquete no está dentro de una sección');

    expect(within(ficha).getByText(sismo.codigo)).toBeInTheDocument();
    expect(within(ficha).getByText(sismo.nombre)).toBeInTheDocument();
  });

  it('vuelve del informe al reparto de su desastre, no a la lista', async () => {
    const usuario = userEvent.setup();
    const sismo = eventoSembrado(CODIGO_SISMO);

    montarRecorrido(`/gestor/reparto/${CODIGO_SISMO}/Vivienda`);

    await usuario.click(screen.getByRole('link', { name: 'Volver al reparto del desastre' }));

    expect(screen.getByRole('heading', { level: 1, name: sismo.nombre })).toBeInTheDocument();
  });

  it('un código de desastre inexistente se explica con palabras y ofrece la lista', () => {
    montarRecorrido('/gestor/reparto/EVT-QUE-NO-EXISTE');

    expect(
      screen.getByRole('heading', { level: 1, name: 'No encontramos ese desastre' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no corresponde a ningún desastre en reparto/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver la lista de desastres' })).toBeInTheDocument();

    /* Nada de «404» ni de jerga: quien lee esto está atendiendo una emergencia. */
    expect(document.body.textContent).not.toMatch(/\b(404|500|Error \d|undefined|NaN)\b/);
  });

  it('un informe cuyo desastre no existe también se explica, aunque el sector sí sea válido', () => {
    montarRecorrido('/gestor/reparto/EVT-QUE-NO-EXISTE/Vivienda');

    expect(
      screen.getByRole('heading', { level: 1, name: 'No encontramos ese paquete' }),
    ).toBeInTheDocument();
    /* Se nombra el código del desastre y no solo el del sector: el enlace pudo
       fallar por cualquiera de los dos y acusar al sector despistaría. */
    expect(screen.getByText(/EVT-QUE-NO-EXISTE/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\b(404|500|Error \d|undefined|NaN)\b/);
  });

  describe('el desastre sin declaratoria', () => {
    it('el panel enuncia los tres pasos pero advierte que el tercero no procede', () => {
      montarRecorrido(`/gestor/reparto/${CODIGO_SIN_DECRETO}`);

      expect(screen.getByText('1 · Genere el informe')).toBeInTheDocument();
      expect(screen.getByText('2 · Descargue el PDF')).toBeInTheDocument();
      expect(screen.getByText('3 · Envíelo por correo')).toBeInTheDocument();
      expect(screen.getByText(/no hay decreto que citar/i)).toBeInTheDocument();
    });

    it('el informe del ministerio tampoco ofrece firmar el envío, y dice por qué', () => {
      /*
       * El panel lo advertía y esta pantalla no: ofrecía «Aprobar y enviar» para
       * un evento sin decreto que lo ampare, que es justo lo que la anterior
       * acababa de decir que no se puede hacer. Las dos tienen que contar lo
       * mismo, o la advertencia del panel no vale nada.
       */
      montarRecorrido(`/gestor/reparto/${CODIGO_SIN_DECRETO}/Transporte`);

      expect(screen.queryByRole('button', { name: 'Aprobar y enviar' })).toBeNull();
      expect(screen.getByText('Todavía no se puede remitir')).toBeInTheDocument();
      expect(screen.getByText(/no tiene declaratoria vigente/i)).toBeInTheDocument();
    });

    it('deja descargar el informe: lo que no procede es remitirlo', () => {
      montarRecorrido(`/gestor/reparto/${CODIGO_SIN_DECRETO}/Transporte`);

      /* El CSV no depende ni del paso 1 ni del decreto: el ministerio puede ir
         trabajando el detalle mientras se declara la calamidad. */
      expect(
        screen.getByRole('button', { name: 'Descargar el detalle en CSV' }),
      ).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Generar ahora' })).toBeEnabled();
    });
  });

  it('un desastre con decreto sí ofrece firmar el envío', () => {
    /* La contraparte de la prueba de arriba: sin ella, esconder el botón siempre
       también pasaría, y el módulo no serviría para nada. */
    montarRecorrido(`/gestor/reparto/${CODIGO_SISMO}/Vivienda`);

    expect(screen.getByRole('button', { name: 'Aprobar y enviar' })).toBeInTheDocument();
  });

  it('los tres pasos se leen en orden en el informe del ministerio', () => {
    montarRecorrido(`/gestor/reparto/${CODIGO_SISMO}/Vivienda`);

    expect(screen.getByText('Generar el informe')).toBeInTheDocument();
    expect(screen.getByText('Descargar el PDF')).toBeInTheDocument();
    expect(screen.getByText('Enviar por correo')).toBeInTheDocument();

    /* El paso 2 no se puede dar antes que el 1: el PDF sale del documento que
       fija el paso 1, y sin él no habría membrete ni fecha de corte. */
    expect(screen.getByRole('button', { name: 'Descargar el oficio en PDF' })).toBeDisabled();
  });
});
