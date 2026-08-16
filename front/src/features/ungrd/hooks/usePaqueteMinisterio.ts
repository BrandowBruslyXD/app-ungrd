import { useCallback, useMemo, useState } from 'react';
import { CATALOGO_SECTORES, type FichaSector } from '@/lib/catalogoSectores';
import {
  agruparPorSector,
  armarCsvPaquete,
  componerCorreo,
  nombreArchivoCsv,
  totalesPorMunicipio,
  type CorreoCompuesto,
  type DesgloseConfianza,
  type ResumenMunicipio,
} from '@/lib/sectorial';
import { mockDanos, mockEvento, paquetePorSector } from '@/mocks/mockSectorial';
import { NIVELES_DANO } from '@/types/sectorial';
import type {
  DanoSectorizado,
  EstadoPaquete,
  Evento,
  NivelDano,
  PaqueteMinisterio,
} from '@/types/sectorial';

/**
 * Una fila de la tabla con la que cierra cada bloque sectorial del formato
 * oficial FR-1703-SMD-09: `Necesidad | Equipos o elementos requeridos | Costo
 * estimado`.
 */
export interface FilaNecesidad {
  /** `null` cuando el dato de origen llegó sin nivel de daño. */
  nivel: NivelDano | null;
  /** Cantidades sumadas por unidad: «251 viviendas», «4 km de red». */
  elementos: readonly { cantidad: number; unidad: string }[];
  costoEstimado: number;
  totalDanos: number;
  /** Daños de la fila que llegaron sin costo. La suma de arriba no los incluye. */
  sinCosto: number;
}

/** Todo lo que la pantalla del paquete necesita, ya calculado. */
export interface DatosPaquete {
  paquete: PaqueteMinisterio;
  ficha: FichaSector;
  evento: Evento;
  /** Los daños del sector y del evento, y solo esos. */
  danos: readonly DanoSectorizado[];
  municipios: readonly ResumenMunicipio[];
  necesidades: readonly FilaNecesidad[];
  confianza: DesgloseConfianza;
  personasAfectadas: number;
  costoEstimado: number;
  /** Cuántos daños llegaron sin costo. Sin este número el total se lee como completo. */
  danosSinCosto: number;
  correo: CorreoCompuesto;
  archivos: readonly string[];
}

/** El estado del envío, que en esta pantalla sí puede cambiar. */
export interface EstadoEnvio {
  estado: EstadoPaquete;
  aprobadoPor?: string;
  aprobadoEn?: string;
}

/** Lo que devuelve el hook. `datos` es `null` cuando el sector de la URL no existe. */
export interface UsoPaqueteMinisterio {
  datos: DatosPaquete | null;
  envio: EstadoEnvio | null;
  /** Firma humana y registro del envío simulado. No manda ningún correo. */
  aprobarYEnviar: (firmadoPor: string) => void;
  descargarCsv: () => void;
}

/*
 * De más grave a más leve, y lo que no trae nivel al final.
 *
 * El orden importa: la tabla de necesidades es lo último que lee el funcionario
 * antes de aprobar, y lo que hay que reponer entero tiene que ir arriba, no
 * enterrado detrás de lo que solo necesita mantenimiento.
 */
const ORDEN_NECESIDAD: readonly (NivelDano | null)[] = [...[...NIVELES_DANO].reverse(), null];

interface AcumuladoNecesidad {
  cantidadPorUnidad: Map<string, number>;
  costoEstimado: number;
  totalDanos: number;
  sinCosto: number;
}

/**
 * Arma la tabla de necesidades agrupando los daños por su nivel.
 *
 * **Aquí no se estima nada.** La necesidad sale del nivel que ya trae el dato
 * —lo destruido se repone, lo grave se rehabilita— y el costo es la suma de lo
 * que informó la fuente. Inventar una cifra en un documento oficial dirigido a
 * un ministerio sería exactamente lo que este módulo dice que no hace, y por
 * eso los daños que llegaron sin costo se cuentan aparte en vez de sumar cero
 * en silencio.
 */
export function armarNecesidades(danos: readonly DanoSectorizado[]): FilaNecesidad[] {
  const acumulados = new Map<NivelDano | null, AcumuladoNecesidad>();

  for (const dano of danos) {
    const clave: NivelDano | null = dano.nivel ?? null;
    let acumulado = acumulados.get(clave);

    if (acumulado === undefined) {
      acumulado = {
        cantidadPorUnidad: new Map<string, number>(),
        costoEstimado: 0,
        totalDanos: 0,
        sinCosto: 0,
      };
      acumulados.set(clave, acumulado);
    }

    const previa: number = acumulado.cantidadPorUnidad.get(dano.unidad) ?? 0;
    acumulado.cantidadPorUnidad.set(dano.unidad, previa + dano.cantidad);
    acumulado.totalDanos += 1;

    if (dano.costoEstimado === undefined) {
      acumulado.sinCosto += 1;
    } else {
      acumulado.costoEstimado += dano.costoEstimado;
    }
  }

  const filas: FilaNecesidad[] = [];

  for (const nivel of ORDEN_NECESIDAD) {
    const acumulado = acumulados.get(nivel);
    if (acumulado === undefined) continue;

    filas.push({
      nivel,
      elementos: [...acumulado.cantidadPorUnidad.entries()]
        .map(([unidad, cantidad]) => ({ unidad, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad),
      costoEstimado: acumulado.costoEstimado,
      totalDanos: acumulado.totalDanos,
      sinCosto: acumulado.sinCosto,
    });
  }

  return filas;
}

/** El sector viene de la URL: es texto libre hasta que se compruebe. */
function esSectorConPaquete(codigo: string | undefined): PaqueteMinisterio | undefined {
  return codigo === undefined ? undefined : paquetePorSector(codigo);
}

/**
 * Reúne el paquete de un ministerio y las dos acciones que se pueden hacer con
 * él: descargar el detalle y firmar el envío.
 *
 * La lógica está aquí y no en la pantalla porque de estas cifras sale el
 * archivo que se le manda a una entidad del Estado. Un componente que calcula
 * mientras pinta es un componente donde nadie ve el error hasta que el correo
 * ya salió.
 */
export function usePaqueteMinisterio(codigoSector: string | undefined): UsoPaqueteMinisterio {
  const paquete = useMemo(() => esSectorConPaquete(codigoSector), [codigoSector]);

  /*
   * La aprobación no muta los datos sembrados: se guarda como una firma
   * separada y la pantalla la superpone. Mutar el arreglo importado dejaría el
   * panel de al lado mostrando un envío que esta sesión inventó, y al recargar
   * desaparecería sin dejar rastro. Se guarda con su sector para que abrir otro
   * paquete no herede la firma del anterior.
   */
  const [firmaLocal, setFirmaLocal] = useState<{ sector: string; por: string; en: string } | null>(
    null,
  );

  const datos = useMemo<DatosPaquete | null>(() => {
    if (paquete === undefined) return null;

    const danos = mockDanos.filter(
      (dano) => dano.eventoId === paquete.eventoId && dano.sector === paquete.sector,
    );

    /*
     * Los totales salen de las mismas funciones que arman el CSV y el correo, no
     * de un conteo escrito aquí. Es la única forma de que el encabezado del
     * oficio y el detalle adjunto no puedan decir cosas distintas.
     */
    const resumen = agruparPorSector(danos).find((fila) => fila.sector === paquete.sector);

    return {
      paquete,
      ficha: CATALOGO_SECTORES[paquete.sector],
      evento: mockEvento,
      danos,
      municipios: totalesPorMunicipio(danos),
      necesidades: armarNecesidades(danos),
      confianza: resumen?.confianza ?? { Autorreportado: 0, Censado: 0, Verificado: 0 },
      personasAfectadas: resumen?.personasAfectadas ?? 0,
      costoEstimado: resumen?.costoEstimado ?? 0,
      danosSinCosto: danos.filter((dano) => dano.costoEstimado === undefined).length,
      correo: componerCorreo(paquete, mockEvento),
      archivos: [nombreArchivoCsv(paquete)],
    };
  }, [paquete]);

  const envio = useMemo<EstadoEnvio | null>(() => {
    if (paquete === undefined) return null;

    if (firmaLocal !== null && firmaLocal.sector === paquete.sector) {
      return { estado: 'Enviado', aprobadoPor: firmaLocal.por, aprobadoEn: firmaLocal.en };
    }

    return {
      estado: paquete.estado,
      aprobadoPor: paquete.aprobadoPor,
      aprobadoEn: paquete.aprobadoEn,
    };
  }, [paquete, firmaLocal]);

  const aprobarYEnviar = useCallback(
    (firmadoPor: string) => {
      if (paquete === undefined) return;
      setFirmaLocal({ sector: paquete.sector, por: firmadoPor, en: new Date().toISOString() });
    },
    [paquete],
  );

  const descargarCsv = useCallback(() => {
    if (paquete === undefined) return;

    const contenido = armarCsvPaquete(paquete, mockDanos);
    const archivo = new Blob([contenido], { type: 'text/csv;charset=utf-8' });
    const direccion = URL.createObjectURL(archivo);

    const enlace = document.createElement('a');
    enlace.href = direccion;
    enlace.download = nombreArchivoCsv(paquete);
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    /*
     * Se libera en el siguiente turno del bucle, no en la línea de abajo:
     * revocar la dirección en el mismo tic cancela la descarga en Safari, que
     * todavía no ha terminado de leer el blob.
     */
    window.setTimeout(() => URL.revokeObjectURL(direccion), 0);
  }, [paquete]);

  return { datos, envio, aprobarYEnviar, descargarCsv };
}
