// Modal para ver el calendario de la empresa dueña del flujo (tenant).
// Se abre desde el editor de flujos. Intenta primero el calendario propio
// del tenant (OAuth) y, si no existe o falla, cae al calendario central
// de la plataforma. Auto-refresca cada 30s mientras está abierto.
import { useEffect, useMemo, useRef, useState } from 'react';
import { getEvents } from '../lib/calendarApi';
import TimeAgo from '../components/TimeAgo';

const TZ = 'America/Bogota';
const REFRESH_MS = 30000; // auto-refresh cada 30s

// Clave de día (yyyy-mm-dd) en zona Bogotá, para agrupar eventos por fecha.
function dayKey(iso) {
  if (!iso) return 'sin-fecha';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'sin-fecha';
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

export default function CalendarModal({ tenantId, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // error de red del propio fetch
  const [backendError, setBackendError] = useState(null); // error reportado por Google/backend
  const [lastUpdated, setLastUpdated] = useState(null);
  // Qué calendario terminó mostrándose: 'tenant' (OAuth) o 'platform' (central).
  const [shownSource, setShownSource] = useState(tenantId ? 'tenant' : 'platform');

  const timerRef = useRef(null);

  // Carga los eventos con fallback tenant → platform. silent = sin spinner.
  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      // Si el flujo es plantilla (sin empresa), vamos directo a plataforma.
      if (!tenantId) {
        const data = await getEvents({ source: 'platform', max: 20 });
        setEvents(Array.isArray(data) ? data : []);
        setBackendError(data?.__error || null);
        setShownSource('platform');
        setLastUpdated(Date.now());
        return;
      }

      // 1) Intentar el calendario propio del tenant (OAuth).
      const tenantData = await getEvents({ source: 'tenant', tenantId, max: 20 });
      const tenantOk =
        Array.isArray(tenantData) && tenantData.length > 0 && !tenantData.__error;

      if (tenantOk) {
        setEvents(tenantData);
        setBackendError(tenantData.__error || null);
        setShownSource('tenant');
        setLastUpdated(Date.now());
        return;
      }

      // 2) Fallback: calendario central de la plataforma.
      const platformData = await getEvents({ source: 'platform', max: 20 });
      setEvents(Array.isArray(platformData) ? platformData : []);
      setBackendError(platformData?.__error || null);
      setShownSource('platform');
      setLastUpdated(Date.now());
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudieron cargar las citas');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Carga inicial + auto-refresh cada 30s mientras el modal esté abierto.
  // Con la pestaña oculta no se refresca (ahorra red/BD); al volver, refresca.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Cierra con la tecla Escape.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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

  const subtitulo =
    shownSource === 'tenant'
      ? 'Calendario de la empresa (OAuth)'
      : 'Calendario central (plataforma)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white/80 shadow-lift backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              Calendario de la empresa
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{subtitulo}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {lastUpdated && !loading && (
              <span className="text-xs text-slate-500">
                <TimeAgo ts={lastUpdated} prefix="Actualizado " />
              </span>
            )}
            {loading && <span className="text-xs text-accent">Cargando…</span>}
            <button className="btn-ghost" onClick={() => load(false)} disabled={loading}>
              ↻ Actualizar
            </button>
            <button
              className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-900/[0.07] hover:text-slate-900"
              onClick={onClose}
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cuerpo con scroll propio */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          {backendError && (
            <div className="rounded-lg border border-warn/25 bg-warn/10 px-4 py-3 text-xs text-warn">
              {backendError}
            </div>
          )}

          {loading && events.length === 0 ? (
            <div className="card text-slate-500">Cargando citas…</div>
          ) : grupos.length === 0 ? (
            <div className="card text-slate-500">
              No hay citas próximas. Cuando se agenden, aparecerán aquí.
            </div>
          ) : (
            grupos.map(([k, eventos]) => (
              <div key={k}>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
                  {fmtFecha(eventos[0]?.start)}
                </h3>
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
