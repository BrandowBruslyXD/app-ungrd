import { describe, it, expect } from 'vitest';
import {
  CAPA_DE_RESPALDO,
  CAPA_GIBS_COLOR_REAL,
  CAPA_INICIAL_EDICION,
  CAPA_INICIAL_LECTURA,
  ZOOM_NATIVO_GIBS,
  construirCapasBase,
  construirUrlTesela,
  fechaImagenGibs,
  plantillaTeselasGibs,
  textoFechaImagen,
} from '@/lib/capasMapa';
import es from '@/locales/es.json';

/*
 * Dos cosas se rompen en silencio y no se ven mirando la pantalla: una URL de
 * tesela con {x} e {y} cambiados —el mapa sale gris, sin error— y una fecha
 * adelantada, que le pide a GIBS una imagen que todavía no ha publicado. Las
 * dos se comprueban aquí.
 */

describe('plantillaTeselasGibs', () => {
  it('plantillaTeselasGibs_conFecha_poneLaFechaYLaCapaEnLaRuta', () => {
    const plantilla = plantillaTeselasGibs('2026-08-15');

    expect(plantilla).toContain(`/best/${CAPA_GIBS_COLOR_REAL}/default/2026-08-15/`);
    expect(plantilla).toContain('GoogleMapsCompatible_Level9');
    expect(plantilla.endsWith('.jpg')).toBe(true);
  });

  it('plantillaTeselasGibs_siempre_dejaElOrdenZYXQueEsperaGibs', () => {
    // Leaflet arma {z}/{x}/{y}; GIBS sirve {z}/{y}/{x}. Si se invierte, el
    // servidor responde con teselas de otro sitio o con nada.
    expect(plantillaTeselasGibs('2026-08-15')).toContain('/{z}/{y}/{x}.jpg');
  });

  it('plantillaTeselasGibs_conOtraCapa_usaLaCapaIndicada', () => {
    const plantilla = plantillaTeselasGibs('2026-08-15', 'MODIS_Terra_CorrectedReflectance_TrueColor');

    expect(plantilla).toContain('/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/');
  });
});

describe('construirUrlTesela', () => {
  it('construirUrlTesela_conPlantillaDeGibs_colocaFilaAntesQueColumna', () => {
    const url = construirUrlTesela(plantillaTeselasGibs('2026-08-15'), { z: 6, x: 18, y: 30 });

    expect(url.endsWith('/6/30/18.jpg')).toBe(true);
  });

  it('construirUrlTesela_conPlantillaDeOpenStreetMap_colocaColumnaAntesQueFila', () => {
    const calles = construirCapasBase('2026-08-15').find((capa) => capa.clave === 'calles');

    expect(construirUrlTesela(calles!.plantillaUrl, { z: 6, x: 18, y: 30 })).toBe(
      'https://tile.openstreetmap.org/6/18/30.png',
    );
  });
});

describe('fechaImagenGibs', () => {
  it('fechaImagenGibs_porOmision_devuelveElDiaAnteriorEnUtc', () => {
    // A las 10 de la mañana UTC el satélite todavía no ha pasado sobre Colombia
    // y el mosaico del día no existe: se pide el de ayer.
    expect(fechaImagenGibs(new Date('2026-08-16T10:21:00Z'))).toBe('2026-08-15');
  });

  it('fechaImagenGibs_alFiloDeMedianoche_noSeAdelantaPorLaZonaHoraria', () => {
    expect(fechaImagenGibs(new Date('2026-08-16T00:00:00Z'))).toBe('2026-08-15');
    expect(fechaImagenGibs(new Date('2026-08-16T23:59:59Z'))).toBe('2026-08-15');
  });

  it('fechaImagenGibs_aPrincipioDeMes_retrocedeAlMesAnterior', () => {
    expect(fechaImagenGibs(new Date('2026-03-01T12:00:00Z'))).toBe('2026-02-28');
  });

  it('fechaImagenGibs_enAnioBisiesto_cuentaElVeintinueveDeFebrero', () => {
    expect(fechaImagenGibs(new Date('2024-03-01T12:00:00Z'))).toBe('2024-02-29');
  });

  it('fechaImagenGibs_conDiasAtras_retrocedeParaVerElAntes', () => {
    expect(fechaImagenGibs(new Date('2026-08-16T10:00:00Z'), 8)).toBe('2026-08-08');
  });

  it('fechaImagenGibs_conDiasAtrasNegativo_nuncaPideUnaFechaFutura', () => {
    // Una fecha futura devuelve 404 y deja el mapa vacío: no se permite.
    expect(fechaImagenGibs(new Date('2026-08-16T10:00:00Z'), -5)).toBe('2026-08-16');
  });

  it('fechaImagenGibs_conFechaInvalida_devuelveUnaFechaUsable', () => {
    expect(fechaImagenGibs(new Date('no es una fecha'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('textoFechaImagen', () => {
  it('textoFechaImagen_conFechaIso_devuelveDiaYMesEnEspanol', () => {
    expect(textoFechaImagen('2026-08-15')).toBe('15 de agosto');
  });

  it('textoFechaImagen_conTextoQueNoEsFecha_loDevuelveTalCual', () => {
    expect(textoFechaImagen('sin fecha')).toBe('sin fecha');
  });
});

describe('construirCapasBase', () => {
  const capas = construirCapasBase('2026-08-15');

  it('construirCapasBase_siempre_devuelveSateliteRelieveYCalles', () => {
    expect(capas.map((capa) => capa.clave)).toEqual(['satelite', 'relieve', 'calles']);
  });

  it('construirCapasBase_capaSatelital_limitaElZoomNativoAlQueSirveGibs', () => {
    const satelite = capas.find((capa) => capa.clave === 'satelite');

    // Del 10 en adelante GIBS responde 400; Leaflet debe reescalar, no pedirlas.
    expect(satelite?.maxNativeZoom).toBe(ZOOM_NATIVO_GIBS);
    expect(satelite!.maxZoom).toBeGreaterThan(ZOOM_NATIVO_GIBS);
  });

  it('construirCapasBase_todasLasCapas_llevanAtribucionYUsanHttps', () => {
    for (const capa of capas) {
      expect(capa.atribucion.length).toBeGreaterThan(0);
      expect(capa.plantillaUrl.startsWith('https://')).toBe(true);
    }
  });

  it('construirCapasBase_capaSatelital_atribuyeANasaGibs', () => {
    expect(capas.find((capa) => capa.clave === 'satelite')?.atribucion).toContain('GIBS');
  });

  it('construirCapasBase_capasDeOpenStreetMap_mantienenElCreditoObligatorio', () => {
    for (const clave of ['relieve', 'calles'] as const) {
      expect(capas.find((capa) => capa.clave === clave)?.atribucion).toContain('OpenStreetMap');
    }
  });

  it('construirCapasBase_ningunaCapa_llevaClaveNiFichaDeAcceso', () => {
    // Ninguna de las tres fuentes pide credencial. Si alguna vez hiciera falta
    // una, no puede acabar incrustada en la URL: el bundle es público.
    for (const capa of capas) {
      expect(capa.plantillaUrl).not.toMatch(/api[_-]?key|token|access[_-]?key/i);
    }
  });

  it('construirCapasBase_todasLasCapas_tienenSuEtiquetaTraducida', () => {
    const etiquetas = es.mapa.capas as Record<string, string>;

    for (const capa of capas) {
      const clave = capa.claveEtiqueta.replace('mapa.capas.', '');
      expect(etiquetas[clave]).toBeTruthy();
    }
  });
});

describe('capas por omisión', () => {
  it('capasPorOmision_mapaDeLectura_arrancaEnSatelite', () => {
    expect(CAPA_INICIAL_LECTURA).toBe('satelite');
  });

  it('capasPorOmision_mapaEditable_arrancaEnCallesParaNoTaparElPunto', () => {
    expect(CAPA_INICIAL_EDICION).toBe('calles');
  });

  it('capasPorOmision_respaldo_esUnaCapaQueNoDependeDeGibs', () => {
    expect(CAPA_DE_RESPALDO).not.toBe('satelite');
  });
});
