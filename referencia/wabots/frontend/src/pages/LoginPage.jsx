import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getAccessToken } from '../lib/api';
import LightBackground from '../components/LightBackground';
import { IconArrowLeft, IconLock, IconShield, IconUser } from '../components/icons';

// Página de acceso: únicamente el formulario (la presentación vive en la landing).
export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, user, notice } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [conflict, setConflict] = useState(null);

  if (user || getAccessToken()) return <Navigate to="/dashboard" replace />;

  const attempt = async (force) => {
    const res = await login(username, password, force);
    if (res?.ok) navigate('/dashboard');
    else if (res?.conflict) setConflict(res.activeSession ?? {});
  };
  const handleSubmit = async (e) => { e.preventDefault(); await attempt(false); };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-[#eef3f9] px-4 py-10 text-slate-800">
      <LightBackground />

      <div className="w-full max-w-md animate-fade-in-up xl:max-w-lg">
        <Link to="/" className="mb-6 inline-flex min-h-[40px] items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800">
          <IconArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>

        <div className="rounded-3xl border border-white/70 bg-white/75 p-7 shadow-[0_30px_70px_-30px_rgba(16,120,90,0.45)] backdrop-blur-2xl">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-ink-950 shadow-glow-brand"><IconLock className="h-6 w-6" /></span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Acceso al panel</h1>
              <p className="text-xs text-slate-500">Sesión única por dispositivo</p>
            </div>
          </div>

          {notice && (
            <div className="mb-4 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-amber-700">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="login-username">Usuario</label>
              <div className="relative">
                <IconUser className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input id="login-username" type="text" className="input-light pl-10" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="usuario" autoComplete="username" required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="login-password">Contraseña</label>
              <div className="relative">
                <IconLock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input id="login-password" type="password" className="input-light pl-10" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
              </div>
            </div>

            {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-dark">{error}</div>}

            <button type="submit" className="btn-primary-light w-full" disabled={loading}>
              {loading ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-4 border-t border-slate-200/70 pt-4 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5"><IconShield className="h-3.5 w-3.5 text-brand" /> Cifrado en reposo</span>
            <span className="inline-flex items-center gap-1.5"><IconLock className="h-3.5 w-3.5 text-brand" /> Sesión única</span>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">Acceso restringido a personal autorizado</p>
      </div>

      {conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm animate-fade-in-up space-y-4 rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-slate-900">Sesión activa en otro dispositivo</h2>
            <p className="text-sm text-slate-600">
              Ya existe una sesión abierta{conflict.device ? ` en ${conflict.device}` : ''}. Si continúa,
              esa sesión se cerrará y el acceso quedará activo únicamente en este dispositivo.
            </p>
            {(conflict.device || conflict.ip || conflict.since) && (
              <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {conflict.device && (
                  <div><span className="font-medium text-slate-500">Dispositivo:</span> {conflict.device}</div>
                )}
                {conflict.ip && (
                  <div><span className="font-medium text-slate-500">IP:</span> {conflict.ip}</div>
                )}
                {conflict.since && (
                  <div><span className="font-medium text-slate-500">Desde:</span> {new Date(conflict.since).toLocaleString()}</div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button className="btn-ghost-light px-4 py-2" onClick={() => setConflict(null)} disabled={loading}>Cancelar</button>
              <button className="btn-primary-light px-4 py-2" onClick={() => attempt(true)} disabled={loading}>{loading ? 'Ingresando…' : 'Continuar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
