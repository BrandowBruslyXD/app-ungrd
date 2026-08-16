import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getAccessToken } from '../lib/api';
import { onSessionRevoked } from '../lib/socket';

// Minutos de INACTIVIDAD tras los que la sesión se cierra sola (alineado con
// la ventana del servidor SESSION_IDLE_MINUTES).
const IDLE_MINUTES = 15;
const IDLE_MS = IDLE_MINUTES * 60 * 1000;
const IDLE_KEY = 'wabots_last_activity';

// Protege rutas: exige sesión válida. Con token pero sin usuario cargado,
// valida contra el backend; si la validación falla (401) redirige a /login,
// pero ante una caída transitoria (deploy) reintenta sin cerrar la sesión.
export default function ProtectedRoute({ children }) {
  const { user, fetchMe, forceLogout, idleLogout } = useAuthStore();
  const [checking, setChecking] = useState(!user && !!getAccessToken());
  const retry = useRef(null);

  // Validación inicial de sesión, con reintento ante error transitorio.
  useEffect(() => {
    if (user || !getAccessToken()) {
      setChecking(false);
      return undefined;
    }
    let cancelled = false;
    const run = async () => {
      const r = await fetchMe();
      if (cancelled) return;
      if (r === 'error') {
        // Backend caído (deploy) o red: reintenta en 3s SIN desloguear.
        retry.current = setTimeout(run, 3000);
        return;
      }
      setChecking(false); // 'ok' | 'unauthorized' | 'no-token'
    };
    run();
    return () => {
      cancelled = true;
      if (retry.current) clearTimeout(retry.current);
    };
    // Debe ejecutarse solo al montar: `fetchMe` es estable (zustand) y añadir
    // `user` relanzaría la validación en cada cambio de sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expulsión INSTANTÁNEA: el servidor avisa por socket que la sesión se abrió
  // en otro dispositivo → se cierra aquí mismo, con aviso.
  useEffect(() => {
    if (!getAccessToken()) return undefined;
    return onSessionRevoked((p) =>
      forceLogout(p?.reason || 'Su sesión se abrió en otro dispositivo.'),
    );
    // Se re-suscribe solo al cambiar de usuario; `forceLogout` es estable
    // (zustand) y no necesita figurar en las dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Re-validación al volver a enfocar/mostrar la app (móvil en background).
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible' && getAccessToken()) fetchMe();
    };
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
    // Listeners globales que se registran una sola vez; `fetchMe` es estable
    // (zustand), por lo que omitirlo de las dependencias es seguro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CIERRE POR INACTIVIDAD (semáforo): sin actividad por IDLE_MINUTES → logout.
  // También al ABRIR: si la última actividad fue hace más del umbral (pestaña
  // cerrada/inactiva mucho tiempo), cierra de inmediato.
  useEffect(() => {
    if (!getAccessToken()) return undefined;
    const now = () => Date.now();
    const last = Number(localStorage.getItem(IDLE_KEY) || 0);
    if (last && now() - last > IDLE_MS) {
      idleLogout();
      return undefined;
    }
    let timer;
    const fire = () => idleLogout();
    const mark = () => {
      localStorage.setItem(IDLE_KEY, String(now()));
      clearTimeout(timer);
      timer = setTimeout(fire, IDLE_MS);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    mark(); // arranca el contador
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
    // El contador se rearma solo al cambiar de usuario; `idleLogout` es
    // estable (zustand) y no necesita figurar en las dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!getAccessToken()) return <Navigate to="/login" replace />;
  if (checking) {
    return <div className="flex h-full items-center justify-center text-slate-500">Cargando…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
