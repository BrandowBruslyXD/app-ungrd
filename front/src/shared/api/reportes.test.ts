import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cambiarEstadoReporte,
  crearReporte,
  getReporte,
  LATENCIA_MOCK_MS,
  listAlertas,
  listAyudas,
  listarMisReportes,
  listarReportes,
  listMisReportes,
  listReportes,
  obtenerReporte,
  obtenerResumenEstadisticas,
} from './reportes';
import { ErrorApi } from './client';
import { MUNICIPIO_SIN_DATOS, reporteEstrella } from '@/shared/mocks/mockContrato';

/** Resuelve una promesa de la capa de datos saltando la latencia simulada. */
async function sinEsperar<T>(promesa: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(LATENCIA_MOCK_MS);
  return promesa;
}

describe('api/reportes (contrato)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no resuelve el listado antes de la latencia simulada', async () => {
    let resuelto = false;
    const promesa = listarReportes().then((reportes) => {
      resuelto = true;
      return reportes;
    });

    await vi.advanceTimersByTimeAsync(LATENCIA_MOCK_MS - 1);
    expect(resuelto).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await promesa;
    expect(resuelto).toBe(true);
  });

  it('lista reportes con la forma del contrato', async () => {
    const reportes = await sinEsperar(listarReportes());

    expect(reportes.length).toBeGreaterThan(0);
    expect(reportes[0]?.codigo).toMatch(/^RPT-/);
  });

  it('devuelve lista vacia cuando el filtro no encuentra nada', async () => {
    const reportes = await sinEsperar(listarReportes({ municipio: MUNICIPIO_SIN_DATOS }));

    expect(reportes).toEqual([]);
  });

  it('respeta el limite de resultados', async () => {
    const reportes = await sinEsperar(listarReportes({ limite: 1 }));

    expect(reportes).toHaveLength(1);
  });

  it('lista los reportes del ciudadano autenticado', async () => {
    const mios = await sinEsperar(listarMisReportes());

    expect(mios.length).toBeGreaterThan(0);
  });

  it('devuelve el detalle completo cuando el codigo existe', async () => {
    const detalle = await sinEsperar(obtenerReporte(reporteEstrella.codigo));

    expect(detalle.codigo).toBe(reporteEstrella.codigo);
    expect(detalle.cronologia.length).toBeGreaterThan(0);
    expect(detalle.verificacionSatelital).not.toBeNull();
  });

  it('falla con estado 404 cuando el codigo no existe', async () => {
    const fallo = obtenerReporte('RPT-NO-EXISTE').catch((causa: unknown) => causa);
    await vi.advanceTimersByTimeAsync(LATENCIA_MOCK_MS);

    const capturado = await fallo;
    expect(capturado).toBeInstanceOf(ErrorApi);
    expect((capturado as ErrorApi).estado).toBe(404);
  });

  it('devuelve estadisticas del municipio con datos', async () => {
    const resumen = await sinEsperar(obtenerResumenEstadisticas());

    expect(resumen.totalHoy).toBe(47);
    expect(resumen.porcentajeAtendidos).toBe(74);
  });

  it('devuelve estadisticas en ceros cuando el municipio no tiene datos', async () => {
    const resumen = await sinEsperar(
      obtenerResumenEstadisticas({ municipio: MUNICIPIO_SIN_DATOS }),
    );

    expect(resumen.totalHoy).toBe(0);
    expect(Object.values(resumen.porTipo).every((conteo) => conteo === 0)).toBe(true);
  });

  it('crea un reporte y devuelve su codigo de seguimiento', async () => {
    const creado = await sinEsperar(
      crearReporte({
        tipo: 'Inundacion',
        descripcion: 'Se está inundando la vía principal, el agua ya llega a las casas',
        latitud: 4.710989,
        longitud: -74.072092,
        municipio: 'Bogotá',
      }),
    );

    expect(creado.codigo).toMatch(/^RPT-/);
    expect(creado.estado).toBe('Reportado');
  });

  it('confirma el cambio de estado del reporte', async () => {
    const actualizado = await sinEsperar(
      cambiarEstadoReporte(reporteEstrella.codigo, {
        estado: 'Atendido',
        nota: 'Brigada terminó la atención',
      }),
    );

    expect(actualizado.estado).toBe('Atendido');
    expect(actualizado.codigo).toBe(reporteEstrella.codigo);
  });
});

describe('api/reportes (funciones antiguas en uso por las pantallas)', () => {
  it('lista reportes con identificador', () => {
    const reports = listReportes();
    expect(reports.length).toBeGreaterThan(0);
    expect(reports[0]?.id).toMatch(/^CR-/);
  });

  it('devuelve el reporte cuando el id existe', () => {
    const first = listReportes()[0];
    expect(first).toBeDefined();
    expect(getReporte(first.id)?.id).toBe(first.id);
  });

  it('devuelve undefined cuando el id no existe', () => {
    expect(getReporte('NO-EXISTE')).toBeUndefined();
  });

  it('lista los reportes del ciudadano', () => {
    expect(listMisReportes().length).toBe(listReportes().length);
  });

  it('lista alertas y ayudas mockeadas', () => {
    expect(listAlertas().length).toBeGreaterThan(0);
    expect(listAyudas().length).toBeGreaterThan(0);
  });
});
