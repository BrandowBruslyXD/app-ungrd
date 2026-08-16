import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@/test/render';
import { SeverityBadge, StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('muestra la etiqueta de estado en atención', () => {
    renderWithI18n(<StatusBadge status="EnAtencion" />);
    expect(screen.getByText('En atención')).toBeInTheDocument();
  });

  it('muestra la etiqueta de estado cerrado', () => {
    renderWithI18n(<StatusBadge status="Cerrado" />);
    expect(screen.getByText('Cerrado')).toBeInTheDocument();
  });
});

describe('SeverityBadge', () => {
  it('muestra la prioridad alta', () => {
    renderWithI18n(<SeverityBadge severity="Alta" />);
    expect(screen.getByText('Alta')).toBeInTheDocument();
  });
});
