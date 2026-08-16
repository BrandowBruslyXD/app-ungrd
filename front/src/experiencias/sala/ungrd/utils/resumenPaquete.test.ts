import { describe, expect, it } from 'vitest';
import { buscarPaquete, codigoPaquetePorDefecto } from '@/experiencias/sala/ungrd/mocks/paquetes';
import type { DanoSectorizado, PaqueteMinisterio } from '@/experiencias/sala/ungrd/types/paquete';
import {
  contarPorConfianza,
  resumirPaquete,
  sumarCostos,
  totalizarPorMunicipio,
} from '@/experiencias/sala/ungrd/utils/resumenPaquete';

function paqueteDePrueba(): PaqueteMinisterio {
  const paquete = buscarPaquete(codigoPaquetePorDefecto);
  if (!paquete) throw new Error('El paquete sembrado de la demostración debe existir');
  return paquete;
}

function danoDePrueba(parcial: Partial<DanoSectorizado>): DanoSectorizado {
  return {
    id: 'DS-0001',
    origen: 'CargaEdan',
    origenCodigo: 'EDAN-0001',
    nivelConfianza: 'Verificado',
    municipio: 'Soacha',
    departamento: 'Cundinamarca',
    descripcion: 'Aula inundada',
    cantidad: 1,
    unidad: 'aula',
    nivel: 'Grave',
    costoEstimado: 1000,
    latitud: 4.5,
    longitud: -74.2,
    fecha: '2026-08-15T10:00:00Z',
    ...parcial,
  };
}

describe('contarPorConfianza', () => {
  it('devuelve las tres llaves en cero cuando no hay daños', () => {
    expect(contarPorConfianza([])).toEqual({ Verificado: 0, Censado: 0, Autorreportado: 0 });
  });

  it('cuenta cada daño en su nivel cuando hay de los tres tipos', () => {
    const danos = [
      danoDePrueba({ id: 'a', nivelConfianza: 'Verificado' }),
      danoDePrueba({ id: 'b', nivelConfianza: 'Autorreportado' }),
      danoDePrueba({ id: 'c', nivelConfianza: 'Autorreportado' }),
    ];

    expect(contarPorConfianza(danos)).toEqual({ Verificado: 1, Censado: 0, Autorreportado: 2 });
  });
});

describe('sumarCostos', () => {
  it('ignora los daños sin costo en lugar de contarlos como cero pesos', () => {
    const danos = [
      danoDePrueba({ id: 'a', costoEstimado: 1500 }),
      danoDePrueba({ id: 'b', costoEstimado: null }),
    ];

    expect(sumarCostos(danos)).toBe(1500);
  });
});

describe('totalizarPorMunicipio', () => {
  it('agrupa los daños del mismo municipio en una sola fila', () => {
    const danos = [
      danoDePrueba({ id: 'a', municipio: 'Soacha', costoEstimado: 100 }),
      danoDePrueba({ id: 'b', municipio: 'Soacha', costoEstimado: 200 }),
      danoDePrueba({ id: 'c', municipio: 'Girardot', costoEstimado: 50 }),
    ];

    const totales = totalizarPorMunicipio(danos);

    expect(totales).toHaveLength(2);
    expect(totales[0]).toMatchObject({ municipio: 'Soacha', danos: 2, costoEstimado: 300 });
  });

  it('separa dos municipios homónimos cuando están en departamentos distintos', () => {
    const danos = [
      danoDePrueba({ id: 'a', municipio: 'La Unión', departamento: 'Antioquia' }),
      danoDePrueba({ id: 'b', municipio: 'La Unión', departamento: 'Nariño' }),
    ];

    expect(totalizarPorMunicipio(danos)).toHaveLength(2);
  });

  it('ordena de mayor a menor costo estimado para dejar arriba lo más caro', () => {
    const danos = [
      danoDePrueba({ id: 'a', municipio: 'Girardot', costoEstimado: 50 }),
      danoDePrueba({ id: 'b', municipio: 'Soacha', costoEstimado: 900 }),
    ];

    expect(totalizarPorMunicipio(danos).map((fila) => fila.municipio)).toEqual([
      'Soacha',
      'Girardot',
    ]);
  });
});

describe('resumirPaquete', () => {
  it('cuenta los municipios sin repetir cuando un municipio tiene varios daños', () => {
    const paquete = paqueteDePrueba();
    const resumen = resumirPaquete(paquete);
    const municipiosDistintos = new Set(
      paquete.danos.map((dano) => `${dano.departamento}|${dano.municipio}`),
    );

    expect(resumen.totalMunicipios).toBe(municipiosDistintos.size);
    expect(resumen.totalDanos).toBe(paquete.danos.length);
  });

  it('reparte el total de daños entre los tres niveles de confianza sin perder ninguno', () => {
    const resumen = resumirPaquete(paqueteDePrueba());
    const { Verificado, Censado, Autorreportado } = resumen.porConfianza;

    expect(Verificado + Censado + Autorreportado).toBe(resumen.totalDanos);
  });

  it('avisa cuántos daños quedan fuera del costo estimado', () => {
    const resumen = resumirPaquete(paqueteDePrueba());

    expect(resumen.danosSinCosto).toBeGreaterThan(0);
  });

  it('deja el costo en cero cuando ningún daño trae estimación', () => {
    const paquete: PaqueteMinisterio = {
      ...paqueteDePrueba(),
      danos: [danoDePrueba({ costoEstimado: null })],
      necesidades: [],
    };

    const resumen = resumirPaquete(paquete);

    expect(resumen.costoEstimadoTotal).toBe(0);
    expect(resumen.danosSinCosto).toBe(1);
    expect(resumen.costoNecesidades).toBe(0);
  });
});
