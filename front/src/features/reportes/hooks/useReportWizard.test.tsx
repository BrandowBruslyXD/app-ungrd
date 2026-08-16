import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  canProceed,
  INITIAL_REPORT_FORM,
  useReportWizard,
} from './useReportWizard';
import type { ReporteGuardado } from './useReportWizard';
import { limpiarRegistros, listarRegistros } from '@/lib/almacenamiento';

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={['/reportar']}>{children}</MemoryRouter>;
}

// El hook ahora persiste de verdad. Sin limpiar entre pruebas, el consecutivo
// del código y el conteo de registros se arrastran de una prueba a la siguiente.
beforeEach(() => {
  limpiarRegistros();
});

describe('canProceed', () => {
  it('no permite avanzar sin tipo de reporte en el paso 0', () => {
    expect(
      canProceed({
        step: 0,
        reportType: null,
        form: INITIAL_REPORT_FORM,
        disclaimerAccepted: false,
      }),
    ).toBe(false);
  });

  it('permite avanzar cuando hay tipo de reporte en el paso 0', () => {
    expect(
      canProceed({
        step: 0,
        reportType: 'testigo',
        form: INITIAL_REPORT_FORM,
        disclaimerAccepted: false,
      }),
    ).toBe(true);
  });

  it('exige descripción de 10 caracteres para un afectado en el paso 2', () => {
    expect(
      canProceed({
        step: 2,
        reportType: 'afectado',
        form: { ...INITIAL_REPORT_FORM, description: 'corto' },
        disclaimerAccepted: false,
      }),
    ).toBe(false);

    expect(
      canProceed({
        step: 2,
        reportType: 'afectado',
        form: { ...INITIAL_REPORT_FORM, description: 'Hay daños graves en la vivienda' },
        disclaimerAccepted: false,
      }),
    ).toBe(true);
  });

  it('exige gravedad para un testigo en el paso 2', () => {
    expect(
      canProceed({
        step: 2,
        reportType: 'testigo',
        form: INITIAL_REPORT_FORM,
        disclaimerAccepted: false,
      }),
    ).toBe(false);

    expect(
      canProceed({
        step: 2,
        reportType: 'testigo',
        form: { ...INITIAL_REPORT_FORM, severity: 'grave' },
        disclaimerAccepted: false,
      }),
    ).toBe(true);
  });
});

describe('useReportWizard', () => {
  it('no permite avanzar al inicio', () => {
    const { result } = renderHook(() => useReportWizard(), { wrapper });
    expect(result.current.canProceed).toBe(false);
    expect(result.current.submitted).toBe(false);
  });

  it('permite avanzar cuando se elige el tipo de reporte', () => {
    const { result } = renderHook(() => useReportWizard(), { wrapper });
    act(() => {
      result.current.setReportType('testigo');
    });
    expect(result.current.canProceed).toBe(true);
  });

  it('genera un código de seguimiento con el formato del contrato al enviar', () => {
    const { result } = renderHook(() => useReportWizard(), { wrapper });
    act(() => {
      result.current.setReportType('testigo');
    });
    act(() => {
      result.current.handleSubmit();
    });
    expect(result.current.submitted).toBe(true);
    // RPT-AAAA-MM-DD-NNNN-XXXX, el mismo formato que dicta el agente telefónico.
    expect(result.current.reportId).toMatch(/^RPT-\d{4}-\d{2}-\d{2}-\d{4}-[A-Z0-9]{4}$/);
  });

  it('persiste el reporte para que el código consulte algo real', () => {
    const { result } = renderHook(() => useReportWizard(), { wrapper });
    act(() => {
      result.current.setReportType('afectado');
    });
    act(() => {
      result.current.handleSubmit();
    });

    const guardados = listarRegistros<ReporteGuardado>('reporte');
    expect(guardados).toHaveLength(1);
    expect(guardados[0].codigo).toBe(result.current.reportId);
    expect(guardados[0].datos.reportType).toBe('afectado');
  });

  it('no vuelve a guardar si se envía dos veces', () => {
    const { result } = renderHook(() => useReportWizard(), { wrapper });
    act(() => {
      result.current.setReportType('testigo');
    });
    act(() => {
      result.current.handleSubmit();
    });
    act(() => {
      result.current.handleSubmit();
    });

    expect(listarRegistros<ReporteGuardado>('reporte')).toHaveLength(1);
  });
});
