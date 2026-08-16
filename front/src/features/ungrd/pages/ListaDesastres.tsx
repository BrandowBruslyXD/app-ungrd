import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ChevronRight, Inbox, Share2 } from 'lucide-react';
import BandaPortada from '@/components/ui/BandaPortada';
import { FOTOS } from '@/lib/fotos';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import type { EstadoEvento } from '@/types/sectorial';
import { useDesastres, type ResumenDesastre } from '../hooks/useDesastres';
import {
  diasTranscurridos,
  formatearEntero,
  formatearFecha,
  lineaDeclaratoria,
} from '../components/formatoPanel';

/**
 * Los tres momentos del evento, cada uno con su color.
 *
 * Uno en recuperación no es uno activo: sigue pidiendo oficios, pero ya no hay
 * gente esperando la primera respuesta. Pintarlos igual borraría la única
 * diferencia que cambia por dónde se empieza el día.
 */
const CLASES_ESTADO_EVENTO: Record<EstadoEvento, string> = {
  Activo: 'bg-azul-50 text-azul-700',
  EnRecuperacion: 'bg-seguro-50 text-seguro-700',
  Cerrado: 'bg-tinta-100 text-tinta-600',
};

/** Una casilla de cifras de la fila. Etiqueta arriba, dato abajo. */
interface CasillaProps {
  etiqueta: string;
  children: ReactNode;
}

function Casilla({ etiqueta, children }: CasillaProps) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-tinta-500">{etiqueta}</dt>
      <dd className="mt-0.5 font-semibold text-tinta-900">{children}</dd>
    </div>
  );
}

/**
 * Puerta del módulo: **los desastres que la UNGRD tiene en reparto**.
 *
 * Antes se entraba directo al detalle del único evento sembrado, y el módulo se
 * leía como la pantalla de un caso particular. El trabajo de la UNGRD es
 * repartir varias emergencias a la vez y decidir cuál se atiende primero; esa
 * decisión necesita verlas juntas, con lo que cada una tiene sin remitir.
 *
 * Una fila por desastre y la fila entera es el enlace: nada de tarjetas grandes
 * con un botón «ver más» al final. La flecha de la derecha dice que se puede
 * pulsar, que es todo lo que hace falta.
 */
export default function ListaDesastres() {
  const { t } = useTranslation();
  const { desastres, eventosEnCurso, informesPendientes } = useDesastres();

  useTituloPagina(t('ungrd.lista.metaTitulo'), t('ungrd.lista.metaDescripcion'));

  return (
    <div className="animate-fade-in mx-auto w-full max-w-6xl px-4 py-8 lg:px-8 lg:py-10">
      <BandaPortada
        titulo={t('ungrd.lista.titulo')}
        descripcion={t('ungrd.lista.subtitulo')}
        foto={FOTOS.municipioAereo}
        alt="Vista aérea de un municipio colombiano entre montañas."
        icono={Share2}
      />

      {/*
        Una línea con el total, no cuatro tarjetas con iconos: lo único que hay
        que saber antes de escoger un desastre es cuántos siguen abiertos y
        cuánto falta por remitir en todos ellos.
      */}
      <p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-tinta-700">
        <span className="text-lg font-bold text-tinta-900">
          {t('ungrd.lista.resumenEventos', { count: eventosEnCurso })}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {informesPendientes === 0
            ? t('ungrd.lista.resumenAlDia')
            : t('ungrd.lista.resumenPendientes', { count: informesPendientes })}
        </span>
      </p>

      {desastres.length === 0 ? (
        <div className="ficha mt-5 p-8 text-center">
          <Inbox className="mx-auto h-12 w-12 text-tinta-300" aria-hidden="true" />
          <p className="mt-4 text-lg font-bold">{t('ungrd.lista.vaciaTitulo')}</p>
          <p className="mt-2 text-tinta-600">{t('ungrd.lista.vaciaCuerpo')}</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {desastres.map((fila) => (
            <li key={fila.evento.id}>
              <FilaDesastre fila={fila} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Una fila de la lista. Toda ella es el enlace al detalle del desastre. */
function FilaDesastre({ fila }: { fila: ResumenDesastre }) {
  const { t } = useTranslation();
  const { evento } = fila;

  const cerrado = evento.estado === 'Cerrado';
  const pendiente = fila.informesPendientes > 0;

  const ultimoDato =
    evento.ultimoDatoEn === undefined || evento.ultimoDatoEn === null
      ? t('ungrd.lista.sinDatos')
      : ultimoDatoRelativo(evento.ultimoDatoEn, t);

  return (
    <Link
      to={`/gestor/reparto/${evento.codigo}`}
      /* El nombre accesible es corto y dice a dónde va. El resto de la fila se
         sigue leyendo debajo: quien navega con lector no tiene por qué oír
         nueve cifras seguidas antes de saber qué enlace es este. */
      aria-label={t('ungrd.lista.abrir', { evento: evento.nombre })}
      className={`ficha-pulsable group block p-4 sm:p-5 ${cerrado ? 'bg-papel-hueco/40' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* ── Qué es y qué lo ampara ─────────────────────────────────── */}
          <div>
            <p className="font-mono text-sm font-bold text-azul-700">{evento.codigo}</p>
            <p className="mt-1 text-lg font-bold leading-snug text-tinta-900 group-hover:text-azul-700">
              {evento.nombre}
            </p>
            <p className="mt-1 text-sm text-tinta-600">
              {t(`census.eventTypes.${evento.tipoEvento}`)} · {evento.departamentos.join(', ')}
            </p>

            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className={`distintivo ${CLASES_ESTADO_EVENTO[evento.estado]}`}>
                {t(`ungrd.estadoEvento.${evento.estado}`)}
              </span>
              <span className="text-tinta-700">{lineaDeclaratoria(evento, t)}</span>
            </p>
            {/* El decreto es lo que se cita en el oficio; sin él no sale nada,
                y por eso se ve desde la lista y no solo dentro del evento. */}
            <p className="mt-1 text-sm text-tinta-600">
              {evento.numeroDecreto ?? t('ungrd.lista.sinDecreto')}
            </p>
          </div>

          {/* ── Cuánto hay y qué falta ─────────────────────────────────── */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-2">
            <Casilla etiqueta={t('ungrd.lista.etiquetaMunicipios')}>
              <span className="tabular-nums">
                {t('ungrd.lista.municipiosValor', {
                  conInformacion: formatearEntero(fila.municipiosConInformacion),
                  total: formatearEntero(fila.municipiosAfectados),
                })}
              </span>
            </Casilla>

            <Casilla etiqueta={t('ungrd.lista.etiquetaDanos')}>
              <span className="tabular-nums">{formatearEntero(fila.totalDanos)}</span>
            </Casilla>

            <Casilla etiqueta={t('ungrd.lista.etiquetaInicio')}>
              <span className="tabular-nums">{formatearFecha(evento.fechaEvento)}</span>
            </Casilla>

            <Casilla etiqueta={t('ungrd.lista.etiquetaUltimoDato')}>{ultimoDato}</Casilla>

            {/*
              La cifra que ordena la lista, y por eso es la única con color: es
              lo que le queda por hacer al funcionario en este desastre.
            */}
            <Casilla etiqueta={t('ungrd.lista.etiquetaPendientes')}>
              {pendiente ? (
                <span className="tabular-nums text-espera-700">
                  {t('ungrd.lista.pendientesValor', {
                    pendientes: formatearEntero(fila.informesPendientes),
                    total: formatearEntero(fila.informesConDanos),
                  })}
                </span>
              ) : (
                <span className="text-seguro-700">{t('ungrd.lista.sinPendientes')}</span>
              )}
            </Casilla>
          </dl>
        </div>

        <ChevronRight
          className="mt-1 h-6 w-6 shrink-0 text-tinta-300 group-hover:text-azul-600"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

/**
 * «hoy» o «hace 6 días»: lo que distingue un evento que sigue moviéndose de uno
 * que dejó de reportar. Un desastre sin datos nuevos no es uno resuelto.
 */
function ultimoDatoRelativo(iso: string, t: TFunction): string {
  const dias = diasTranscurridos(iso);
  return dias === 0
    ? t('ungrd.lista.ultimoDatoHoy')
    : t('ungrd.lista.ultimoDatoDias', { count: dias });
}
