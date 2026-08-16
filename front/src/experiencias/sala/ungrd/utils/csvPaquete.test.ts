import { describe, expect, it } from 'vitest';
import i18n from '@/shared/i18n';
import { buscarPaquete, codigoPaquetePorDefecto } from '@/experiencias/sala/ungrd/mocks/paquetes';
import type { PaqueteMinisterio } from '@/experiencias/sala/ungrd/types/paquete';
import {
  BOM_UTF8,
  construirCsvPaquete,
  escaparCampoCsv,
  nombreArchivoCsv,
} from '@/experiencias/sala/ungrd/utils/csvPaquete';

const traducir = (clave: string) => i18n.t(clave);

function paqueteDePrueba(): PaqueteMinisterio {
  const paquete = buscarPaquete(codigoPaquetePorDefecto);
  if (!paquete) throw new Error('El paquete sembrado de la demostración debe existir');
  return paquete;
}

describe('escaparCampoCsv', () => {
  it('devuelve el valor tal cual cuando no tiene caracteres conflictivos', () => {
    expect(escaparCampoCsv('Colegio La Esperanza')).toBe('Colegio La Esperanza');
  });

  it('entrecomilla el valor cuando contiene el separador', () => {
    expect(escaparCampoCsv('Girardot; Cundinamarca')).toBe('"Girardot; Cundinamarca"');
  });

  it('duplica las comillas internas cuando el valor ya trae comillas', () => {
    expect(escaparCampoCsv('Sede "El Progreso"')).toBe('"Sede ""El Progreso"""');
  });

  it('entrecomilla el valor cuando contiene un salto de línea', () => {
    expect(escaparCampoCsv('Aula 1\nAula 2')).toBe('"Aula 1\nAula 2"');
  });
});

describe('construirCsvPaquete', () => {
  it('genera una fila de encabezado y una fila por daño', () => {
    const paquete = paqueteDePrueba();
    const filas = construirCsvPaquete(paquete, traducir).split('\r\n');

    expect(filas).toHaveLength(paquete.danos.length + 1);
  });

  it('separa las columnas con punto y coma cuando arma el encabezado', () => {
    const paquete = paqueteDePrueba();
    const [encabezado] = construirCsvPaquete(paquete, traducir).split('\r\n');

    expect(encabezado.split(';')).toHaveLength(17);
    expect(encabezado).toContain('Nivel de confianza');
  });

  it('escribe el nivel de confianza de cada daño para que el ministerio pueda separarlos', () => {
    const paquete = paqueteDePrueba();
    const contenido = construirCsvPaquete(paquete, traducir);

    expect(contenido).toContain(';Verificado;');
    expect(contenido).toContain(';Censado;');
    expect(contenido).toContain(';Autorreportado;');
  });

  it('deja el costo en blanco cuando el daño no tiene costo estimado', () => {
    const paquete = paqueteDePrueba();
    const sinCosto = paquete.danos.find((dano) => dano.costoEstimado === null);
    const filas = construirCsvPaquete(paquete, traducir).split('\r\n');
    const fila = filas.find((linea) => linea.includes(sinCosto!.origenCodigo));
    const columnas = fila?.split(';') ?? [];

    expect(columnas).toHaveLength(17);
    expect(columnas[15]).toBe('');
  });

  it('escribe el costo como entero sin separador de miles cuando el daño lo tiene', () => {
    const paquete = paqueteDePrueba();
    const conCosto = paquete.danos.find((dano) => dano.costoEstimado !== null);
    const contenido = construirCsvPaquete(paquete, traducir);

    expect(contenido).toContain(`;${conCosto!.costoEstimado};`);
  });

  it('conserva las tildes del texto original', () => {
    const paquete = paqueteDePrueba();
    const contenido = construirCsvPaquete(paquete, traducir);

    expect(contenido).toContain('Educación');
  });

  it('no arranca con el BOM: la marca la agrega quien descarga el archivo', () => {
    const paquete = paqueteDePrueba();

    expect(construirCsvPaquete(paquete, traducir).startsWith(BOM_UTF8)).toBe(false);
  });
});

describe('BOM_UTF8', () => {
  it('es la marca de orden de bytes que Excel en español necesita para las tildes', () => {
    expect(BOM_UTF8).toBe('\uFEFF');
    expect(BOM_UTF8.charCodeAt(0)).toBe(0xfeff);
  });
});

describe('nombreArchivoCsv', () => {
  it('nombra el archivo con el código del paquete y su sector', () => {
    expect(nombreArchivoCsv(paqueteDePrueba())).toBe('PQT-2026-08-15-0007_Educacion_danos.csv');
  });
});
