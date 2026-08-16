import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, HandHeart, Bell, ChevronRight, MapPin, FileText, Check } from 'lucide-react';
import { listAlertas, listMisReportes, listReportes } from '@/api/reportes';
import { StatusBadge } from '@/components/shared/StatusBadge';
import EmergencyIcon from '@/components/shared/EmergencyIcon';
import Aviso from '@/components/ui/Aviso';
import Ficha from '@/components/ui/Ficha';
import MapaUbicacion, { type PuntoMapa } from '@/components/ui/MapaUbicacion';
import BandaPortada from '@/components/ui/BandaPortada';
import { FOTOS } from '@/lib/fotos';
import { useTituloPagina } from '@/hooks/useTituloPagina';

/**
 * Inicio del ciudadano.
 *
 * Reescrito alrededor de una idea: quien abre esto quiere hacer **una** cosa, y
 * casi siempre es reportar. Por eso hay una sola acción grande y el resto viene
 * después.
 *
 * Se quitaron tres cosas del diseño anterior, todas por el mismo motivo —
 * presentaban como reales datos que nadie ha medido:
 *
 * - **«1.247 reportes atendidos · 94% verificados · $2.1B rastreados».** Cifras
 *   inventadas mostradas como hechos. En una herramienta pública eso no se hace,
 *   y en la demostración es lo primero que un jurado pincha.
 * - **«Respuesta: 2h 14min».** Igual: nadie ha medido eso.
 * - **El mapa de adorno con puntos que parpadeaban** en posiciones fijas de CSS.
 *   Ahora hay un mapa de verdad con las emergencias donde están.
 */
export default function CitizenDashboard() {
  const { t } = useTranslation();
  const mios = listMisReportes().slice(0, 3);
  const alertas = listAlertas().filter((a) => a.active);
  const alertaGrave = alertas.find((a) => a.prioridad === 'Alta');

  useTituloPagina(t('meta.citizenHome.title'), t('meta.citizenHome.description'));

  // Se memoriza porque `MapaUbicacion` reencuadra el mapa cada vez que cambia el
  // arreglo, y sin esto lo haría en cada renderizado.
  const puntos = useMemo<PuntoMapa[]>(
    () =>
      listReportes()
        .filter((r) => r.coordinates.lat !== 0 || r.coordinates.lng !== 0)
        .map((r) => ({ id: r.id, lat: r.coordinates.lat, lng: r.coordinates.lng, titulo: r.title })),
    [],
  );

  return (
    <div className="animate-fade-in mx-auto max-w-3xl px-4 py-8 lg:py-12">
      {/* ── La acción ────────────────────────────────────────────────────── */}
      <BandaPortada
        titulo={t('citizen.heroTitle')}
        descripcion={t('citizen.heroSubtitle')}
        foto={FOTOS.viaRuralVerde}
        alt="Camino destapado entre laderas verdes en zona rural de Colombia."
      >
        <Link to="/reportar" className="btn-accent min-h-control-lg w-full px-8 text-lg lg:w-auto">
          <FileText className="h-7 w-7" aria-hidden="true" />
          {t('citizen.reportEmergency')}
        </Link>
      </BandaPortada>

      {/* ── Alerta grave, si la hay ──────────────────────────────────────── */}
      {alertaGrave && (
        <section className="mt-7">
          <Link to="/alertas" className="block rounded-r-ficha">
            <Aviso tono="alerta" titulo={t('citizen.criticalAlert')}>
              <p className="font-semibold">{alertaGrave.title}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                {alertaGrave.location}
              </p>
            </Aviso>
          </Link>
        </section>
      )}

      {/* ── Mapa de la zona ──────────────────────────────────────────────── */}
      {puntos.length > 0 && (
        <section className="mt-8">
          <Ficha titulo={t('citizen.zoneMap')} sinRelleno>
            <MapaUbicacion valor={null} marcadores={puntos} alto="h-72 sm:h-80" />
          </Ficha>
        </section>
      )}

      {/* ── Mis reportes ─────────────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-xl">{t('citizen.myReportsRecent')}</h2>
          <Link
            to="/mis-reportes"
            className="font-bold text-azul-600 underline underline-offset-4 hover:text-azul-700"
          >
            {t('citizen.seeAll')}
          </Link>
        </div>

        {mios.length === 0 ? (
          <div className="ficha p-6 text-center text-tinta-600">{t('citizen.noReportsYet')}</div>
        ) : (
          <ul className="space-y-2">
            {mios.map((reporte) => (
              <li key={reporte.id}>
                <Link
                  to={`/reporte/${reporte.id}`}
                  className="ficha-pulsable group flex items-center gap-3 p-4"
                >
                  <EmergencyIcon type={reporte.type} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="break-all font-mono text-sm font-bold text-azul-700">
                      {reporte.id}
                    </p>
                    <p className="mt-0.5 font-semibold leading-snug group-hover:text-azul-700">
                      {reporte.title}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={reporte.status} />
                    </div>
                  </div>
                  <ChevronRight
                    className="h-6 w-6 shrink-0 text-tinta-300 group-hover:text-azul-600"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Otros accesos ────────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="mb-3 text-xl">{t('citizen.quickAccess')}</h2>
        <div className="space-y-2">
          <Link to="/ayudas" className="ficha-pulsable group flex items-center gap-4 p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control bg-seguro-50 text-seguro-600">
              <HandHeart className="h-7 w-7" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold group-hover:text-azul-700">
                {t('citizen.availableAid')}
              </span>
              <span className="mt-0.5 block text-tinta-600">{t('citizen.availableAidDesc')}</span>
            </span>
            <ChevronRight className="h-6 w-6 shrink-0 text-tinta-300" aria-hidden="true" />
          </Link>

          <Link to="/alertas" className="ficha-pulsable group flex items-center gap-4 p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control bg-espera-50 text-espera-600">
              <Bell className="h-7 w-7" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold group-hover:text-azul-700">
                {t('citizen.activeAlerts')}
              </span>
              <span className="mt-0.5 block text-tinta-600">{t('citizen.activeAlertsDesc')}</span>
            </span>
            {alertas.length > 0 && (
              <span className="distintivo shrink-0 bg-alerta-600 text-white">{alertas.length}</span>
            )}
            <ChevronRight className="h-6 w-6 shrink-0 text-tinta-300" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ── Qué nos hace distintos ───────────────────────────────────────── */}
      <section className="mt-8">
        <Ficha titulo={t('citizen.differenceTitle')} icono={Sparkles}>
          <ul className="space-y-3">
            {['diff1', 'diff2', 'diff3'].map((clave) => (
              <li key={clave} className="flex items-start gap-3">
                <Check
                  className="mt-1 h-5 w-5 shrink-0 text-seguro-600"
                  strokeWidth={3}
                  aria-hidden="true"
                />
                <span className="leading-relaxed">{t(`citizen.${clave}`)}</span>
              </li>
            ))}
          </ul>
        </Ficha>
      </section>
    </div>
  );
}
