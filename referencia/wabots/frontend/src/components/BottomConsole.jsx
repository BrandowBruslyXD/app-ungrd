import { useCallback, useEffect, useRef, useState } from 'react';
import { getActivity, getLogs } from '../lib/logsApi';
import { listTenants } from '../lib/tenantsApi';

// Formatea una fecha ISO a hora/fecha local de Colombia (America/Bogota).
function fmtFecha(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

// Color por nivel de error (EventLog).
const LEVEL_COLOR = {
  ERROR: 'text-red-400',
  WARN: 'text-amber-400',
  INFO: 'text-sky-400',
  DEBUG: 'text-slate-400',
};

/**
 * Consola inferior colapsable (estilo IDE).
 * - Colapsada por defecto: solo una barra delgada abajo con la pestaña "Consola".
 * - Al hacer clic se expande hacia arriba (~40vh); al volver a hacer clic se colapsa.
 * - Dos pestañas: "Actividad" (mensajes) y "Errores" (EventLog).
 * - Filtro por empresa, auto-refresh cada 10s SOLO cuando está expandida, y botón ↻.
 */
export default function BottomConsole() {
  // --- Estado de UI (hooks siempre antes de cualquier return) ---
  const [abierta, setAbierta] = useState(false);
  const [tab, setTab] = useState('actividad'); // 'actividad' | 'errores'
  const [tenantId, setTenantId] = useState('');

  const [tenants, setTenants] = useState([]);
  const [actividad, setActividad] = useState([]);
  const [errores, setErrores] = useState([]);
  const [cargando, setCargando] = useState(false);

  const refrescoRef = useRef(null);

  // Carga la lista de empresas una vez (para el filtro). Tolerante a fallos.
  useEffect(() => {
    let vivo = true;
    listTenants()
      .then((data) => {
        if (vivo) setTenants(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // Carga los datos de la pestaña activa según el filtro de empresa.
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      if (tab === 'actividad') {
        const data = await getActivity({ tenantId, limit: 200 });
        setActividad(Array.isArray(data) ? data : []);
      } else {
        const data = await getLogs({ tenantId, level: 'ERROR', limit: 200 });
        setErrores(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silencioso: la consola no debe romper el panel.
    } finally {
      setCargando(false);
    }
  }, [tab, tenantId]);

  // Al expandir o cambiar pestaña/filtro: carga inmediata.
  useEffect(() => {
    if (!abierta) return;
    cargar();
  }, [abierta, cargar]);

  // Auto-refresh cada 10s SOLO cuando está expandida.
  useEffect(() => {
    if (!abierta) return undefined;
    refrescoRef.current = setInterval(() => {
      cargar();
    }, 10000);
    return () => {
      if (refrescoRef.current) clearInterval(refrescoRef.current);
    };
  }, [abierta, cargar]);

  const contador = tab === 'actividad' ? actividad.length : errores.length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:left-64">
      {/* Barra/pestaña inferior (siempre visible, ~28px) */}
      <div className="flex items-center gap-3 border-t border-ink-600 bg-ink-950 px-4 py-1 text-xs text-slate-300">
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          className="flex items-center gap-2 font-medium text-slate-200 hover:text-white"
          title={abierta ? 'Colapsar consola' : 'Expandir consola'}
        >
          <span>🗒</span>
          <span>Consola</span>
          <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] text-slate-300">
            {abierta ? contador : '•'}
          </span>
          <span className="text-slate-500">{abierta ? '▾' : '▴'}</span>
        </button>

        {abierta && (
          <div className="ml-auto flex items-center gap-2">
            {cargando && <span className="text-slate-500">cargando…</span>}
            <button
              type="button"
              onClick={cargar}
              className="rounded px-2 py-0.5 text-slate-300 hover:bg-ink-700 hover:text-white"
              title="Refrescar"
            >
              ↻
            </button>
          </div>
        )}
      </div>

      {/* Panel expandido (~40vh) */}
      {abierta && (
        <div className="flex h-[40vh] flex-col border-t border-ink-600 bg-ink-900">
          {/* Cabecera: pestañas + filtro de empresa */}
          <div className="flex items-center gap-2 border-b border-ink-700 px-4 py-2 text-sm">
            <button
              type="button"
              onClick={() => setTab('actividad')}
              className={`rounded px-3 py-1 font-medium transition ${
                tab === 'actividad'
                  ? 'bg-ink-700 text-slate-100'
                  : 'text-slate-400 hover:bg-ink-700 hover:text-slate-100'
              }`}
            >
              Actividad
            </button>
            <button
              type="button"
              onClick={() => setTab('errores')}
              className={`rounded px-3 py-1 font-medium transition ${
                tab === 'errores'
                  ? 'bg-ink-700 text-slate-100'
                  : 'text-slate-400 hover:bg-ink-700 hover:text-slate-100'
              }`}
            >
              Errores
            </button>

            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="ml-auto rounded border border-ink-600 bg-ink-800 px-2 py-1 text-xs text-slate-200"
            >
              <option value="">Todas las empresas</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Contenido con scroll interno */}
          <div className="flex-1 overflow-y-auto px-2 py-2 text-xs">
            {tab === 'actividad' ? (
              <ActividadTabla items={actividad} />
            ) : (
              <ErroresTabla items={errores} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Tabla de actividad de mensajes.
function ActividadTabla({ items }) {
  if (!items.length) {
    return <div className="px-2 py-6 text-center text-slate-500">Sin actividad reciente.</div>;
  }
  return (
    <table className="w-full table-fixed border-collapse">
      <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
        <tr>
          <th className="w-40 px-2 py-1">Hora / Fecha</th>
          <th className="w-40 px-2 py-1">Empresa</th>
          <th className="w-40 px-2 py-1">Contacto</th>
          <th className="w-28 px-2 py-1">Dirección</th>
          <th className="px-2 py-1">Mensaje</th>
        </tr>
      </thead>
      <tbody className="text-slate-300">
        {items.map((m) => {
          const entrante = m.direction === 'IN';
          return (
            <tr key={m.id} className="border-t border-ink-800 align-top hover:bg-ink-800/50">
              <td className="px-2 py-1 text-slate-400">{fmtFecha(m.createdAt)}</td>
              <td className="truncate px-2 py-1" title={m.empresa}>
                {m.empresa || '—'}
              </td>
              <td className="truncate px-2 py-1 font-mono text-slate-200" title={m.contacto}>
                {m.contacto || '—'}
              </td>
              <td className={`px-2 py-1 ${entrante ? 'text-emerald-400' : 'text-sky-400'}`}>
                {entrante ? '📥 Entrante' : '📤 Saliente'}
              </td>
              <td className="px-2 py-1 text-slate-200">
                {m.texto || <span className="text-slate-500">({m.tipo || 'sin texto'})</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Tabla de errores (EventLog).
function ErroresTabla({ items }) {
  if (!items.length) {
    return <div className="px-2 py-6 text-center text-slate-500">Sin errores registrados.</div>;
  }
  return (
    <table className="w-full table-fixed border-collapse">
      <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
        <tr>
          <th className="w-20 px-2 py-1">Nivel</th>
          <th className="w-28 px-2 py-1">Origen</th>
          <th className="px-2 py-1">Mensaje</th>
          <th className="w-40 px-2 py-1">Empresa</th>
          <th className="w-40 px-2 py-1">Fecha</th>
        </tr>
      </thead>
      <tbody className="text-slate-300">
        {items.map((e) => (
          <tr key={e.id} className="border-t border-ink-800 align-top hover:bg-ink-800/50">
            <td className={`px-2 py-1 font-semibold ${LEVEL_COLOR[e.level] || 'text-slate-300'}`}>
              {e.level}
            </td>
            <td className="truncate px-2 py-1 text-slate-400" title={e.source}>
              {e.source}
            </td>
            <td className="px-2 py-1 text-slate-200">{e.message}</td>
            <td className="truncate px-2 py-1 text-slate-400" title={e.tenantId || '—'}>
              {e.tenantId || '—'}
            </td>
            <td className="px-2 py-1 text-slate-400">{fmtFecha(e.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
