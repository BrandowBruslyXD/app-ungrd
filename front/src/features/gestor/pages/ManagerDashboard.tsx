import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Satellite,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Building2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TFunction } from 'i18next';
import { listReportes } from '@/api/reportes';
import { SeverityBadge } from '@/components/shared/StatusBadge';
import EmergencyIcon from '@/components/shared/EmergencyIcon';
import TrustBadge from '@/components/shared/TrustBadge';
import BandaPortada from '@/components/ui/BandaPortada';
import { FOTOS } from '@/lib/fotos';
import MapaUbicacion, { type PuntoMapa, type TonoMarcador } from '@/components/ui/MapaUbicacion';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import type { Prioridad, Report, ReportStatus } from '@/types';

/** Prioridad del contrato → color del marcador y de la leyenda. */
const TONO_POR_PRIORIDAD: Record<Prioridad, TonoMarcador> = {
  Alta: 'alta',
  Media: 'media',
  Baja: 'baja',
};

const LEYENDA: readonly { clave: Prioridad; color: string }[] = [
  { clave: 'Alta', color: 'bg-alerta-600' },
  { clave: 'Media', color: 'bg-espera-600' },
  { clave: 'Baja', color: 'bg-seguro-600' },
];

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
  const reportes = listReportes();

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
  const indicadores: { etiqueta: string; valor: number; icono: LucideIcon; clases: string }[] = [
    {
      etiqueta: t('manager.statReports'),
      valor: reportes.length,
      icono: TrendingUp,
      clases: 'text-azul-600 bg-azul-50',
    },
    {
      etiqueta: t('manager.statActive'),
      valor: reportes.filter((r) => r.status !== 'Cerrado' && r.status !== 'Atendido').length,
      icono: AlertTriangle,
      clases: 'text-alerta-600 bg-alerta-50',
    },
    {
      etiqueta: t('manager.statAttended'),
      valor: reportes.filter((r) => r.status === 'Atendido' || r.status === 'Cerrado').length,
      icono: CheckCircle2,
      clases: 'text-seguro-600 bg-seguro-50',
    },
    {
      etiqueta: t('manager.statToVerify'),
      valor: reportes.filter((r) => r.status === 'Reportado').length,
      icono: Satellite,
      clases: 'text-oro-800 bg-oro-50',
    },
  ];

  const puntosMapa = useMemo<PuntoMapa[]>(
    () =>
      reportes
        .filter((r) => r.coordinates.lat !== 0 || r.coordinates.lng !== 0)
        .map((r) => ({
          id: r.id,
          lat: r.coordinates.lat,
          lng: r.coordinates.lng,
          titulo: r.title,
          detalle: r.location,
          tono: TONO_POR_PRIORIDAD[r.prioridad],
        })),
    [reportes],
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

      {/* ── Indicadores ──────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicadores.map(({ etiqueta, valor, icono: Icono, clases }) => (
          <div key={etiqueta} className="ficha min-w-0 p-4">
            <span
              className={`inline-flex h-10 w-10 items-center justify-center rounded-control ${clases}`}
            >
              <Icono className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-2 text-2xl font-bold text-tinta-900">{valor}</p>
            <p className="text-sm leading-snug text-tinta-600">{etiqueta}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* ── Mapa operativo ─────────────────────────────────────────────
            Antes eran cuatro puntos en posiciones fijas de CSS, dos de ellos
            parpadeando, sobre un degradado gris. No era un mapa: era el dibujo
            de un mapa. Ahora cada marcador está donde ocurrió el reporte, con
            el color de su prioridad, y al tocarlo dice cuál es. */}
        <section className="lg:col-span-1">
          <h2 className="mb-3 text-lg">{t('manager.opsMap')}</h2>
          <div className="ficha overflow-hidden">
            {puntosMapa.length > 0 ? (
              <MapaUbicacion valor={null} marcadores={puntosMapa} alto="h-64 lg:h-80" />
            ) : (
              <p className="flex h-64 items-center justify-center p-6 text-center text-tinta-500 lg:h-80">
                {t('manager.mapEmpty')}
              </p>
            )}
            <div className="border-t border-papel-borde bg-papel-hueco p-3">
              <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {LEYENDA.map(({ clave, color }) => (
                  <li key={clave} className="flex items-center gap-1.5">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${color}`} aria-hidden="true" />
                    {t(`prioridad.${clave}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Tablero de triaje ──────────────────────────────────────────
            En móvil son secciones plegables, una debajo de otra. Desde `lg`
            son columnas con desplazamiento horizontal, cada una con ancho
            mínimo para que la tarjeta de adentro no se estruje. */}
        <section className="lg:col-span-2">
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
    </div>
  );
}
