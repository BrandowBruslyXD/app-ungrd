import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@/test/render';
import EmergencyIcon from './EmergencyIcon';

describe('EmergencyIcon', () => {
  it('expone el tipo de emergencia al lector de pantalla', () => {
    renderWithI18n(<EmergencyIcon type="Incendio" />);
    expect(screen.getByRole('img', { name: 'Incendio' })).toBeInTheDocument();
  });

  it('muestra la etiqueta del tipo cuando showLabel es true', () => {
    renderWithI18n(<EmergencyIcon type="Inundacion" showLabel />);
    expect(screen.getByText('Inundación')).toBeInTheDocument();
  });
});
