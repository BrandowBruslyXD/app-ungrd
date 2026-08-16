import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@/test/render';
import { SeverityBadge, StatusBadge } from './StatusBadge';
import type { ReportStatus, Prioridad } from '@/types';

describe('StatusBadge', () => {
  const casos: { status: ReportStatus; etiqueta: string }[] = [
    { status: 'Reportado', etiqueta: 'Reportado' },
    { status: 'Verificado', etiqueta: 'Verificado' },
    { status: 'Asignado', etiqueta: 'Asignado' },
    { status: 'EnAtencion', etiqueta: 'En atención' },
    { status: 'Atendido', etiqueta: 'Atendido' },
    { status: 'Cerrado', etiqueta: 'Cerrado' },
  ];

  it.each(casos)(
    'muestra la etiqueta "$etiqueta" cuando el estado es $status',
    ({ status, etiqueta }) => {
      renderWithI18n(<StatusBadge status={status} />);
      expect(screen.getByText(etiqueta)).toBeInTheDocument();
    },
  );

  it('no muestra la etiqueta de otro estado cuando el estado es Reportado', () => {
    renderWithI18n(<StatusBadge status="Reportado" />);
    expect(screen.queryByText('En atención')).not.toBeInTheDocument();
  });
});

describe('SeverityBadge', () => {
  const casos: { severity: Prioridad; etiqueta: string }[] = [
    { severity: 'Baja', etiqueta: 'Baja' },
    { severity: 'Media', etiqueta: 'Media' },
    { severity: 'Alta', etiqueta: 'Alta' },
  ];

  it.each(casos)(
    'muestra la etiqueta "$etiqueta" cuando la prioridad es $severity',
    ({ severity, etiqueta }) => {
      renderWithI18n(<SeverityBadge severity={severity} />);
      expect(screen.getByText(etiqueta)).toBeInTheDocument();
    },
  );
});
