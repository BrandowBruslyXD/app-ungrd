import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@/shared/test/render';
import EmergencyIcon from './EmergencyIcon';
import type { EmergencyType } from '@/shared/types';

describe('EmergencyIcon', () => {
  const casos: { type: EmergencyType; etiqueta: string }[] = [
    { type: 'Inundacion', etiqueta: 'Inundación' },
    { type: 'Deslizamiento', etiqueta: 'Deslizamiento' },
    { type: 'Incendio', etiqueta: 'Incendio' },
    { type: 'ViaAfectada', etiqueta: 'Vía afectada' },
    { type: 'ColapsoEstructural', etiqueta: 'Colapso estructural' },
    { type: 'Otro', etiqueta: 'Otro' },
  ];

  it.each(casos)(
    'muestra la etiqueta "$etiqueta" con showLabel cuando el tipo es $type',
    ({ type, etiqueta }) => {
      renderWithI18n(<EmergencyIcon type={type} showLabel />);
      expect(screen.getByText(etiqueta)).toBeInTheDocument();
    },
  );

  it.each(casos)(
    'expone el tipo $type al lector de pantalla vía aria-label',
    ({ type, etiqueta }) => {
      renderWithI18n(<EmergencyIcon type={type} />);
      expect(screen.getByRole('img', { name: etiqueta })).toBeInTheDocument();
    },
  );

  it('no muestra etiqueta de texto cuando showLabel no se pasa', () => {
    renderWithI18n(<EmergencyIcon type="Incendio" />);
    // El icono expone el tipo via aria-label, pero no hay <span> con el texto
    const incendioTexts = screen.queryAllByText('Incendio');
    // Solo el aria-label, no un elemento de texto visible
    expect(incendioTexts.length).toBe(0);
  });

  it('no muestra la etiqueta de otro tipo cuando el tipo es Inundacion', () => {
    renderWithI18n(<EmergencyIcon type="Inundacion" showLabel />);
    expect(screen.queryByText('Incendio')).not.toBeInTheDocument();
  });
});
