import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ProveedorReportesDemo, useReportesDemo } from '@/shared/hooks/useReportesDemo';
import {
  canProceed,
  generarCodigoSeguimiento,
  INITIAL_REPORT_FORM,
  useReportWizard,
} from './useReportWizard';

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={['/reportar']}>{children}</MemoryRouter>;
}

/** Recorre el asistente de testigo hasta el último paso, que es donde aparece el botón de enviar. */
function completarAsistenteDeTestigo(result: { current: ReturnType<typeof useReportWizard> }) {
  act(() => {
    result.current.setReportType('testigo');
  });
  act(() => {
    result.current.goNext();
  });
  act(() => {
    result.current.updateForm({ type: 'Inundacion' });
  });
  act(() => {
    result.current.goNext();
  });
  act(() => {
    result.current.updateForm({ severity: 'grave' });
  });
  act(() => {
    result.current.goNext();
  });
  act(() => {
    result.current.updateForm({ location: 'Calle 123 #45-67' });
  });
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

  it('genera un código con el formato del contrato al enviar', () => {
    const { result } = renderHook(() => useReportWizard(), { wrapper });
    completarAsistenteDeTestigo(result);

    act(() => {
      result.current.handleSubmit();
    });

    expect(result.current.submitted).toBe(true);
    expect(result.current.reportId).toMatch(/^RPT-\d{4}-\d{2}-\d{2}-\d{4}$/);
  });

  it('mantiene el mismo código aunque se vuelva a enviar', () => {
    const { result } = renderHook(() => useReportWizard(), { wrapper });
    completarAsistenteDeTestigo(result);

    act(() => {
      result.current.handleSubmit();
    });
    const primerCodigo = result.current.reportId;

    act(() => {
      result.current.handleSubmit();
    });

    expect(result.current.reportId).toBe(primerCodigo);
  });

  it('no envía sin tipo de emergencia', () => {
    const { result } = renderHook(() => useReportWizard(), { wrapper });
    act(() => {
      result.current.setReportType('testigo');
    });

    act(() => {
      result.current.handleSubmit();
    });

    expect(result.current.submitted).toBe(false);
    expect(result.current.reportId).toBe('');
  });
});

describe('useReportWizard con el estado compartido', () => {
  /** El asistente y el estado compartido montados juntos, como en la aplicación real. */
  function renderizarCadena() {
    function Envoltura({ children }: { children: ReactNode }) {
      return (
        <MemoryRouter initialEntries={['/reportar']}>
          <ProveedorReportesDemo>{children}</ProveedorReportesDemo>
        </MemoryRouter>
      );
    }
    return renderHook(
      () => ({ asistente: useReportWizard(), compartido: useReportesDemo() }),
      { wrapper: Envoltura },
    );
  }

  it('deja el reporte enviado en el estado compartido para que el gestor lo vea', () => {
    const { result } = renderizarCadena();
    const antes = result.current.compartido.reportes.length;

    completarAsistenteDeTestigo({
      get current() {
        return result.current.asistente;
      },
    });
    act(() => {
      result.current.asistente.handleSubmit();
    });

    const codigo = result.current.asistente.reportId;
    expect(result.current.compartido.reportes).toHaveLength(antes + 1);

    const registrado = result.current.compartido.obtenerDetalle(codigo);
    expect(registrado?.estado).toBe('Reportado');
    expect(registrado?.direccion).toBe('Calle 123 #45-67');
    expect(registrado?.cronologia).toHaveLength(1);
  });

  it('no deja llaves de traducción sin resolver en lo que leerá el ciudadano', () => {
    const { result } = renderizarCadena();

    completarAsistenteDeTestigo({
      get current() {
        return result.current.asistente;
      },
    });
    act(() => {
      result.current.asistente.handleSubmit();
    });

    const registrado = result.current.compartido.obtenerDetalle(result.current.asistente.reportId);
    expect(registrado?.cronologia[0].nota).not.toContain('wizard.created');
    expect(registrado?.cronologia[0].responsable).not.toContain('wizard.created');
  });
});

describe('generarCodigoSeguimiento', () => {
  it('usa la fecha del envío en el formato RPT-AAAA-MM-DD-NNNN', () => {
    const codigo = generarCodigoSeguimiento(new Date(2026, 7, 5, 10, 30));
    expect(codigo).toMatch(/^RPT-2026-08-05-\d{4}$/);
  });
});
