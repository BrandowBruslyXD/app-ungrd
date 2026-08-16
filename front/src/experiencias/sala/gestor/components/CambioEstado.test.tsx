import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@/shared/test/render';
import CambioEstado from './CambioEstado';

function montar(guardando = false) {
  const onGuardar = vi.fn();
  const onCancelar = vi.fn();
  renderWithI18n(
    <CambioEstado
      codigo="RPT-2026-08-15-0047"
      siguientes={['Atendido', 'Cerrado']}
      guardando={guardando}
      onGuardar={onGuardar}
      onCancelar={onCancelar}
    />,
  );
  return { onGuardar, onCancelar };
}

describe('CambioEstado', () => {
  it('no deja guardar mientras no se elija un estado', () => {
    montar();
    expect(screen.getByRole('button', { name: 'Guardar cambio' })).toBeDisabled();
  });

  it('solo ofrece los estados hacia adelante que recibe', () => {
    montar();
    expect(screen.getByRole('radio', { name: 'Atendido' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Cerrado' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Asignado' })).not.toBeInTheDocument();
  });

  it('una sugerencia tocable llena la nota que leerá el ciudadano', async () => {
    const usuario = userEvent.setup();
    const { onGuardar } = montar();

    await usuario.click(screen.getByRole('radio', { name: 'Atendido' }));
    await usuario.click(screen.getByRole('button', { name: 'Usar la nota: Brigada en camino' }));

    expect(screen.getByLabelText('Nota para el ciudadano (opcional)')).toHaveValue(
      'Brigada en camino',
    );

    await usuario.click(screen.getByRole('button', { name: 'Guardar cambio' }));
    expect(onGuardar).toHaveBeenCalledWith('Atendido', 'Brigada en camino');
  });

  it('permite guardar sin nota: la nota es opcional', async () => {
    const usuario = userEvent.setup();
    const { onGuardar } = montar();

    await usuario.click(screen.getByRole('radio', { name: 'Cerrado' }));
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambio' }));

    expect(onGuardar).toHaveBeenCalledWith('Cerrado', '');
  });

  it('mientras guarda avisa y bloquea el formulario', () => {
    montar(true);
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
  });
});
