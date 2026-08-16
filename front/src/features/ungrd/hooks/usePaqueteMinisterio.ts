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
import { danosDelEvento, eventoPorCodigo, paquetePorSector } from '@/mocks/mockSectorial';
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

/**
 * En qué punto de los tres pasos —generar, descargar, enviar— va el paquete.
 *
 * Los dos primeros pasos son estado de esta sesión y no del dato sembrado: son
 * lo que **este** funcionario lleva hecho delante de la pantalla.
 */
export interface EstadoInforme {
  /** ISO-8601 en UTC del momento en que se armó el documento, o `null`. */
  generadoEn: string | null;
  /** Quién lo generó. Va impreso en el membrete: un documento sin autor no se firma. */
  generadoPor: string | null;
  /** ISO-8601 en UTC de cuándo se abrió el diálogo de impresión, o `null`. */
  pdfAbiertoEn: string | null;
}

/** Lo que devuelve el hook. `datos` es `null` cuando el sector de la URL no existe. */
export interface UsoPaqueteMinisterio {
  datos: DatosPaquete | null;
  envio: EstadoEnvio | null;
  informe: EstadoInforme;
  /** Fija la fecha y el responsable del documento. Sin esto no hay nada que imprimir. */
  generarInforme: (generadoPor: string) => void;
  /** Firma humana y registro del envío simulado. No manda ningún correo. */
  aprobarYEnviar: (firmadoPor: string) => void;
  descargarCsv: () => void;
  /** Abre el diálogo de impresión del navegador, de donde sale el PDF. */
  descargarPdf: () => void;
}

/** Ningún paso dado: es también lo que se ve cuando el sector de la URL no existe. */
const INFORME_VACIO: EstadoInforme = { generadoEn: null, generadoPor: null, pdfAbiertoEn: null };

interface InformeLocal extends EstadoInforme {
  /** De qué paquete es el avance. Abrir otro no hereda el del anterior. */
  paqueteId: string;
  generadoEn: string;
  generadoPor: string;
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

/** Lo que la URL identifica: un desastre y, dentro de él, el paquete de un sector. */
interface Resuelto {
  evento: Evento;
  paquete: PaqueteMinisterio;
}

/**
 * Resuelve los dos códigos de la URL.
 *
 * Los dos son texto libre hasta que se comprueben, y el sector no se busca
 * suelto: se busca **dentro** del desastre. Un mismo ministerio tiene un
 * paquete distinto en cada emergencia, y confundirlos remitiría a la entidad
 * los daños de otro evento.
 */
function resolver(
  codigoEvento: string | undefined,
  codigoSector: string | undefined,
): Resuelto | undefined {
  if (codigoEvento === undefined || codigoSector === undefined) return undefined;

  const evento = eventoPorCodigo(codigoEvento);
  if (evento === undefined) return undefined;

  const paquete = paquetePorSector(codigoSector, evento.id);
  if (paquete === undefined) return undefined;

  return { evento, paquete };
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
export function usePaqueteMinisterio(
  codigoEvento: string | undefined,
  codigoSector: string | undefined,
): UsoPaqueteMinisterio {
  const resuelto = useMemo(
    () => resolver(codigoEvento, codigoSector),
    [codigoEvento, codigoSector],
  );
  const paquete = resuelto?.paquete;

  /*
   * La aprobación no muta los datos sembrados: se guarda como una firma
   * separada y la pantalla la superpone. Mutar el arreglo importado dejaría el
   * panel de al lado mostrando un envío que esta sesión inventó, y al recargar
   * desaparecería sin dejar rastro. Se guarda con el identificador del paquete
   * —que es único por evento y sector— para que abrir otro no herede la firma
   * del anterior.
   */
  const [firmaLocal, setFirmaLocal] = useState<{
    paqueteId: string;
    por: string;
    en: string;
  } | null>(null);

  const datos = useMemo<DatosPaquete | null>(() => {
    if (resuelto === undefined) return null;

    const { evento, paquete } = resuelto;
    const danos = danosDelEvento(evento.id).filter((dano) => dano.sector === paquete.sector);

    /*
     * Los totales salen de las mismas funciones que arman el CSV y el correo, no
     * de un conteo escrito aquí. Es la única forma de que el encabezado del
     * oficio y el detalle adjunto no puedan decir cosas distintas.
     */
    const resumen = agruparPorSector(danos).find((fila) => fila.sector === paquete.sector);

    return {
      paquete,
      ficha: CATALOGO_SECTORES[paquete.sector],
      evento,
      danos,
      municipios: totalesPorMunicipio(danos),
      necesidades: armarNecesidades(danos),
      confianza: resumen?.confianza ?? { Autorreportado: 0, Censado: 0, Verificado: 0 },
      personasAfectadas: resumen?.personasAfectadas ?? 0,
      costoEstimado: resumen?.costoEstimado ?? 0,
      danosSinCosto: danos.filter((dano) => dano.costoEstimado === undefined).length,
      correo: componerCorreo(paquete, evento),
      archivos: [nombreArchivoCsv(paquete)],
    };
  }, [resuelto]);

  const envio = useMemo<EstadoEnvio | null>(() => {
    if (paquete === undefined) return null;

    if (firmaLocal !== null && firmaLocal.paqueteId === paquete.id) {
      return { estado: 'Enviado', aprobadoPor: firmaLocal.por, aprobadoEn: firmaLocal.en };
    }

    return {
      estado: paquete.estado,
      aprobadoPor: paquete.aprobadoPor,
      aprobadoEn: paquete.aprobadoEn,
    };
  }, [paquete, firmaLocal]);

  const [informeLocal, setInformeLocal] = useState<InformeLocal | null>(null);

  const informe = useMemo<EstadoInforme>(() => {
    if (paquete === undefined || informeLocal === null) return INFORME_VACIO;
    if (informeLocal.paqueteId !== paquete.id) return INFORME_VACIO;

    return {
      generadoEn: informeLocal.generadoEn,
      generadoPor: informeLocal.generadoPor,
      pdfAbiertoEn: informeLocal.pdfAbiertoEn,
    };
  }, [paquete, informeLocal]);

  const generarInforme = useCallback(
    (generadoPor: string) => {
      if (paquete === undefined) return;

      /*
       * La fecha se fija al generar y no al imprimir. Un documento oficial dice
       * cuándo se armó con los datos que tenía en ese momento; si la tomara el
       * diálogo de impresión, dos copias del mismo consolidado llevarían fechas
       * distintas y ninguna sería la del corte de la información.
       */
      setInformeLocal({
        paqueteId: paquete.id,
        generadoEn: new Date().toISOString(),
        generadoPor,
        pdfAbiertoEn: null,
      });
    },
    [paquete],
  );

  const descargarPdf = useCallback(() => {
    if (informeLocal === null || paquete === undefined) return;
    if (informeLocal.paqueteId !== paquete.id) return;

    setInformeLocal({ ...informeLocal, pdfAbiertoEn: new Date().toISOString() });

    /*
     * El PDF lo hace el navegador, no la aplicación: la hoja `impresion.css`
     * deja en la página solo el documento y el diálogo ofrece «Guardar como
     * PDF». Traer una librería de PDF por esto sumaría cientos de kilobytes a
     * un paquete que se descarga con la red de una emergencia.
     */
    window.print();
  }, [informeLocal, paquete]);

  const aprobarYEnviar = useCallback(
    (firmadoPor: string) => {
      if (resuelto === undefined) return;

      const { evento, paquete } = resuelto;

      /*
       * La regla se comprueba aquí y no solo escondiendo el botón. Un oficio sin
       * decreto que lo ampare no se remite, y esconder el control deja la regla
       * a merced de la pantalla: cuando esto hable con el backend, la misma
       * comprobación tiene que estar del otro lado.
       */
      if (evento.declaratoria === 'Ninguna') return;

      setFirmaLocal({ paqueteId: paquete.id, por: firmadoPor, en: new Date().toISOString() });
    },
    [resuelto],
  );

  const descargarCsv = useCallback(() => {
    if (resuelto === undefined) return;

    const { evento, paquete } = resuelto;
    const contenido = armarCsvPaquete(paquete, danosDelEvento(evento.id));
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
  }, [resuelto]);

  return { datos, envio, informe, generarInforme, aprobarYEnviar, descargarCsv, descargarPdf };
}
