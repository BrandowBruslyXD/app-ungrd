import { describe, it, expect } from 'vitest';
import { estadosSiguientes, puedeAvanzar } from './flujoEstados';

describe('estadosSiguientes', () => {
  it('desde Reportado ofrece los cinco estados que siguen', () => {
    expect(estadosSiguientes('Reportado')).toEqual([
      'Verificado',
      'Asignado',
      'EnAtencion',
      'Atendido',
      'Cerrado',
    ]);
  });

  it('nunca ofrece un estado anterior al actual', () => {
    expect(estadosSiguientes('Atendido')).toEqual(['Cerrado']);
  });

  it('desde Cerrado no ofrece ningún estado', () => {
    expect(estadosSiguientes('Cerrado')).toEqual([]);
  });
});

describe('puedeAvanzar', () => {
  it('permite saltar hacia adelante sin pasar por los estados intermedios', () => {
    expect(puedeAvanzar('Reportado', 'Asignado')).toBe(true);
  });

  it('rechaza volver a un estado anterior', () => {
    expect(puedeAvanzar('Atendido', 'Asignado')).toBe(false);
  });

  it('rechaza quedarse en el mismo estado', () => {
    expect(puedeAvanzar('EnAtencion', 'EnAtencion')).toBe(false);
  });
});
