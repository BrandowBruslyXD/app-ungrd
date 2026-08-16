import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LimiteDeError from './LimiteDeError';

/*
 * Un límite de error que nadie probó no sirve de nada: si está mal escrito, el
 * fallo lo atraviesa y la pantalla queda en blanco igual, que es exactamente lo
 * que vino a evitar.
 */
function Explota(): never {
  throw new Error('fallo simulado al renderizar');
}

describe('LimiteDeError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra los hijos cuando no hay ningún fallo', () => {
    render(
      <LimiteDeError>
        <p>contenido normal</p>
      </LimiteDeError>
    );

    expect(screen.getByText('contenido normal')).toBeInTheDocument();
  });

  it('atrapa el fallo y ofrece una salida en vez de dejar la pantalla vacía', () => {
    // React escribe el error en consola aunque se atrape; se silencia para que
    // la salida de las pruebas no parezca rota.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LimiteDeError>
        <Explota />
      </LimiteDeError>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('No pudimos mostrar esta pantalla')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /volver a cargar/i })).toBeInTheDocument();
  });

  it('recuerda la línea de emergencia, que es lo urgente si la app falla', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LimiteDeError>
        <Explota />
      </LimiteDeError>
    );

    expect(screen.getByText(/llama al 123/i)).toBeInTheDocument();
  });

  it('no registra el contenido del error, solo su mensaje', () => {
    const registro = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LimiteDeError>
        <Explota />
      </LimiteDeError>
    );

    // Los datos personales nunca deben acabar en el registro (Ley 1581).
    const llamadaPropia = registro.mock.calls.find(
      (args) => typeof args[0] === 'string' && args[0].startsWith('Fallo al renderizar')
    );
    expect(llamadaPropia).toBeDefined();
    expect(llamadaPropia?.[1]).toBe('fallo simulado al renderizar');
  });
});
