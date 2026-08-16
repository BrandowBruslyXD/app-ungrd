// Consola inferior del editor de flujos (panel con pestañas).
// Vive DENTRO del editor, debajo del lienzo, redimensionable con un Resizer
// horizontal. Tiene dos pestañas:
//   - "Actividad": mensajes IN/OUT del tenant (getActivity).
//   - "Errores":   eventos del EventLog del tenant (getLogs).
// Auto-refresca cada 10s SOLO si está expandida.
//
// Props:
//   - tenantId: empresa dueña del flujo (puede ser null en plantillas).
import { useCallback, useEffect, useRef, useState } from 'react';
import { getActivity, getLogs } from '../lib/logsApi';

const ACTIVITY_LIMIT = 50;
const ERRORS_LIMIT = 50;
const REFRESH_MS = 10000;

// Formatea una fecha ISO al horario de Bogotá (es-CO).
function fmtHora(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return iso;
  }
}

// Color del nivel de log.
function levelColor(level) {
  const l = (level || '').toLowerCase();
  if (l === 'error') return 'text-danger';
  if (l === 'warn' || l === 'warning') return 'text-warn';
  if (l === 'info') return 'text-info';
  return 'text-slate-500';
}

export default function EditorConsole({ tenantId }) {
  const [tab, setTab] = useState('activity'); // 'activity' | 'errors'
  const [activity, setActivity] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  // Carga los datos de la pestaña activa.
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'activity') {
        const rows = await getActivity({ tenantId, limit: ACTIVITY_LIMIT });
        setActivity(Array.isArray(rows) ? rows : []);
      } else {
        const rows = await getLogs({ tenantId, level: 'error', limit: ERRORS_LIMIT });
        setErrors(Array.isArray(rows) ? rows : []);
      }
    } catch {
      // Silencioso: la consola no debe romper el editor.
    } finally {
      setLoading(false);
    }
  }, [tab, tenantId]);

  // Carga inicial + cuando cambia la pestaña o el tenant.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh cada 10s (la consola sólo se monta cuando está expandida,
  // así que basta con el intervalo aquí). Con la pestaña oculta el intervalo
  // no dispara peticiones; al volver a ser visible se refresca de inmediato.
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!document.hidden) refresh();
    }, REFRESH_MS);
    const onVisibility = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  const count = tab === 'activity' ? activity.length : errors.length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white text-slate-900">
      {/* Toolbar de pestañas + acciones */}
      <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-2 py-1">
        <div className="flex items-center gap-1">
          <button
            className={
              tab === 'activity'
                ? 'rounded px-2 py-1 text-xs font-semibold text-slate-900 bg-slate-900/[0.07]'
                : 'rounded px-2 py-1 text-xs text-slate-500 hover:text-slate-900'
            }
            onClick={() => setTab('activity')}
          >
            Actividad
          </button>
          <button
            className={
              tab === 'errors'
                ? 'rounded px-2 py-1 text-xs font-semibold text-slate-900 bg-slate-900/[0.07]'
                : 'rounded px-2 py-1 text-xs text-slate-500 hover:text-slate-900'
            }
            onClick={() => setTab('errors')}
          >
            Errores
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">{count} registros</span>
          <button
            className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-900/[0.07] hover:text-slate-900 disabled:opacity-50"
            onClick={refresh}
            disabled={loading}
            title="Actualizar"
          >
            {loading ? '…' : '↻'} Actualizar
          </button>
        </div>
      </div>

      {/* Contenido: scroll interno en ambos ejes (nowheel para no robar el
          zoom a ReactFlow); el horizontal evita filas cortadas en angosto. */}
      <div className="nowheel min-h-0 flex-1 overflow-auto">
        {tab === 'activity' ? (
          <ActivityTable rows={activity} />
        ) : (
          <ErrorsTable rows={errors} />
        )}
      </div>
    </div>
  );
}

// --- Tabla de actividad: consola clara monospace ---
function ActivityTable({ rows }) {
  if (!rows.length) {
    return <Empty texto="Sin actividad reciente." />;
  }
  return (
    <div className="font-mono text-[11px] leading-relaxed">
      {rows.map((r) => {
        const entrante = r.direction === 'IN';
        return (
          <div
            key={r.id}
            className="flex items-start gap-3 border-b border-slate-200/60 px-3 py-1.5 hover:bg-slate-100"
          >
            <span className="shrink-0 text-slate-500">{fmtHora(r.createdAt)}</span>
            <span className="shrink-0 text-slate-600">{r.contacto}</span>
            <span
              className={
                entrante ? 'shrink-0 text-brand' : 'shrink-0 text-info'
              }
            >
              {entrante ? '📥 Entrante' : '📤 Saliente'}
            </span>
            <span className="min-w-0 flex-1 break-words text-slate-900">
              {r.texto}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// --- Tabla de errores ---
function ErrorsTable({ rows }) {
  if (!rows.length) {
    return <Empty texto="Sin errores registrados." />;
  }
  return (
    <div className="text-xs">
      {rows.map((r) => (
        <div
          key={r.id}
          className="flex items-start gap-3 border-b border-slate-200/60 px-3 py-2 hover:bg-slate-100"
        >
          <span className={`shrink-0 font-semibold uppercase ${levelColor(r.level)}`}>
            {r.level || 'log'}
          </span>
          <span className="shrink-0 text-slate-500">{r.source || r.origen || '—'}</span>
          <span className="min-w-0 flex-1 break-words text-slate-700">{r.message || r.mensaje}</span>
          <span className="shrink-0 text-slate-400">{fmtHora(r.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

function Empty({ texto }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-xs text-slate-500">
      {texto}
    </div>
  );
}
