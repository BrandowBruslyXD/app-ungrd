import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Landmark, Layers, MapPinned, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import BandaPortada from '@/components/ui/BandaPortada';
import { FOTOS } from '@/lib/fotos';
import { resumenCobertura } from '@/lib/sectorial';
import { mockCobertura, mockDanos, mockEnvios, mockEvento, mockPaquetes } from '@/mocks/mockSectorial';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import type { DanoSectorizado, Sector } from '@/types/sectorial';
import CoberturaTerritorial from '../components/CoberturaTerritorial';
import RepartoPorSector from '../components/RepartoPorSector';
import BandejaSinClasificar from '../components/BandejaSinClasificar';
import BitacoraEnvios from '../components/BitacoraEnvios';
import EntradaDeDatos from '../components/graficas/EntradaDeDatos';
import {
  diasTranscurridos,
  formatearEntero,
  formatearFecha,
  formatearMillones,
} from '../components/formatoPanel';

/** Una casilla del bloque de datos del evento. */
interface DatoEvento {
  etiqueta: string;
  valor: string;
}

/**
 * Pantalla A · Panel del evento — el reparto sectorial de la UNGRD.
 *
 * Los cuatro subpaneles van en este orden porque responden, de arriba abajo, a
 * las cuatro preguntas que el funcionario se hace al abrir el sistema: qué tan
 * completo es lo que sé, qué le toca a cada quién, qué me falta resolver antes
 * de enviar y qué ya salió. El orden no es decorativo
 * (`docs/REPARTO-SECTORIAL.md`).
 *
 * Las cuatro gráficas cuelgan de ese mismo orden y cada una vive donde está el
 * dato que dibuja, para que la gráfica y la tabla de su subpanel no puedan
 * contar cosas distintas:
 *
 * - `BarraCobertura` y `EntradaDeDatos`, en el subpanel A.
 * - `DanoPorSector` y `ConfianzaPorSector`, en el subpanel B, encima de las
 *   trece filas.
 */
export default function PanelUngrd() {
  const { t } = useTranslation();
  const evento = mockEvento;

  useTituloPagina(t('meta.ungrd.title'), t('meta.ungrd.description'));

  /*
   * Los daños viven en estado porque el subpanel C los reclasifica.
   *
   * No hay backend todavía: la corrección se guarda en memoria y se pierde al
   * recargar. Es deliberado y preferible a fingir que se guardó —el punto de la
   * pantalla es que el reparto se recalcula en el momento, no que persista—.
   */
  const [danos, setDanos] = useState<readonly DanoSectorizado[]>(mockDanos);

  const sinClasificar = useMemo(() => danos.filter((dano) => dano.sector === null), [danos]);
  const cobertura = useMemo(() => resumenCobertura(mockCobertura), []);

  /*
   * Las cuatro cifras salen de contar los datos que hay, nunca están escritas.
   *
   * Un tablero de gestión que muestra números que nadie midió es peor que uno
   * vacío: aquí el funcionario decide a qué municipio llama y qué le manda a un
   * ministerio con esos números delante.
   */
  const costoEstimado = useMemo(
    () => danos.reduce((total, dano) => total + (dano.costoEstimado ?? 0), 0),
    [danos],
  );

  const indicadores: { etiqueta: string; valor: string; icono: LucideIcon; clases: string }[] = [
    {
      // «11 de 24» es el dolor entero en una cifra: de los municipios afectados,
      // de cuántos sabemos algo.
      etiqueta: t('ungrd.panel.indMunicipios'),
      valor: t('ungrd.panel.deTotal', {
        valor: formatearEntero(cobertura.conInformacion),
        total: formatearEntero(cobertura.totalMunicipios),
      }),
      icono: MapPinned,
      clases: 'text-alerta-600 bg-alerta-50',
    },
    {
      etiqueta: t('ungrd.panel.indDanos'),
      valor: formatearEntero(danos.length),
      icono: Layers,
      clases: 'text-azul-600 bg-azul-50',
    },
    {
      // Del evento, no de la suma de los daños: un mismo hogar aparece en
      // vivienda, agua y energía, y sumarlo lo contaría tres veces.
      etiqueta: t('ungrd.panel.indPersonas'),
      valor: formatearEntero(evento.personasAfectadas),
      icono: Users,
      clases: 'text-espera-600 bg-espera-50',
    },
    {
      etiqueta: t('ungrd.panel.indCosto'),
      valor: t('ungrd.panel.pesosMillones', { valor: formatearMillones(costoEstimado) }),
      icono: Coins,
      clases: 'text-oro-800 bg-oro-50',
    },
  ];

  const declaratoria =
    evento.declaratoria === 'Ninguna'
      ? t('ungrd.declaratoria.Ninguna')
      : t('ungrd.panel.declaratoriaLinea', {
          tipo: t(`ungrd.declaratoria.${evento.declaratoria}`),
          nivel:
            evento.nivelDeclaratoria === undefined
              ? t('ungrd.panel.sinDato')
              : t(`ungrd.nivelDeclaratoria.${evento.nivelDeclaratoria}`),
        });

  const datosEvento: DatoEvento[] = [
    { etiqueta: t('ungrd.panel.datoCodigo'), valor: evento.codigo },
    { etiqueta: t('ungrd.panel.datoTipo'), valor: t(`census.eventTypes.${evento.tipoEvento}`) },
    { etiqueta: t('ungrd.panel.datoDeclaratoria'), valor: declaratoria },
    {
      etiqueta: t('ungrd.panel.datoDecreto'),
      valor: evento.numeroDecreto ?? t('ungrd.panel.sinDato'),
    },
    {
      etiqueta: t('ungrd.panel.datoFechaDeclaratoria'),
      valor:
        evento.fechaDeclaratoria === undefined
          ? t('ungrd.panel.sinDato')
          : formatearFecha(evento.fechaDeclaratoria),
    },
    { etiqueta: t('ungrd.panel.datoDepartamentos'), valor: evento.departamentos.join(' · ') },
    {
      etiqueta: t('ungrd.panel.datoEstadoEvento'),
      valor: t(`ungrd.estadoEvento.${evento.estado}`),
    },
  ];

  const dias =
    evento.fechaDeclaratoria === undefined ? null : diasTranscurridos(evento.fechaDeclaratoria);

  function asignarSector(danoId: string, sector: Sector): void {
    setDanos((previos) =>
      previos.map((dano) =>
        dano.id === danoId ? { ...dano, sector, clasificadoPor: 'Funcionario' } : dano,
      ),
    );
  }

  return (
    <div className="animate-fade-in mx-auto w-full max-w-6xl px-4 py-8 lg:px-8 lg:py-10">
      {/* ── Encabezado del evento ────────────────────────────────────────── */}
      <BandaPortada
        titulo={evento.nombre}
        descripcion={t('ungrd.panel.subtitulo')}
        foto={FOTOS.puebloJerico}
        alt="Vista de Jericó, Antioquia, con la iglesia sobre los tejados del pueblo."
        icono={Landmark}
      >
        {/*
          El contador de días no es un adorno: el Plan de Acción Específico
          tarda cerca de un mes en consolidarse y hoy nadie ve cuánto lleva
          corriendo el plazo.
        */}
        {dias !== null && (
          <div className="rounded-ficha bg-white/10 px-5 py-4 text-center">
            <p className="text-4xl font-bold tabular-nums text-oro-400">{dias}</p>
            <p className="mt-1 max-w-[10rem] text-sm leading-snug text-azul-100">
              {t('ungrd.panel.diasDeclaratoria')}
            </p>
          </div>
        )}
      </BandaPortada>

      <dl className="ficha mt-4 grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
        {datosEvento.map(({ etiqueta, valor }) => (
          <div key={etiqueta} className="min-w-0">
            <dt className="text-sm text-tinta-500">{etiqueta}</dt>
            <dd className="mt-0.5 font-semibold text-tinta-900">{valor}</dd>
          </div>
        ))}
      </dl>

      {/* ── Cuatro indicadores ───────────────────────────────────────────── */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <h2 className="solo-lector">{t('ungrd.panel.indicadoresTitulo')}</h2>
        {indicadores.map(({ etiqueta, valor, icono: Icono, clases }) => (
          <div key={etiqueta} className="ficha min-w-0 p-4">
            <span
              className={`inline-flex h-10 w-10 items-center justify-center rounded-control ${clases}`}
            >
              <Icono className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-2 text-2xl font-bold leading-tight text-tinta-900">{valor}</p>
            <p className="mt-1 text-sm leading-snug text-tinta-600">{etiqueta}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 space-y-8">
        {/*
          La entrada de datos cierra el subpanel A y no abre el B.

          A responde «qué tan completo es lo que sé», y eso tiene dos caras: de
          qué municipios no ha llegado nada —el mapa— y desde cuándo no llega
          —el tiempo—. Leídas seguidas, la segunda explica la primera: si la
          curva se aplana mientras quedan municipios callados, el problema no es
          que no haya daños, es que nadie está reportando, y la acción es la
          misma llamada que pide la tabla de arriba. Puesta al abrir el B
          separaría ese par y retrasaría el reparto, que es otra pregunta.
        */}
        <CoberturaTerritorial
          cobertura={mockCobertura}
          cierre={
            <EntradaDeDatos
              danos={danos}
              desde={evento.fechaDeclaratoria}
              municipiosEnSilencio={cobertura.enSilencio}
            />
          }
        />
        <RepartoPorSector danos={danos} paquetes={mockPaquetes} />
        <BandejaSinClasificar danos={sinClasificar} onAsignar={asignarSector} />
        <BitacoraEnvios envios={mockEnvios} />
      </div>
    </div>
  );
}
