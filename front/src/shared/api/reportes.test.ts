import { describe, expect, it } from 'vitest';
import { getReporte, listAlertas, listAyudas, listMisReportes, listReportes } from './reportes';

describe('api/reportes', () => {
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
