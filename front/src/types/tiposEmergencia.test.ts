import { describe, it, expect } from 'vitest';
import { TIPOS_EMERGENCIA } from '@/types';
import es from '@/locales/es.json';

/*
 * Por qué existe esta prueba.
 *
 * El backend sumó `Sismo`, `Vendaval` y `AvenidaTorrencial` y el frontend se
 * quedó atrás: la unión de tipos, dos mapas de iconos y las etiquetas seguían
 * con los seis de antes. Nada falló al compilar y nada falló al probar; se habría
 * visto en pantalla como un icono roto delante de un ciudadano reportando un
 * sismo.
 *
 * Estas pruebas recorren la lista real de tipos y exigen que todo lo que se
 * indexa por tipo esté completo. La próxima vez que alguien agregue uno al
 * contrato, esto falla antes de llegar al navegador.
 */
describe('tipos de emergencia — alineación con el contrato', () => {
  it('cada tipo tiene su etiqueta en español', () => {
    const etiquetas = es.emergencyType as Record<string, string>;
    const faltantes = TIPOS_EMERGENCIA.filter((tipo) => !etiquetas[tipo]);

    expect(faltantes, `sin etiqueta en locales/es.json: ${faltantes.join(', ')}`).toEqual([]);
  });

  it('no hay etiquetas de tipos que ya no existen', () => {
    const sobrantes = Object.keys(es.emergencyType).filter(
      (clave) => !TIPOS_EMERGENCIA.includes(clave as (typeof TIPOS_EMERGENCIA)[number])
    );

    expect(sobrantes, `etiquetas huérfanas: ${sobrantes.join(', ')}`).toEqual([]);
  });

  it('los valores coinciden con el enum TipoReporte del backend', () => {
    // Copiados de back/src/ConectaRiesgoAI.Api/Domain/Enums/TipoReporte.cs.
    // Mandar cualquier otra cadena devuelve 400, incluido "Avenida torrencial"
    // con espacio, que es como lo dice en voz alta el agente telefónico.
    const delBackend = [
      'Incendio',
      'Inundacion',
      'Deslizamiento',
      'ViaAfectada',
      'ColapsoEstructural',
      'Sismo',
      'Vendaval',
      'AvenidaTorrencial',
      'Otro',
    ];

    expect([...TIPOS_EMERGENCIA].sort()).toEqual(delBackend.sort());
  });

  it('ningun valor lleva espacios ni tildes: viajan crudos en el JSON', () => {
    const malformados = TIPOS_EMERGENCIA.filter((tipo) => !/^[A-Za-z]+$/.test(tipo));

    expect(malformados, `no son ASCII sin espacios: ${malformados.join(', ')}`).toEqual([]);
  });
});
