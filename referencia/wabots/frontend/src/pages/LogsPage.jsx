import { Fragment, useEffect, useState } from 'react';
import { getLogs } from '../lib/logsApi';
import { listTenants } from '../lib/tenantsApi';

// Intervalo de auto-refresco (ms).
const AUTO_REFRESH_MS = 20000;

// Formatea una fecha ISO a algo legible (local).
function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

// Color del nivel: ERROR rojo, WARN ámbar, INFO/DEBUG gris.
function levelClasses(level) {
  switch (level) {
    case 'ERROR':
      return 'border-red-500/30 bg-red-500/10 text-red-400';
    case 'WARN':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    default:
      return 'border-ink-600 bg-ink-700/50 text-slate-400';
  }
}

// Pinta el meta (Json) de forma compacta; vacío = nada.
function MetaCell({ meta }) {
  if (meta == null) return <span className="text-slate-600">—</span>;
  const isEmpty =
    typeof meta === 'object' && !Array.isArray(meta) && Object.keys(meta).length === 0;
  if (isEmpty) return <span className="text-slate-600">—</span>;
  let text;
  try {
    text = typeof meta === 'string' ? meta : JSON.stringify(meta);
  } catch {
    text = String(meta);
  }
  return (
    <code className="block max-w-xs truncate text-xs text-slate-500" title={text}>
      {text}
    </code>
  );
}

// Visor de LOGS (EventLog): eventos del sistema para depurar.
export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros.
  const [tenantId, setTenantId] = useState('');
  const [level, setLevel] = useState('');

  // Contador para forzar recargas (botón ↻ y auto-refresh).
  const [reloadTick, setReloadTick] = useState(0);

  // Carga el catálogo de empresas una sola vez (para el selector).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listTenants();
        if (alive) setTenants(Array.isArray(data) ? data : []);
      } catch {
        // El selector de empresa es opcional; si falla, seguimos sin él.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Carga los logs cada vez que cambian los filtros o el tick de recarga.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await getLogs({ tenantId, level, limit: 200 });
        if (alive) setLogs(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) {
          setError(e?.response?.data?.message || 'No se pudieron cargar los logs');
          setLogs([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tenantId, level, reloadTick]);

  // Auto-refresco cada 20s (incrementa el tick).
  useEffect(() => {
    const id = setInterval(() => setReloadTick((n) => n + 1), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  // Mapa id → nombre para mostrar el tenant en la tabla.
  const tenantName = (id) => {
    if (!id) return '—';
    const t = tenants.find((x) => x.id === id);
    return t?.name || id;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Logs</h1>
          <p className="text-sm text-slate-400">
            Eventos del sistema para diagnóstico (auto-refresco cada 20s)
          </p>
        </div>
        <button className="btn-ghost" onClick={() => setReloadTick((n) => n + 1)}>
          ↻ Actualizar
        </button>
      </div>

      {/* Filtros: empresa y nivel */}
      <div className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Empresa</label>
          <select
            className="input"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          >
            <option value="">Todas</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Nivel</label>
          <select
            className="input"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="ERROR">ERROR</option>
            <option value="WARN">WARN</option>
            <option value="INFO">INFO</option>
          </select>
        </div>
        {(tenantId || level) && (
          <button
            className="btn-ghost"
            onClick={() => {
              setTenantId('');
              setLevel('');
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-6 text-slate-400">Cargando…</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-slate-400">
            No hay eventos para estos filtros. Todo en calma por aquí. 🌱
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-600 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Nivel</th>
                <th className="px-5 py-3 font-medium">Origen</th>
                <th className="px-5 py-3 font-medium">Mensaje</th>
                <th className="px-5 py-3 font-medium">Empresa</th>
                <th className="px-5 py-3 font-medium">Meta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-600">
              {logs.map((l) => (
                <Fragment key={l.id}>
                  <tr className="hover:bg-ink-700/50 align-top">
                    <td className="whitespace-nowrap px-5 py-3 text-slate-400">
                      {fmtDate(l.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${levelClasses(
                          l.level,
                        )}`}
                      >
                        {l.level}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-300">
                      {l.source || '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-100">{l.message}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-400">
                      {tenantName(l.tenantId)}
                    </td>
                    <td className="px-5 py-3">
                      <MetaCell meta={l.meta} />
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
