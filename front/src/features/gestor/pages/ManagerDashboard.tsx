import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Satellite, ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import type { TFunction } from 'i18next';
import { listReportes } from '@/api/reportes';
import { SeverityBadge } from '@/components/shared/StatusBadge';
import EmergencyIcon from '@/components/shared/EmergencyIcon';
import TrustBadge from '@/components/shared/TrustBadge';
import BandaPortada from '@/components/ui/BandaPortada';
import { FOTOS } from '@/lib/fotos';
import { fechaImagenGibs } from '@/lib/capasMapa';
import MapaObservacion, {
  type MarcadorReporte,
  type TonoReporte,
} from '@/features/gestor/components/MapaObservacion';
import FranjaSenales from '@/features/gestor/components/FranjaSenales';
import { useObservacionExterna } from '@/features/gestor/hooks/useObservacionExterna';
import {
  cruzar,
  senalDeAlerta,
  senalDeSismo,
  type PuntoReporte,
  type SenalGeolocalizada,
} from '@/features/gestor/lib/cruce';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import type { Prioridad, Report, ReportStatus } from '@/types';

/** Prioridad del contrato → color de la chincheta y de la leyenda. */
const TONO_POR_PRIORIDAD: Record<Prioridad, TonoReporte> = {
  Alta: 'alta',
  Media: 'media',
  Baja: 'baja',
};

function tiempoTranscurrido(iso: string, t: TFunction): string {
  const horas = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (horas < 1) return t('time.lessThanOneHourShort');
  if (horas < 24) return t('time.hoursShort', { hours: horas });
  return t('time.days', { days: Math.floor(horas / 24) });
}

/**
 * Tarjeta de un reporte dentro del tablero.
 *
 * Lleva tres distintivos, no cinco. El estado se quitó porque **es la columna
 * en la que está**: repetirlo gastaba el ancho que necesitaba el título. Y el
 * nivel de confianza va compacto («4/4» con su icono) porque «Avalado por
 * CMGRD» a tamaño completo no cabe en una columna de tablero y terminaba
 * saliéndose de la tarjeta.
 */
function TarjetaReporte({ reporte }: { reporte: Report }) {
  const { t } = useTranslation();

  return (
    <Link
      to={`/reporte/${reporte.id}`}
      className="ficha-pulsable block min-w-0 p-3"
      title={reporte.title}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <EmergencyIcon type={reporte.type} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-semibold leading-snug text-tinta-900">{reporte.title}</p>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
            <SeverityBadge severity={reporte.prioridad} />
            <TrustBadge level={reporte.trustLevel} compacto />
            {reporte.satelliteVerified && (
              <span className="distintivo bg-seguro-50 text-seguro-700" title={t('manager.satelliteOk')}>
                <Satellite className="h-4 w-4 shrink-0" aria-hidden="true" />
              </span>
            )}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-tinta-500">
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            {tiempoTranscurrido(reporte.createdAt, t)}
          </p>
        </div>
      </div>
    </Link>
  );
}

/** Una columna del tablero, plegable en móvil. */
function ColumnaTriaje({
  etiqueta,
  reportes,
  abiertaPorDefecto,
}: {
  etiqueta: string;
  reportes: Report[];
  abiertaPorDefecto: boolean;
}) {
  const { t } = useTranslation();
  const [abierta, setAbierta] = useState(abiertaPorDefecto);

  return (
    <div className="ficha overflow-hidden lg:min-w-0 lg:flex-1">
      <button
        type="button"
        onClick={() => setAbierta(!abierta)}
        aria-expanded={abierta}
        className="flex min-h-[3rem] w-full items-center justify-between gap-2 px-3 text-left hover:bg-tinta-50 lg:pointer-events-none"
      >
        <span className="min-w-0 truncate font-bold text-tinta-900">{etiqueta}</span>
        <span className="flex items-center gap-2">
          <span className="distintivo bg-azul-600 text-white">{reportes.length}</span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-tinta-400 transition-transform lg:hidden ${abierta ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </span>
      </button>

      <div className={`${abierta ? 'block' : 'hidden'} border-t border-papel-borde p-2 lg:block`}>
        {reportes.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-tinta-400">{t('manager.emptyColumn')}</p>
        ) : (
          <div className="space-y-2">
            {reportes.map((reporte) => (
              <TarjetaReporte key={reporte.id} reporte={reporte} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const { t } = useTranslation();

  /*
   * Se leen una sola vez por visita. Antes se releían en cada render y eso, con
   * el mapa de por medio, significaba una lista nueva cada vez: los marcadores
   * se volvían a pintar y el encuadre saltaba al llegar la respuesta de USGS.
   */
  const reportes = useMemo(() => listReportes(), []);
  const { sismos, alertas, cargando } = useObservacionExterna();

  // La fecha se fija al montar: si cambiara sola, Leaflet recargaría todas las
  // teselas mientras el gestor está mirando el mapa.
  const fechaSatelite = useMemo(() => fechaImagenGibs(), []);
  const [sateliteVivo, setSateliteVivo] = useState(true);

  useTituloPagina(t('meta.manager.title'), t('meta.manager.description'));

  const columnas: { estado: ReportStatus; etiqueta: string }[] = [
    { estado: 'Reportado', etiqueta: t('manager.colReported') },
    { estado: 'Verificado', etiqueta: t('manager.colVerified') },
    { estado: 'Asignado', etiqueta: t('manager.colAssigned') },
    { estado: 'EnAtencion', etiqueta: t('manager.colInCare') },
    { estado: 'Atendido', etiqueta: t('manager.colAttended') },
    { estado: 'Cerrado', etiqueta: t('manager.colClosed') },
  ];

  /*
   * Cifras calculadas sobre los reportes que hay, no escritas a mano.
   *
   * Las anteriores («1.247 reportes», «2h 14m de respuesta», «47 recursos»)
   * estaban puestas en el archivo de textos como si fueran datos. Un tablero de
   * gestión que muestra números que nadie midió es peor que uno vacío: el
   * funcionario toma decisiones con ellos.
   */
  const activas = reportes.filter((r) => r.status !== 'Cerrado' && r.status !== 'Atendido').length;
  const cerradas = reportes.length - activas;
  const porVerificar = reportes.filter((r) => r.status === 'Reportado').length;

  /*
   * Una sola cifra manda y las demás la acompañan.
   *
   * Antes eran cuatro tarjetas idénticas con el número a 48 px: cuatro
   * protagonistas es ninguno, y el funcionario tenía que leer las cuatro para
   * saber si le tocaba hacer algo. Lo que le importa al abrir el panel es
   * cuántas emergencias siguen abiertas; el resto es contexto de esa cifra.
   */
  const acompanantes: { etiqueta: string; valor: number; alerta?: boolean }[] = [
    { etiqueta: t('manager.statToVerify'), valor: porVerificar, alerta: porVerificar > 0 },
    { etiqueta: t('manager.statAttended'), valor: cerradas },
    { etiqueta: t('manager.statReports'), valor: reportes.length },
  ];

  /*
   * Un reporte sin coordenadas llega con `0,0`, que es un punto en el Atlántico
   * frente a África. Pintarlo ahí no sería un error de estilo: sería mandar a
   * alguien a un sitio equivocado.
   */
  const ubicados = useMemo(
    () => reportes.filter((r) => r.coordinates.lat !== 0 || r.coordinates.lng !== 0),
    [reportes],
  );

  /*
   * ── El cruce ────────────────────────────────────────────────────────────
   * Un sismo del USGS y un reporte ciudadano en el mismo punto se confirman el
   * uno al otro; una señal sin ningún reporte cerca es una emergencia que nadie
   * ha reportado todavía. Las dos lecturas salen del mismo cálculo.
   */
  const senales = useMemo<SenalGeolocalizada[]>(
    () => [...sismos.map(senalDeSismo), ...alertas.map(senalDeAlerta)],
    [sismos, alertas],
  );

  const cruce = useMemo(() => {
    const puntos: PuntoReporte[] = ubicados.map((r) => ({
      id: r.id,
      latitud: r.coordinates.lat,
      longitud: r.coordinates.lng,
    }));

    return cruzar(puntos, senales);
  }, [ubicados, senales]);

  const marcadores = useMemo<MarcadorReporte[]>(
    () =>
      ubicados.map((r) => ({
        id: r.id,
        latitud: r.coordinates.lat,
        longitud: r.coordinates.lng,
        titulo: r.title,
        detalle: r.location,
        tono: TONO_POR_PRIORIDAD[r.prioridad],
        // Se listan los nombres de las fuentes, sin repetir: dos sismos del USGS
        // cerca del mismo reporte no son dos corroboraciones distintas.
        corroboradoPor: [
          ...new Set(
            (cruce.corroboracionPorReporte.get(r.id) ?? []).map((senal) => senal.fuente),
          ),
        ],
      })),
    [ubicados, cruce],
  );

  return (
    <div className="animate-fade-in mx-auto w-full max-w-6xl px-4 py-8 lg:px-8 lg:py-10">
      <div className="mb-7">
        <BandaPortada
          titulo={t('manager.title')}
          descripcion={t('manager.subtitle')}
          foto={FOTOS.municipioAereo}
          alt="Vista aérea de Barichara, Santander, entre montañas."
          icono={Building2}
        />
      </div>

      {/* ── Indicadores ──────────────────────────────────────────────────────
          Una franja, no cuatro tarjetas: la cifra que exige acción a la
          izquierda y el contexto a la derecha, separado por filetes de 1 px. Sin
          iconos en cuadros de color — no aportaban ningún dato y son el adorno
          que hace que un tablero parezca hecho en serie. */}
      <section className="ficha flex flex-wrap items-stretch gap-y-4 px-5 py-4">
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-sm text-tinta-600">{t('manager.statActive')}</p>
          <p className="mt-0.5 flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums leading-none text-tinta-900">
              {activas}
            </span>
            <span className="text-sm text-tinta-500">
              {t('manager.deTotal', { total: reportes.length })}
            </span>
          </p>
          {/* El avance del municipio, sin inventar un porcentaje: la barra ES la proporción. */}
          <div
            className="mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-neutro-200"
            role="img"
            aria-label={t('manager.avanceAria', { cerradas, total: reportes.length })}
          >
            <span className="bg-alerta-600" style={{ flex: activas || 0.001 }} />
            <span className="bg-seguro-600" style={{ flex: cerradas || 0.001 }} />
          </div>
        </div>

        <dl className="flex flex-1 flex-wrap items-center justify-end gap-x-6 gap-y-3 sm:flex-nowrap">
          {acompanantes.map(({ etiqueta, valor, alerta }) => (
            <div
              key={etiqueta}
              className="min-w-0 border-l border-neutro-200 pl-6 first:border-l-0 first:pl-0 sm:first:border-l sm:first:pl-6"
            >
              <dd className="flex items-center gap-1.5 text-2xl font-semibold tabular-nums leading-none text-tinta-900">
                {alerta && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-alerta-600"
                    aria-hidden="true"
                  />
                )}
                {valor}
              </dd>
              <dt className="mt-1 whitespace-nowrap text-sm text-tinta-600">{etiqueta}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Observación del territorio ──────────────────────────────────────
          El mapa es el protagonista de la pantalla y las tres fuentes van
          **dentro** de él, no al lado: el valor no está en enseñar tres logos,
          está en que un sismo del USGS y un reporte ciudadano caigan en el mismo
          punto y se confirmen. */}
      <section className="mt-8">
        {/* La procedencia va junto al título y no escondida bajo el mapa: es lo que
            convierte una imagen bonita en un dato que alguien puede ir a verificar. */}
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lg">{t('manager.observacion.tituloMapa')}</h2>
          <p className="text-sm text-tinta-600">{t('manager.observacion.procedencia')}</p>
        </div>

        <div className="ficha overflow-hidden">
          <MapaObservacion
            reportes={marcadores}
            sismos={sismos}
            alertas={alertas}
            fechaSatelite={fechaSatelite}
            onSateliteCaido={() => setSateliteVivo(false)}
          />
        </div>

        {marcadores.length === 0 && (
          <p className="mt-2 text-sm text-tinta-600">{t('manager.mapEmpty')}</p>
        )}
      </section>

      <FranjaSenales
        sismos={sismos}
        alertas={alertas}
        senalesSinReporte={cruce.senalesSinReporte}
        fechaSatelite={fechaSatelite}
        sateliteVivo={sateliteVivo}
        cargando={cargando}
      />

      {/* ── Tablero de triaje ───────────────────────────────────────────────
          En móvil son secciones plegables, una debajo de otra. Desde `lg` son
          columnas con desplazamiento horizontal, cada una con ancho mínimo para
          que la tarjeta de adentro no se estruje. */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg">{t('manager.triageBoard')}</h2>

        <div className="space-y-2 lg:flex lg:space-x-3 lg:space-y-0 lg:overflow-x-auto lg:pb-2">
          {columnas.map(({ estado, etiqueta }, indice) => (
            <div key={estado} className="lg:w-60 lg:shrink-0">
              <ColumnaTriaje
                etiqueta={etiqueta}
                reportes={reportes.filter((r) => r.status === estado)}
                abiertaPorDefecto={indice === 0}
              />
            </div>
          ))}
        </div>

        <Link
          to="/alertas"
          className="ficha-pulsable mt-4 flex items-center gap-3 p-4 font-semibold text-azul-700"
        >
          {t('manager.seeAlerts')}
          <ChevronRight className="ml-auto h-5 w-5 shrink-0" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
