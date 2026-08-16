import { describe, expect, it } from 'vitest';
import { agruparPorSector, componerCorreo, resumenCobertura } from '@/lib/sectorial';
import {
  coberturaDelEvento,
  danosDelEvento,
  danosSinSectorDelEvento,
  enviosDelEvento,
  eventoPorCodigo,
  mockCobertura,
  mockDanos,
  mockEnvios,
  mockEvento,
  mockEventos,
  mockPaquetes,
  paquetePorSector,
  paquetesDelEvento,
} from '@/mocks/mockSectorial';
import { SECTORES } from '@/types/sectorial';
import type { Evento } from '@/types/sectorial';

/*
 * Los cuatro desastres sembrados son lo único que va a ver el jurado, y cada
 * uno existe para enseñar una situación distinta. Lo que se prueba aquí no es
 * que los datos «estén»: es que no se contradigan. Un municipio en silencio con
 * daños, o un paquete cuyo encabezado no cuadra con su detalle, convierten la
 * demo en la mentira que el módulo viene a denunciar, y eso no se ve mirando la
 * pantalla.
 */

/** Clave territorial: en Colombia hay municipios homónimos en departamentos distintos. */
function clave(departamento: string, municipio: string): string {
  return `${departamento}|${municipio}`;
}

function porCodigo(codigo: string): Evento {
  const evento = eventoPorCodigo(codigo);
  if (evento === undefined) throw new Error(`No hay evento sembrado con código ${codigo}`);
  return evento;
}

describe('catálogo de desastres sembrados', () => {
  it('siembraCuatroEventos_paraQueLaListaTengaSentido', () => {
    expect(mockEventos.length).toBe(4);
  });

  it('noRepiteIdentificadoresNiCodigos', () => {
    expect(new Set(mockEventos.map((e) => e.id)).size).toBe(mockEventos.length);
    expect(new Set(mockEventos.map((e) => e.codigo)).size).toBe(mockEventos.length);
  });

  it('cadaEventoTraeUnaSituacionDistinta_noCuatroCopias', () => {
    expect(new Set(mockEventos.map((e) => e.tipoEvento)).size).toBe(4);
    expect(new Set(mockEventos.map((e) => e.departamentos.join(', '))).size).toBe(4);
    expect(new Set(mockEventos.map((e) => e.declaratoria)).size).toBeGreaterThanOrEqual(3);
  });

  it('elPrimeroSigueSiendoElBajoSanJorge_delQueDependenLasPantallas', () => {
    expect(mockEvento.codigo).toBe('EVT-2026-08-15-003');
    expect(mockEvento.nombre).toContain('bajo San Jorge');
    expect(mockDanos).toEqual(danosDelEvento(mockEvento.id));
    expect(mockCobertura).toEqual(coberturaDelEvento(mockEvento.id));
    expect(mockPaquetes).toEqual(paquetesDelEvento(mockEvento.id));
    expect(mockEnvios).toEqual(enviosDelEvento(mockEvento.id));
  });

  it('elUltimoDatoDelEventoEsElMasRecienteDeSuCobertura', () => {
    for (const evento of mockEventos) {
      const fechas = coberturaDelEvento(evento.id)
        .map((municipio) => municipio.ultimoDatoEn)
        .filter((fecha): fecha is string => fecha !== null)
        .sort();

      const masReciente = fechas.length === 0 ? null : fechas[fechas.length - 1];

      expect(evento.ultimoDatoEn, evento.codigo).toBe(masReciente);
    }
  });

  it('devuelveNadaParaUnCodigoQueNoExiste_porqueVieneDeLaUrl', () => {
    expect(eventoPorCodigo('EVT-INVENTADO')).toBeUndefined();
    expect(danosDelEvento('EVT-INVENTADO')).toEqual([]);
    expect(coberturaDelEvento('EVT-INVENTADO')).toEqual([]);
    expect(paquetesDelEvento('EVT-INVENTADO')).toEqual([]);
    expect(enviosDelEvento('EVT-INVENTADO')).toEqual([]);
    expect(paquetePorSector('Vivienda', 'EVT-INVENTADO')).toBeUndefined();
  });

  it('paquetePorSectorSinEvento_respondePorElPrimerDesastre', () => {
    expect(paquetePorSector('Vivienda')?.eventoId).toBe(mockEvento.id);
  });
});

/*
 * Estas cuatro reglas valen para los cuatro eventos y son las que sostienen el
 * subpanel de cobertura, que es lo único que ningún otro sistema muestra.
 */
describe.each(mockEventos.map((evento) => [evento.codigo, evento.nombre] as const))(
  'coherencia del desastre %s',
  (codigo) => {
    const evento = porCodigo(codigo);
    const cobertura = coberturaDelEvento(evento.id);
    const danos = danosDelEvento(evento.id);
    const paquetes = paquetesDelEvento(evento.id);
    const envios = enviosDelEvento(evento.id);
    const territorio = new Map(
      cobertura.map((municipio) => [clave(municipio.departamento, municipio.municipio), municipio]),
    );

    it('todoDanoOcurreEnUnMunicipioDeSuPropiaCobertura', () => {
      const huerfanos = danos.filter((d) => !territorio.has(clave(d.departamento, d.municipio)));

      expect(huerfanos.map((d) => `${d.id} ${d.municipio}`)).toEqual([]);
    });

    it('ningunMunicipioEnSilencioAportaDanos', () => {
      const contradictorios = danos.filter(
        (d) => territorio.get(clave(d.departamento, d.municipio))?.estado === 'EnSilencio',
      );

      expect(contradictorios.map((d) => `${d.id} ${d.municipio}`)).toEqual([]);
    });

    it('losMunicipiosSoloConAutorreportesNoTienenDatosVerificadosNiCensados', () => {
      const contradictorios = danos.filter(
        (d) =>
          territorio.get(clave(d.departamento, d.municipio))?.estado === 'SoloAutorreportes' &&
          d.nivelConfianza !== 'Autorreportado',
      );

      expect(contradictorios.map((d) => `${d.id} ${d.nivelConfianza}`)).toEqual([]);
    });

    it('unMunicipioEnSilencioNoTieneNiReportesNiFecha', () => {
      const incoherentes = cobertura.filter(
        (m) => m.estado === 'EnSilencio' && (m.reportesRecibidos > 0 || m.ultimoDatoEn !== null),
      );

      expect(incoherentes.map((m) => m.municipio)).toEqual([]);
    });

    it('todoDanoPerteneceASuEventoYNoARepiteIdentificador', () => {
      expect(danos.every((d) => d.eventoId === evento.id)).toBe(true);
      expect(new Set(danos.map((d) => d.id)).size).toBe(danos.length);
    });

    it('losDanosSinSectorLlevanAlMenosDosSugerencias_paraQueLaBandejaSirva', () => {
      const sinSector = danosSinSectorDelEvento(evento.id);

      expect(sinSector.length).toBeGreaterThanOrEqual(2);
      expect(sinSector.every((d) => d.origen === 'ReporteCiudadano')).toBe(true);
      expect(sinSector.every((d) => (d.sectoresSugeridos ?? []).length >= 2)).toBe(true);
    });

    it('armaLosTrecePaquetes_incluidosLosQueVanEnCero', () => {
      expect(paquetes.map((p) => p.sector)).toEqual([...SECTORES]);
      expect(paquetes.every((p) => p.eventoId === evento.id)).toBe(true);
    });

    it('losTotalesDelPaqueteSalenDeAgruparPorSector_noEscritosAMano', () => {
      const resumenes = new Map(agruparPorSector(danos).map((r) => [r.sector, r]));

      const descuadrados = paquetes.filter((p) => {
        const resumen = resumenes.get(p.sector);
        return (
          p.totalDanos !== resumen?.totalDanos ||
          p.costoEstimadoTotal !== resumen?.costoEstimado ||
          p.totalMunicipios !== resumen?.totalMunicipios
        );
      });

      expect(descuadrados.map((p) => p.sector)).toEqual([]);
    });

    it('soloLosPaquetesAprobadosOEnviadosLlevanFirma', () => {
      const firmado = (estado: string) => estado === 'Aprobado' || estado === 'Enviado';
      const sinFirma = paquetes.filter((p) => firmado(p.estado) && p.aprobadoPor === undefined);
      const firmadosDeMas = paquetes.filter(
        (p) => !firmado(p.estado) && p.aprobadoPor !== undefined,
      );

      expect(sinFirma.map((p) => p.sector)).toEqual([]);
      expect(firmadosDeMas.map((p) => p.sector)).toEqual([]);
    });

    it('ningunPaqueteSinDanosFiguraComoRemitido', () => {
      const vacios = paquetes.filter((p) => p.totalDanos === 0 && p.estado === 'Enviado');

      expect(vacios.map((p) => p.sector)).toEqual([]);
    });

    it('cadaEnvioApuntaAUnPaqueteRemitidoYQuedaMarcadoComoSimulado', () => {
      const rotos = envios.filter((envio) => {
        const suPaquete = paquetes.find((p) => p.id === envio.paqueteId);
        return suPaquete === undefined || suPaquete.estado !== 'Enviado';
      });

      expect(rotos.map((e) => e.id)).toEqual([]);
      expect(envios.every((e) => e.modo === 'Simulado')).toBe(true);
    });

    it('elCuerpoRegistradoEsElQueComponeElSistema', () => {
      const distintos = envios.filter((envio) => {
        const suPaquete = paquetes.find((p) => p.id === envio.paqueteId);
        return suPaquete === undefined || envio.cuerpo !== componerCorreo(suPaquete, evento).cuerpo;
      });

      expect(distintos.map((e) => e.id)).toEqual([]);
    });

    it('sinDeclaratoriaNoHayDecretoNiEnvios_porqueNadaLosAmpara', () => {
      if (evento.declaratoria !== 'Ninguna') return;

      expect(evento.numeroDecreto).toBeUndefined();
      expect(evento.fechaDeclaratoria).toBeUndefined();
      expect(envios).toEqual([]);
      expect(paquetes.filter((p) => p.estado === 'Enviado')).toEqual([]);
    });
  },
);

describe('las cuatro situaciones que la lista tiene que dejar ver', () => {
  it('elBajoSanJorge_esElCasoCompletoConBitacora', () => {
    const evento = porCodigo('EVT-2026-08-15-003');
    const resumen = resumenCobertura(coberturaDelEvento(evento.id));

    expect(evento.declaratoria).toBe('Desastre');
    expect(evento.nivelDeclaratoria).toBe('Departamental');
    expect(resumen.enSilencio).toBeGreaterThan(resumen.conEdan);
    expect(enviosDelEvento(evento.id).length).toBeGreaterThanOrEqual(3);
  });

  it('elSismoRecienDeclarado_ensenaElVacio_ySinNingunEnvio', () => {
    const evento = porCodigo('EVT-2026-08-14-007');
    const danos = danosDelEvento(evento.id);
    const resumen = resumenCobertura(coberturaDelEvento(evento.id));
    const autorreportados = danos.filter((d) => d.nivelConfianza === 'Autorreportado');

    expect(resumen.enSilencio).toBeGreaterThan(resumen.conInformacion);
    expect(autorreportados.length).toBeGreaterThan(danos.length / 2);
    expect(enviosDelEvento(evento.id)).toEqual([]);
    expect(paquetesDelEvento(evento.id).every((p) => p.estado === 'Borrador')).toBe(true);
  });

  it('elIncendioMaduro_tieneCoberturaAltaYLaMayoriaDeLosPaquetesRemitidos', () => {
    const evento = porCodigo('EVT-2026-06-19-001');
    const paquetes = paquetesDelEvento(evento.id);
    const resumen = resumenCobertura(coberturaDelEvento(evento.id));
    const enviados = paquetes.filter((p) => p.estado === 'Enviado');

    expect(evento.declaratoria).toBe('CalamidadPublica');
    expect(evento.nivelDeclaratoria).toBe('Municipal');
    expect(resumen.conEdan).toBeGreaterThan(resumen.enSilencio);
    expect(enviados.length).toBeGreaterThan(paquetes.length / 2);
    expect(enviosDelEvento(evento.id)).toHaveLength(enviados.length);
  });

  it('losDeslizamientos_tienenDanosPeroNingunaDeclaratoria', () => {
    const evento = porCodigo('EVT-2026-08-11-004');

    expect(evento.declaratoria).toBe('Ninguna');
    expect(evento.nivelDeclaratoria).toBeUndefined();
    expect(danosDelEvento(evento.id).length).toBeGreaterThan(0);
  });
});
