import { describe, it, expect } from 'vitest';
import {
  agruparPorSector,
  armarCsvPaquete,
  componerCorreo,
  resumenCobertura,
  totalesPorMunicipio,
} from '@/lib/sectorial';
import { CATALOGO_SECTORES, FICHAS_SECTOR } from '@/lib/catalogoSectores';
import { mockCobertura, mockDanos, mockEnvios, mockEvento, mockPaquetes } from '@/mocks/mockSectorial';
import {
  CLASIFICADORES,
  ESTADOS_COBERTURA,
  ESTADOS_PAQUETE,
  MODOS_ENVIO,
  NIVELES_CONFIANZA,
  NIVELES_DANO,
  ORIGENES_DANO,
  SECTORES,
} from '@/types/sectorial';
import es from '@/locales/es.json';
import type {
  CoberturaMunicipio,
  DanoSectorizado,
  Evento,
  PaqueteMinisterio,
  Sector,
} from '@/types/sectorial';

/*
 * Estas funciones son las que sostienen las dos pantallas del reparto: lo que
 * calculan termina en un CSV y en un oficio dirigido a un ministerio. Un total
 * mal sumado no se ve mirando la pantalla, pero sí falla aquí.
 */

function dano(parcial: Partial<DanoSectorizado> = {}): DanoSectorizado {
  return {
    id: 'DS-000',
    eventoId: 'EVT-1',
    sector: 'Vivienda',
    origen: 'CargaEdan',
    origenId: 'EDAN-1',
    nivelConfianza: 'Verificado',
    municipio: 'Montería',
    departamento: 'Córdoba',
    descripcion: 'Viviendas averiadas',
    cantidad: 1,
    unidad: 'viviendas',
    clasificadoPor: 'Regla',
    registradoEn: '2026-08-14T15:00:00Z',
    ...parcial,
  };
}

function paquete(parcial: Partial<PaqueteMinisterio> = {}): PaqueteMinisterio {
  return {
    id: 'PQT-1',
    codigo: 'PQT-1',
    eventoId: 'EVT-1',
    sector: 'Vivienda',
    entidad: 'Ministerio de Vivienda, Ciudad y Territorio',
    correoDestino: 'vivienda@ejemplo.gov.co',
    totalDanos: 1,
    totalMunicipios: 1,
    costoEstimadoTotal: 1000,
    estado: 'Aprobado',
    ...parcial,
  };
}

function evento(parcial: Partial<Evento> = {}): Evento {
  return {
    id: 'EVT-1',
    codigo: 'EVT-1',
    nombre: 'Inundaciones de prueba',
    tipoEvento: 'inundacion',
    declaratoria: 'Desastre',
    nivelDeclaratoria: 'Departamental',
    numeroDecreto: 'Decreto Departamental 0642 de 2026',
    fechaDeclaratoria: '2026-08-12T15:00:00Z',
    fechaEvento: '2026-08-11T04:20:00Z',
    departamentos: ['Córdoba'],
    estado: 'Activo',
    personasAfectadas: 100,
    ...parcial,
  };
}

function cobertura(
  estado: CoberturaMunicipio['estado'],
  municipio: string,
): CoberturaMunicipio {
  return {
    municipio,
    departamento: 'Córdoba',
    estado,
    reportesRecibidos: estado === 'EnSilencio' ? 0 : 5,
    ultimoDatoEn: estado === 'EnSilencio' ? null : '2026-08-14T15:00:00Z',
  };
}

function resumenDe(sector: Sector, danos: readonly DanoSectorizado[]) {
  const resumen = agruparPorSector(danos).find((fila) => fila.sector === sector);
  if (resumen === undefined) throw new Error(`Sin resumen para ${sector}`);
  return resumen;
}

describe('agruparPorSector', () => {
  it('devuelveLosTreceSectores_sinDanos_todosEnCero', () => {
    const resumenes = agruparPorSector([]);

    expect(resumenes).toHaveLength(SECTORES.length);
    expect(resumenes.every((r) => r.totalDanos === 0 && r.costoEstimado === 0)).toBe(true);
  });

  it('devuelveElSectorSinDanos_cuandoOtrosSiTienen_paraQueLaFilaNoDesaparezca', () => {
    const resumenes = agruparPorSector([dano({ sector: 'Salud', costoEstimado: 500 })]);
    const deporte = resumenes.find((r) => r.sector === 'Deporte');

    expect(deporte?.totalDanos).toBe(0);
  });

  it('ignoraLosDanosSinSector_porqueNadieLosHaRevisado', () => {
    const resumenes = agruparPorSector([
      dano({ sector: null, costoEstimado: 900 }),
      dano({ sector: 'Vivienda', costoEstimado: 100 }),
    ]);

    expect(resumenes.reduce((suma, r) => suma + r.totalDanos, 0)).toBe(1);
    expect(resumenes.reduce((suma, r) => suma + r.costoEstimado, 0)).toBe(100);
  });

  it('cuentaCadaMunicipioUnaVez_conVariosDanosDelMismoSitio', () => {
    const resumen = resumenDe('Vivienda', [
      dano({ municipio: 'Montería' }),
      dano({ municipio: 'Montería' }),
      dano({ municipio: 'Cereté' }),
    ]);

    expect(resumen.totalDanos).toBe(3);
    expect(resumen.totalMunicipios).toBe(2);
  });

  it('separaMunicipiosHomonimos_cuandoEstanEnDepartamentosDistintos', () => {
    const resumen = resumenDe('Vivienda', [
      dano({ municipio: 'Sucre', departamento: 'Sucre' }),
      dano({ municipio: 'Sucre', departamento: 'Santander' }),
    ]);

    expect(resumen.totalMunicipios).toBe(2);
  });

  it('sumaCostoYPersonas_ignorandoLosDanosSinCifra', () => {
    const resumen = resumenDe('Vivienda', [
      dano({ costoEstimado: 1000, personasAfectadas: 10 }),
      dano({ costoEstimado: 500 }),
      dano({}),
    ]);

    expect(resumen.costoEstimado).toBe(1500);
    expect(resumen.personasAfectadas).toBe(10);
  });

  it('devuelveLaProporcionDeConfianza_noUnPromedio', () => {
    const resumen = resumenDe('Vivienda', [
      dano({ nivelConfianza: 'Verificado' }),
      dano({ nivelConfianza: 'Censado' }),
      dano({ nivelConfianza: 'Autorreportado' }),
      dano({ nivelConfianza: 'Autorreportado' }),
    ]);

    expect(resumen.confianza).toEqual({ Verificado: 1, Censado: 1, Autorreportado: 2 });
  });

  it('ordenaPorCostoDescendente_paraQueArribaEsteLoQueMasPesa', () => {
    const resumenes = agruparPorSector([
      dano({ sector: 'Salud', costoEstimado: 100 }),
      dano({ sector: 'Transporte', costoEstimado: 900 }),
      dano({ sector: 'Educacion', costoEstimado: 400 }),
    ]);

    expect(resumenes.slice(0, 3).map((r) => r.sector)).toEqual([
      'Transporte',
      'Educacion',
      'Salud',
    ]);
  });

  it('desempataPorElOrdenDelFormatoOficial_cuandoTodoEstaEnCero', () => {
    expect(agruparPorSector([]).map((r) => r.sector)).toEqual([...SECTORES]);
  });
});

describe('totalesPorMunicipio', () => {
  it('agrupaPorMunicipioYDepartamento_sumandoCostoYPersonas', () => {
    const totales = totalesPorMunicipio([
      dano({ municipio: 'Montería', costoEstimado: 1000, personasAfectadas: 20 }),
      dano({ municipio: 'Montería', costoEstimado: 500 }),
      dano({ municipio: 'Cereté', costoEstimado: 300, personasAfectadas: 5 }),
    ]);

    expect(totales).toHaveLength(2);
    expect(totales[0]).toMatchObject({
      municipio: 'Montería',
      totalDanos: 2,
      costoEstimado: 1500,
      personasAfectadas: 20,
    });
  });

  it('noMezclaMunicipiosHomonimos_deDepartamentosDistintos', () => {
    const totales = totalesPorMunicipio([
      dano({ municipio: 'Sucre', departamento: 'Sucre', costoEstimado: 100 }),
      dano({ municipio: 'Sucre', departamento: 'Santander', costoEstimado: 200 }),
    ]);

    expect(totales).toHaveLength(2);
    expect(totales.map((m) => m.departamento)).toEqual(['Santander', 'Sucre']);
  });

  it('cuentaLosDanosSinSector_porqueTambienSonDelEvento', () => {
    const totales = totalesPorMunicipio([dano({ sector: null, municipio: 'Ayapel' })]);

    expect(totales).toHaveLength(1);
    expect(totales[0].totalDanos).toBe(1);
  });

  it('ordenaAlfabeticamenteEnEspanol_cuandoElCostoEmpata', () => {
    const totales = totalesPorMunicipio([
      dano({ municipio: 'Ñuño' }),
      dano({ municipio: 'Ayapel' }),
      dano({ municipio: 'Montería' }),
    ]);

    expect(totales.map((m) => m.municipio)).toEqual(['Ayapel', 'Montería', 'Ñuño']);
  });
});

describe('resumenCobertura', () => {
  it('cuentaLosTresEstados_ySumaLosQueTienenAlgunDato', () => {
    const resumen = resumenCobertura([
      cobertura('ConEdan', 'Montería'),
      cobertura('SoloAutorreportes', 'Ayapel'),
      cobertura('SoloAutorreportes', 'Caimito'),
      cobertura('EnSilencio', 'Momil'),
      cobertura('EnSilencio', 'Chimá'),
      cobertura('EnSilencio', 'Cotorra'),
    ]);

    expect(resumen).toEqual({
      totalMunicipios: 6,
      conEdan: 1,
      soloAutorreportes: 2,
      enSilencio: 3,
      conInformacion: 3,
    });
  });

  it('devuelveCeros_sinMunicipiosAfectados', () => {
    expect(resumenCobertura([]).totalMunicipios).toBe(0);
  });
});

describe('armarCsvPaquete', () => {
  const soloVivienda = paquete({ sector: 'Vivienda' });

  it('empiezaConBom_paraQueExcelEnEspanolNoRompaLasTildes', () => {
    const csv = armarCsvPaquete(soloVivienda, [dano({ municipio: 'Ciénaga de Oro' })]);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Ciénaga de Oro');
  });

  it('usaPuntoYComaComoSeparador_yUnaFilaPorDano', () => {
    const csv = armarCsvPaquete(soloVivienda, [dano(), dano({ id: 'DS-002' })]);
    const lineas = csv.trimEnd().split('\r\n');

    expect(lineas).toHaveLength(3);
    expect(lineas[0].split(';')[0]).toBe('\uFEFFSector');
  });

  it('excluyeLosDanosDeOtroSector_paraNoMandarleAlMinisterioLoQueNoLeToca', () => {
    const csv = armarCsvPaquete(soloVivienda, [
      dano({ descripcion: 'Viviendas del barrio' }),
      dano({ sector: 'Salud', descripcion: 'Centro de salud anegado' }),
      dano({ sector: null, descripcion: 'Reporte sin clasificar' }),
    ]);

    expect(csv).toContain('Viviendas del barrio');
    expect(csv).not.toContain('Centro de salud anegado');
    expect(csv).not.toContain('Reporte sin clasificar');
  });

  it('excluyeLosDanosDeOtroEvento_aunqueSeanDelMismoSector', () => {
    const csv = armarCsvPaquete(soloVivienda, [
      dano({ eventoId: 'EVT-9', descripcion: 'Daño de otra emergencia' }),
    ]);

    expect(csv.trimEnd().split('\r\n')).toHaveLength(1);
  });

  it('entrecomillaLaDescripcion_cuandoTraePuntoYComa', () => {
    const csv = armarCsvPaquete(soloVivienda, [
      dano({ descripcion: 'Techos caídos; muros agrietados' }),
    ]);

    expect(csv).toContain('"Techos caídos; muros agrietados"');
    expect(csv.trimEnd().split('\r\n')).toHaveLength(2);
  });

  it('duplicaLasComillasInternas_paraNoPartirElCampo', () => {
    const csv = armarCsvPaquete(soloVivienda, [dano({ descripcion: 'Barrio "La Granja"' })]);

    expect(csv).toContain('"Barrio ""La Granja"""');
  });

  it('dejaVaciasLasCasillasSinDato_enVezDeEscribirUndefined', () => {
    const csv = armarCsvPaquete(soloVivienda, [dano({ costoEstimado: undefined })]);

    expect(csv).not.toContain('undefined');
  });

  it('escribeLasCoordenadas_cuandoElDanoLasTrae', () => {
    const csv = armarCsvPaquete(soloVivienda, [
      dano({ coordenadas: { lat: 8.7479, lng: -75.8814 } }),
    ]);

    expect(csv).toContain('8.7479;-75.8814');
  });
});

describe('componerCorreo', () => {
  it('mandaAlCorreoDelPaquete_yNombraSectorYCodigoEnElAsunto', () => {
    const correo = componerCorreo(paquete({ codigo: 'PQT-7' }), evento());

    expect(correo.destinatario).toBe('vivienda@ejemplo.gov.co');
    expect(correo.asunto).toContain('Vivienda');
    expect(correo.asunto).toContain('PQT-7');
  });

  it('citaElDecretoQueAmparaElEnvio_cuandoHayDeclaratoria', () => {
    const correo = componerCorreo(paquete(), evento());

    expect(correo.cuerpo).toContain('Decreto Departamental 0642 de 2026');
    expect(correo.cuerpo).toContain('2026-08-12');
  });

  it('loDiceExplicitamente_cuandoNoHayDeclaratoriaQueCitar', () => {
    const correo = componerCorreo(
      paquete(),
      evento({ declaratoria: 'Ninguna', numeroDecreto: undefined, fechaDeclaratoria: undefined }),
    );

    expect(correo.cuerpo).toContain('Sin declaratoria vigente');
  });

  it('adviertaQueLosAutorreportesNoEstanVerificados', () => {
    const correo = componerCorreo(paquete(), evento());

    expect(correo.cuerpo).toContain('Autorreportado');
    expect(correo.cuerpo).toContain('no han sido');
  });
});

describe('catálogo de sectores', () => {
  it('losTreceSectoresTienenEntidadIconoYCorreo', () => {
    expect(FICHAS_SECTOR).toHaveLength(SECTORES.length);

    const incompletos = FICHAS_SECTOR.filter(
      (ficha) => ficha.entidad.length === 0 || ficha.correo.length === 0,
    );

    expect(incompletos.map((f) => f.sector)).toEqual([]);
  });

  it('ningunCorreoApuntaAUnDominioReal_soloEjemploGovCo', () => {
    const sospechosos = FICHAS_SECTOR.filter((ficha) => !ficha.correo.endsWith('@ejemplo.gov.co'));

    expect(sospechosos.map((f) => f.correo)).toEqual([]);
  });

  it('cadaFichaApuntaASuPropioSector', () => {
    const cruzadas = SECTORES.filter((sector) => CATALOGO_SECTORES[sector].sector !== sector);

    expect(cruzadas).toEqual([]);
  });
});

/*
 * Sin etiqueta, la pantalla escribe la clave cruda —«AguaYSaneamiento»— delante
 * de un funcionario. No lo detecta el compilador ni se ve al probar la pantalla
 * si el dato de demo no llega a esa fila, así que se recorre la lista entera.
 */
describe('etiquetas en español de los enumerados del reparto', () => {
  const grupos: readonly { clave: keyof typeof es.ungrd; valores: readonly string[] }[] = [
    { clave: 'sectores', valores: SECTORES },
    { clave: 'confianza', valores: NIVELES_CONFIANZA },
    { clave: 'origen', valores: ORIGENES_DANO },
    { clave: 'estadoPaquete', valores: ESTADOS_PAQUETE },
    { clave: 'cobertura', valores: ESTADOS_COBERTURA },
    { clave: 'nivelDano', valores: NIVELES_DANO },
    { clave: 'clasificadoPor', valores: CLASIFICADORES },
    { clave: 'modoEnvio', valores: MODOS_ENVIO },
  ];

  it.each(grupos)('cadaValorDe$clave tiene etiqueta en locales/es.json', ({ clave, valores }) => {
    const etiquetas: Record<string, string> = es.ungrd[clave];
    const faltantes = valores.filter((valor) => etiquetas[valor] === undefined);
    const sobrantes = Object.keys(etiquetas).filter((etiqueta) => !valores.includes(etiqueta));

    expect(faltantes, `sin etiqueta: ${faltantes.join(', ')}`).toEqual([]);
    expect(sobrantes, `etiquetas huérfanas: ${sobrantes.join(', ')}`).toEqual([]);
  });

  it('cadaSectorDelCatalogoApuntaAUnaClaveQueExiste', () => {
    const rotas = FICHAS_SECTOR.filter(
      (ficha) => ficha.claveNombre !== `ungrd.sectores.${ficha.sector}`,
    );

    expect(rotas.map((f) => f.sector)).toEqual([]);
  });
});

/*
 * Los datos sembrados no son adorno: son lo único que va a ver el jurado. Si
 * pierden coherencia —un municipio «en silencio» con daños, un dato verificado
 * en un municipio que nadie visitó— el panel muestra exactamente la mentira que
 * viene a denunciar.
 */
describe('datos sembrados del reparto sectorial', () => {
  const conDatos = new Map(mockCobertura.map((m) => [`${m.departamento}|${m.municipio}`, m]));

  it('tieneEntreCuarentaYSesentaDanosSectorizados', () => {
    const sectorizados = mockDanos.filter((d) => d.sector !== null);

    expect(sectorizados.length).toBeGreaterThanOrEqual(40);
    expect(sectorizados.length).toBeLessThanOrEqual(60);
  });

  it('dejaAlMenosUnSectorSinDanos_porqueEsoTambienEsInformacion', () => {
    const enCero = agruparPorSector(mockDanos).filter((r) => r.totalDanos === 0);

    expect(enCero.length).toBeGreaterThanOrEqual(1);
  });

  it('usaLosTresNivelesDeConfianzaYLosTresOrigenes', () => {
    expect(new Set(mockDanos.map((d) => d.nivelConfianza)).size).toBe(3);
    expect(new Set(mockDanos.map((d) => d.origen)).size).toBe(3);
  });

  it('dejaEntreCuatroYOchoDanosSinSector_paraLaBandeja', () => {
    const sinSector = mockDanos.filter((d) => d.sector === null);

    expect(sinSector.length).toBeGreaterThanOrEqual(4);
    expect(sinSector.length).toBeLessThanOrEqual(8);
    expect(sinSector.every((d) => d.origen === 'ReporteCiudadano')).toBe(true);
    expect(sinSector.every((d) => (d.sectoresSugeridos ?? []).length >= 2)).toBe(true);
  });

  it('tieneMasMunicipiosEnSilencioQueConEdan_queEsElProblemaAMostrar', () => {
    const resumen = resumenCobertura(mockCobertura);

    expect(resumen.enSilencio).toBeGreaterThan(resumen.conEdan);
  });

  it('ningunMunicipioEnSilencioAportaDanos', () => {
    const contradictorios = mockDanos.filter(
      (d) => conDatos.get(`${d.departamento}|${d.municipio}`)?.estado === 'EnSilencio',
    );

    expect(contradictorios.map((d) => d.municipio)).toEqual([]);
  });

  it('todoDanoOcurreEnUnMunicipioDeLaCobertura', () => {
    const huerfanos = mockDanos.filter(
      (d) => !conDatos.has(`${d.departamento}|${d.municipio}`),
    );

    expect(huerfanos.map((d) => d.id)).toEqual([]);
  });

  it('losMunicipiosSoloConAutorreportesNoTienenDatosVerificados', () => {
    const contradictorios = mockDanos.filter(
      (d) =>
        conDatos.get(`${d.departamento}|${d.municipio}`)?.estado === 'SoloAutorreportes' &&
        d.nivelConfianza !== 'Autorreportado',
    );

    expect(contradictorios.map((d) => d.id)).toEqual([]);
  });

  it('losTotalesDelPaqueteCoincidenConElDetalle', () => {
    const resumenes = new Map(agruparPorSector(mockDanos).map((r) => [r.sector, r]));

    const descuadrados = mockPaquetes.filter((p) => {
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
    const sinFirma = mockPaquetes.filter(
      (p) => (p.estado === 'Aprobado' || p.estado === 'Enviado') && p.aprobadoPor === undefined,
    );
    const firmadosDeMas = mockPaquetes.filter(
      (p) => p.estado !== 'Aprobado' && p.estado !== 'Enviado' && p.aprobadoPor !== undefined,
    );

    expect(sinFirma.map((p) => p.sector)).toEqual([]);
    expect(firmadosDeMas.map((p) => p.sector)).toEqual([]);
  });

  it('laBitacoraNaceConEnviosYTodosEstanMarcadosComoSimulados', () => {
    expect(mockEnvios.length).toBeGreaterThanOrEqual(2);
    expect(mockEnvios.every((envio) => envio.modo === 'Simulado')).toBe(true);
  });

  it('cadaEnvioApuntaAUnPaqueteMarcadoComoEnviado', () => {
    const inconsistentes = mockEnvios.filter((envio) => {
      const suPaquete = mockPaquetes.find((p) => p.id === envio.paqueteId);
      return suPaquete === undefined || suPaquete.estado !== 'Enviado';
    });

    expect(inconsistentes.map((e) => e.id)).toEqual([]);
  });

  it('elCuerpoRegistradoEsElQueComponeElSistema', () => {
    const primero = mockEnvios[0];
    const suPaquete = mockPaquetes.find((p) => p.id === primero.paqueteId);
    if (suPaquete === undefined) throw new Error('Envío sembrado sin paquete');

    expect(primero.cuerpo).toBe(componerCorreo(suPaquete, mockEvento).cuerpo);
  });

  it('elCsvDeUnPaqueteEnviadoTraeSoloDanosDeSuSector', () => {
    const enviado = mockPaquetes.find((p) => p.estado === 'Enviado');
    if (enviado === undefined) throw new Error('No hay paquete enviado sembrado');

    const csv = armarCsvPaquete(enviado, mockDanos);
    const filas = csv.trimEnd().split('\r\n').slice(1);

    expect(filas).toHaveLength(enviado.totalDanos);
    expect(filas.every((fila) => fila.startsWith(`${enviado.sector};`))).toBe(true);
  });
});
