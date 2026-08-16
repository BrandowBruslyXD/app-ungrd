import { describe, it, expect } from 'vitest';
import i18n from '@/shared/i18n';
import {
  reporteEstrella,
  reporteRecienCreado,
  reporteSinTransparencia,
} from '@/shared/mocks/mockContrato';
import { aReporteLegado } from './reporteLegado';

const t = i18n.t;

describe('aReporteLegado', () => {
  it('convierte la cronología del contrato en la línea de tiempo del ciudadano', () => {
    const reporte = aReporteLegado(reporteEstrella, t);

    expect(reporte.timeline).toHaveLength(reporteEstrella.cronologia.length);
    expect(reporte.timeline[0].description).toBe('Reporte recibido');
    expect(reporte.timeline[3].title).toBe('En atención');
  });

  it('suma los contratos de prevención como gasto público', () => {
    expect(aReporteLegado(reporteEstrella, t).publicSpending).toBe(570000000);
  });

  it('deja el gasto público sin dato cuando no hay contratos, para ocultar el bloque', () => {
    expect(aReporteLegado(reporteSinTransparencia, t).publicSpending).toBeUndefined();
  });

  it('toma la fecha del último evento como última actualización', () => {
    expect(aReporteLegado(reporteEstrella, t).updatedAt).toBe('2026-08-15T15:30:00Z');
  });

  it('sin dirección usa el municipio como ubicación', () => {
    expect(aReporteLegado(reporteRecienCreado, t).location).toBe('Bogotá');
  });

  it('marca la verificación satelital solo cuando el satélite confirmó', () => {
    expect(aReporteLegado(reporteEstrella, t).satelliteVerified).toBe(true);
    expect(aReporteLegado(reporteRecienCreado, t).satelliteVerified).toBe(false);
  });

  it('genera identificadores distintos para cada evento de la cronología', () => {
    const identificadores = aReporteLegado(reporteEstrella, t).timeline.map((evento) => evento.id);
    expect(new Set(identificadores).size).toBe(identificadores.length);
  });
});
