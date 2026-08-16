import { describe, expect, it } from 'vitest';
import {
  observacionMasReciente,
  tiempoDesde,
} from '@/features/gestor/lib/tiempoObservacion';

/*
 * La hora de observación es lo único que sostiene el discurso de que el dato es
 * verificable, así que tiene que ser correcta también en los bordes: el reloj
 * del navegador adelantado, una fecha ilegible y el salto de horas a días.
 */

const AHORA = new Date('2026-08-16T12:00:00.000Z');

function hace(milisegundos: number): string {
  return new Date(AHORA.getTime() - milisegundos).toISOString();
}

describe('tiempoDesde', () => {
  it('tiempoDesde_haceVeinteSegundos_diceQueFueHaceUnMomento', () => {
    expect(tiempoDesde(hace(20_000), AHORA)).toEqual({
      clave: 'manager.observacion.haceInstantes',
      valores: {},
    });
  });

  it('tiempoDesde_haceCuatroMinutos_cuentaEnMinutos', () => {
    expect(tiempoDesde(hace(4 * 60_000), AHORA)).toEqual({
      clave: 'manager.observacion.haceMinutos',
      valores: { count: 4 },
    });
  });

  it('tiempoDesde_haceDosHoras_cuentaEnHoras', () => {
    expect(tiempoDesde(hace(2 * 3_600_000), AHORA)).toEqual({
      clave: 'manager.observacion.haceHoras',
      valores: { count: 2 },
    });
  });

  it('tiempoDesde_haceTreintaHoras_siguenSiendoHorasPorqueElAyerEsOperativo', () => {
    expect(tiempoDesde(hace(30 * 3_600_000), AHORA)).toEqual({
      clave: 'manager.observacion.haceHoras',
      valores: { count: 30 },
    });
  });

  it('tiempoDesde_haceTresDias_cuentaEnDias', () => {
    expect(tiempoDesde(hace(3 * 86_400_000), AHORA)).toEqual({
      clave: 'manager.observacion.haceDias',
      valores: { count: 3 },
    });
  });

  it('tiempoDesde_horaEnElFuturoPorRelojDesfasado_noDiceHaceMenosCeroMinutos', () => {
    // El reloj del equipo puede ir atrasado respecto al del servicio. «Hace un
    // momento» es honesto; «hace -3 minutos» delata un error de la herramienta.
    const enElFuturo = new Date(AHORA.getTime() + 90_000).toISOString();

    expect(tiempoDesde(enElFuturo, AHORA)).toEqual({
      clave: 'manager.observacion.haceInstantes',
      valores: {},
    });
  });

  it('tiempoDesde_fechaIlegible_devuelveNuloParaQueNoSeEscribaLaLinea', () => {
    expect(tiempoDesde('el martes pasado', AHORA)).toBeNull();
  });
});

describe('observacionMasReciente', () => {
  it('observacionMasReciente_variasObservaciones_devuelveLaUltima', () => {
    const observaciones = [
      { observadoEn: '2026-08-14T10:00:00.000Z' },
      { observadoEn: '2026-08-16T06:30:00.000Z' },
      { observadoEn: '2026-08-15T23:59:00.000Z' },
    ];

    expect(observacionMasReciente(observaciones)).toBe('2026-08-16T06:30:00.000Z');
  });

  it('observacionMasReciente_listaVacia_devuelveNulo', () => {
    expect(observacionMasReciente([])).toBeNull();
  });
});
