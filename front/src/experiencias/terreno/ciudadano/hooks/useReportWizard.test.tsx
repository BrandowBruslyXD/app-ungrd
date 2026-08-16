import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  canProceed,
  INITIAL_REPORT_FORM,
  useReportWizard,
} from './useReportWizard';

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={['/reportar']}>{children}</MemoryRouter>;
}

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

  it('genera un número de seguimiento al enviar', () => {
    const { result } = renderHook(() => useReportWizard(), { wrapper });
    act(() => {
      result.current.setReportType('testigo');
    });
    act(() => {
      result.current.handleSubmit();
    });
    expect(result.current.submitted).toBe(true);
    expect(result.current.reportId).toMatch(/^CR-2026-\d{4}$/);
  });
});
