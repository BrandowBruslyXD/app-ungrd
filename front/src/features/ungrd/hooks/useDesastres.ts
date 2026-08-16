import { useMemo } from 'react';
import { contarPendientesDeEnvio, resumenCobertura } from '@/lib/sectorial';
import {
  coberturaDelEvento,
  danosDelEvento,
  mockEventos,
  paquetesDelEvento,
} from '@/mocks/mockSectorial';
import type { EstadoEvento, Evento, Sector } from '@/types/sectorial';

/** Una fila de la lista de desastres, con todo lo que se lee sin abrirla. */
export interface ResumenDesastre {
  evento: Evento;
  /** Municipios afectados por el evento: el denominador del «11 de 24». */
  municipiosAfectados: number;
  /** De cuántos llegó algo, aunque sea sin verificar. */
  municipiosConInformacion: number;
  totalDanos: number;
  /** Informes con daños que todavía no han salido hacia su ministerio. */
  informesPendientes: number;
  /** Informes con daños del evento: el denominador de los pendientes. */
  informesConDanos: number;
  /** Sin declaratoria no hay decreto que citar, y el oficio no se puede remitir. */
  puedeRemitir: boolean;
}

/** Lo que necesita la lista: las filas ya ordenadas y la línea de totales. */
export interface UsoDesastres {
  desastres: readonly ResumenDesastre[];
  /** Desastres que no están cerrados. Son los que todavía piden trabajo. */
  eventosEnCurso: number;
  /** Informes pendientes sumados de todos los desastres en curso. */
  informesPendientes: number;
}

/**
 * Un desastre cerrado no desaparece de la lista: baja al final.
 *
 * Sigue habiendo quien pregunta por él —una entidad que reclama su oficio, una
 * auditoría— y esconderlo obligaría a saberse el código de memoria. Pero
 * tampoco puede competir por la atención con lo que está pasando hoy.
 */
const ORDEN_ESTADO: Record<EstadoEvento, number> = {
  Activo: 0,
  EnRecuperacion: 1,
  Cerrado: 2,
};

/**
 * Ordena por lo que exige atención, no por fecha.
 *
 * Primero lo que sigue abierto y, dentro de eso, el que más informes tiene sin
 * salir: es el que más lejos está de tener su Plan de Acción Específico. La
 * fecha desempata, y solo eso, porque un evento viejo con todo remitido no
 * necesita a nadie.
 */
export function ordenarDesastres(filas: readonly ResumenDesastre[]): ResumenDesastre[] {
  return [...filas].sort((a, b) => {
    const estado = ORDEN_ESTADO[a.evento.estado] - ORDEN_ESTADO[b.evento.estado];
    if (estado !== 0) return estado;

    if (b.informesPendientes !== a.informesPendientes) {
      return b.informesPendientes - a.informesPendientes;
    }

    return b.evento.fechaEvento.localeCompare(a.evento.fechaEvento);
  });
}

/** Arma la fila de un desastre contando sus datos. Ninguna cifra viene escrita. */
function resumirDesastre(evento: Evento): ResumenDesastre {
  const cobertura = resumenCobertura(coberturaDelEvento(evento.id));
  const danos = danosDelEvento(evento.id);
  const paquetes = paquetesDelEvento(evento.id);

  const conDanos = new Set<Sector>();
  for (const dano of danos) {
    if (dano.sector !== null) conDanos.add(dano.sector);
  }

  return {
    evento,
    municipiosAfectados: cobertura.totalMunicipios,
    municipiosConInformacion: cobertura.conInformacion,
    totalDanos: danos.length,
    informesPendientes: contarPendientesDeEnvio(danos, paquetes),
    informesConDanos: paquetes.filter((paquete) => conDanos.has(paquete.sector)).length,
    puedeRemitir: evento.declaratoria !== 'Ninguna',
  };
}

/**
 * La puerta del módulo: todos los desastres que la UNGRD tiene en reparto.
 *
 * El módulo entraba directo al detalle de un evento y se leía como la pantalla
 * de un caso particular. El trabajo real es repartir varios a la vez y decidir
 * cuál se atiende primero, y esa decisión necesita ver la lista entera.
 */
export function useDesastres(): UsoDesastres {
  return useMemo(() => {
    const desastres = ordenarDesastres(mockEventos.map(resumirDesastre));
    const enCurso = desastres.filter(({ evento }) => evento.estado !== 'Cerrado');

    return {
      desastres,
      eventosEnCurso: enCurso.length,
      /* Solo los que siguen abiertos: un pendiente de un evento cerrado ya no
         es trabajo por hacer, y sumarlo inflaría la única cifra con la que el
         funcionario decide si le queda algo por remitir hoy. */
      informesPendientes: enCurso.reduce((total, fila) => total + fila.informesPendientes, 0),
    };
  }, []);
}
