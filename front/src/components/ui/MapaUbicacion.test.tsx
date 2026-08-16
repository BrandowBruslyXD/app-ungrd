import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@/test/render';
import MapaUbicacion from '@/components/ui/MapaUbicacion';
import { fechaImagenGibs, textoFechaImagen } from '@/lib/capasMapa';

/*
 * El conmutador de capas es lo único del mapa que se puede probar sin un
 * navegador: Leaflet pinta las teselas con etiquetas `img` que jsdom no
 * descarga. Lo que sí se comprueba aquí es que el gestor pueda cambiar de capa,
 * que sepa qué está mirando y que los botones se puedan tocar y anunciar.
 */

describe('MapaUbicacion — conmutador de capas', () => {
  it('MapaUbicacion_soloLectura_arrancaEnSateliteYDiceLaFechaDeLaToma', () => {
    renderWithI18n(<MapaUbicacion valor={null} />);

    const satelite = screen.getByRole('button', { name: 'Satélite' });
    expect(satelite).toHaveAttribute('aria-pressed', 'true');

    const fecha = textoFechaImagen(fechaImagenGibs());
    expect(screen.getByText(new RegExp(`Imagen VIIRS del ${fecha}`))).toBeInTheDocument();
  });

  it('MapaUbicacion_soloLectura_advierteQueNoEsTiempoReal', () => {
    renderWithI18n(<MapaUbicacion valor={null} />);

    expect(screen.getByText(/No es tiempo real/)).toBeInTheDocument();
  });

  it('MapaUbicacion_editable_arrancaEnCallesParaNoTaparElPuntoQueSeMarca', () => {
    renderWithI18n(<MapaUbicacion valor={null} onChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Calles' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText(/Imagen VIIRS/)).not.toBeInTheDocument();
  });

  it('MapaUbicacion_conCapaInicial_respetaLaQueDecideElPanel', () => {
    renderWithI18n(<MapaUbicacion valor={null} capaInicial="relieve" />);

    expect(screen.getByRole('button', { name: 'Relieve' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('MapaUbicacion_alTocarCalles_cambiaDeCapaYRetiraElPieDelSatelite', async () => {
    const usuario = userEvent.setup();
    renderWithI18n(<MapaUbicacion valor={null} />);

    await usuario.click(screen.getByRole('button', { name: 'Calles' }));

    expect(screen.getByRole('button', { name: 'Calles' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Satélite' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/Imagen VIIRS/)).not.toBeInTheDocument();
  });

  it('MapaUbicacion_conmutador_ofreceLasTresCapasEnUnGrupoAnunciado', () => {
    renderWithI18n(<MapaUbicacion valor={null} />);

    const grupo = screen.getByRole('group', { name: 'Capa del mapa' });
    const botones = within(grupo).getAllByRole('button');

    expect(botones.map((boton) => boton.textContent)).toEqual(['Satélite', 'Relieve', 'Calles']);
  });
});
