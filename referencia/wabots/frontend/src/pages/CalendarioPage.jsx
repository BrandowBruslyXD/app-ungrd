import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getEvents } from '../lib/calendarApi';
import { listTenants } from '../lib/tenantsApi';
import TimeAgo from '../components/TimeAgo';
import { useAsync } from '../hooks/useAsync';

const TZ = 'America/Bogota';
const REFRESH_MS = 30000; // auto-refresh cada 30s

// Clave de día (yyyy-mm-dd) en zona Bogotá, para agrupar eventos por fecha.
function dayKey(iso) {
  if (!iso) return 'sin-fecha';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'sin-fecha';
  // en-CA produce yyyy-mm-dd, estable para agrupar.
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

// Fecha legible en español (ej. "lunes, 23 de junio de 2026").
function fmtFecha(iso) {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Sin fecha';
  return d.toLocaleDateString('es-CO', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Hora legible (ej. "10:30 a. m."). allDay → sin hora.
function fmtHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-CO', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Visor de Google Calendar: próximas citas por plataforma o empresa.
export default function CalendarioPage() {
  // Fuente seleccionada: 'platform' o el id de un tenant.
  const [selected, setSelected] = useState('platform');

  // Lista de empresas para el selector (si falla, solo se muestra "Plataforma").
  const { data: tenantsData } = useAsync(listTenants, []);
  const tenants = Array.isArray(tenantsData) ? tenantsData : [];

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // error de red del propio fetch
  const [backendError, setBackendError] = useState(null); // error reportado por Google/backend
  const [lastUpdated, setLastUpdated] = useState(null);

  const timerRef = useRef(null);

  // Construye los parámetros del fetch según la fuente seleccionada.
  const fetchParams = useMemo(() => {
    if (selected === 'platform') return { source: 'platform', max: 20 };
    if (selected === 'platformOauth') return { source: 'platformOauth', max: 20 };
    return { source: 'tenant', tenantId: selected, max: 20 };
  }, [selected]);

  // Carga los eventos (manual o por auto-refresh). silent = no mostrar spinner.
  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await getEvents(fetchParams);
        setEvents(Array.isArray(data) ? data : []);
        setBackendError(data?.__error || null);
        setLastUpdated(Date.now());
      } catch (e) {
        setError(e?.response?.data?.message || 'No se pudieron cargar las citas');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fetchParams],
  );

  // Re-carga al cambiar de fuente y arma el auto-refresh cada 30s.
  // No se usa useAsync aquí: el polling silencioso (sin spinner) requiere
  // control manual del intervalo y del flag `silent`. Con la pestaña oculta
  // no se lanza el refresh; al volver a ser visible se refresca de inmediato.
  useEffect(() => {
    load(false);
    timerRef.current = setInterval(() => {
      if (!document.hidden) load(true);
    }, REFRESH_MS);
    const onVisibility = () => {
      if (!document.hidden) load(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  // Agrupa los eventos por día (ya vienen ordenados por startTime del backend).
  const grupos = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      const k = dayKey(ev.start);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(ev);
    }
    return Array.from(map.entries());
  }, [events]);

  const nombreFuente =
    selected === 'platform'
      ? 'Plataforma (cuenta de servicio)'
      : selected === 'platformOauth'
        ? 'Google conectado (OAuth)'
        : tenants.find((t) => t.id === selected)?.name || 'Empresa';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Calendario</h1>
          <p className="text-sm text-slate-500">
            Próximas citas agendadas en Google Calendar
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {lastUpdated && !loading && (
            <span className="text-xs text-slate-500">
              <TimeAgo ts={lastUpdated} prefix="Actualizado " />
            </span>
          )}
          {loading && <span className="text-xs text-accent">Cargando…</span>}
          <button className="btn-ghost" onClick={() => load(false)} disabled={loading}>
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* Selector de fuente: Plataforma + empresas */}
      <div className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="label" htmlFor="calendar-source">Fuente</label>
          <select
            id="calendar-source"
            className="input"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="platform">Plataforma (cuenta de servicio)</option>
            <option value="platformOauth">Google conectado (OAuth)</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500">
          Mostrando las próximas citas de <span className="text-slate-600">{nombreFuente}</span>.
          Se actualiza automáticamente cada 30s.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-dark">
          {error}
        </div>
      )}

      {backendError && (
        <div className="rounded-lg border border-warn/25 bg-warn/10 px-4 py-3 text-xs text-amber-700">
          {backendError}
        </div>
      )}

      {loading && events.length === 0 ? (
        <div className="card text-slate-500">Cargando citas…</div>
      ) : grupos.length === 0 ? (
        <div className="card text-slate-500">
          No hay citas próximas para {nombreFuente}. Cuando se agenden, aparecerán aquí.
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(([k, eventos]) => (
            <div key={k}>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
                {fmtFecha(eventos[0]?.start)}
              </h2>
              <div className="space-y-3">
                {eventos.map((ev, i) => (
                  <div key={ev.id || `${k}-${i}`} className="card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-accent">
                          {ev.allDay
                            ? 'Todo el día'
                            : `${fmtHora(ev.start)}${
                                ev.end ? ` – ${fmtHora(ev.end)}` : ''
                              }`}
                        </div>
                        <div className="mt-1 truncate text-base font-semibold text-slate-900">
                          {ev.title}
                        </div>
                        {ev.attendees?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {ev.attendees.map((email) => (
                              <span
                                key={email}
                                className="max-w-full break-all rounded-full border border-slate-200/80 bg-slate-900/[0.04] px-2 py-0.5 text-xs text-slate-500"
                              >
                                {email}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {ev.htmlLink && (
                        <a
                          href={ev.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-xs text-brand hover:underline"
                        >
                          Abrir en Google Calendar
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
