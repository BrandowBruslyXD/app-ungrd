import { useEffect, useState } from 'react';
import Modal from './Modal';
import { getDsStatus, dsLogin, dsLogout } from '../lib/deepseekApi';

const SERVER = '72.60.125.180'; // servidor de wabots (para el túnel SSH del VNC)

// Chip de color según el estado de la cuenta del pool.
function StatusChip({ status }) {
  const map = {
    active: 'bg-brand/10 text-brand',
    failed: 'bg-danger/10 text-danger-dark',
    banned: 'bg-danger/10 text-danger-dark',
    cooldown: 'bg-warn/10 text-amber-700',
  };
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${map[status] || 'bg-slate-900/[0.06] text-slate-600'}`}>
      {status || '—'}
    </span>
  );
}

// Tarjeta del Dashboard: estado de la sesión DeepSeek-web (IA gratis) + login/logout.
export default function DeepseekSessionCard() {
  const [state, setState] = useState({ accounts: [], loginActive: false, daemonUp: false, vncPort: 5900 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [vncOpen, setVncOpen] = useState(false);

  const load = async () => {
    try {
      const d = await getDsStatus();
      setState(d);
      setErr(null);
    } catch (e) {
      setErr(e?.response?.data?.message || 'No se pudo leer el estado de DeepSeek');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Mientras hay un login en curso, refresca cada 4s para reflejar cuando entra.
  useEffect(() => {
    if (!state.loginActive) return;
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [state.loginActive]);

  const label = state.accounts?.[0]?.label || 'lldikayll';

  const handleLogin = async () => {
    setBusy(true);
    setErr(null);
    try {
      await dsLogin(label);
      setVncOpen(true);
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || 'No se pudo iniciar el login');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async (lbl) => {
    setBusy(true);
    setErr(null);
    try {
      await dsLogout(lbl);
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || 'No se pudo cerrar la sesión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Sesión DeepSeek (IA gratis)</h2>
          <p className="text-xs text-slate-500">
            Los nodos con proveedor <strong>DeepSeek Web</strong> usan esta sesión; si falla, caen a la API key.
          </p>
        </div>
        <button className="btn-ghost text-sm" onClick={load} disabled={busy}>
          Actualizar
        </button>
      </div>

      {err && (
        <div className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-dark">{err}</div>
      )}

      {!state.daemonUp && !loading && (
        <div className="mb-3 rounded-lg border border-warn/25 bg-warn/10 px-3 py-2 text-xs text-amber-700">
          El servicio de sesión (daemon) no responde ahora mismo.
        </div>
      )}

      {loading ? (
        <div className="skeleton h-16 w-full rounded-xl" />
      ) : state.accounts.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">No hay cuentas de DeepSeek configuradas.</p>
      ) : (
        <ul className="space-y-2">
          {state.accounts.map((a) => (
            <li key={a.label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/[0.02] px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-900">{a.label}</span>
                  <StatusChip status={a.status} />
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  {a.status === 'active'
                    ? `Última actividad: ${a.updatedAt ? new Date(a.updatedAt).toLocaleString() : '—'}`
                    : a.lastError || 'Sesión no disponible'}
                </div>
              </div>
              {a.status === 'active' ? (
                <button className="btn-ghost text-sm" onClick={() => handleLogout(a.label)} disabled={busy}>
                  Cerrar sesión
                </button>
              ) : (
                <button className="btn-primary text-sm" onClick={handleLogin} disabled={busy || state.loginActive}>
                  {state.loginActive ? 'Login en curso…' : 'Iniciar sesión'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {state.loginActive && (
        <button className="mt-3 text-sm font-medium text-brand hover:underline" onClick={() => setVncOpen(true)}>
          Ver instrucciones de conexión (VNC) →
        </button>
      )}

      <Modal open={vncOpen} onClose={() => setVncOpen(false)} title="Completar login de DeepSeek (VNC)">
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            El navegador ya se abrió <strong>en el servidor</strong>. DeepSeek pide una verificación humana
            (CAPTCHA) que debes pasar tú. Conéctate por VNC para verlo y completar el login:
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              En tu PC, abre el túnel SSH (deja la terminal abierta):
              <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100">
                ssh -L 5900:127.0.0.1:5900 -i ~/.ssh/id_ed25519_wabots deploy@{SERVER}
              </pre>
            </li>
            <li>
              Abre un cliente VNC (RealVNC, TigerVNC…) y conéctate a{' '}
              <code className="rounded bg-slate-900/[0.06] px-1">localhost:5900</code>.
            </li>
            <li>Completa la verificación + email + contraseña + entrar.</li>
            <li>En cuanto entres, esta tarjeta mostrará la cuenta como <strong>active</strong> (se actualiza sola).</li>
          </ol>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            La contraseña la tecleas tú en el VNC; no se guarda en el servidor.
          </p>
        </div>
      </Modal>
    </div>
  );
}
