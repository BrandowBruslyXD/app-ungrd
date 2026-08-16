import { create } from 'zustand';
import api, { setTokens, clearTokens, getAccessToken } from '../lib/api';
import { disconnectSocket } from '../lib/socket';

// Estado de autenticación del admin.
export const useAuthStore = create((set) => ({
  user: null,
  loading: false,
  error: null,
  // Mensaje a mostrar en el login tras una expulsión (sesión abierta en otro
  // dispositivo). Se limpia al iniciar sesión de nuevo.
  notice: null,

  /** Expulsión inmediata (sesión reemplazada en otro dispositivo). */
  forceLogout(notice) {
    clearTokens();
    disconnectSocket();
    set({ user: null, notice: notice || null });
  },

  /**
   * Cierre por INACTIVIDAD: revoca la sesión en el servidor (limpia el
   * sessionId → el "semáforo" queda cerrado) y limpia el cliente con aviso.
   */
  async idleLogout(notice) {
    try {
      await api.post('/auth/logout');
    } catch {
      /* si el backend no responde, la sesión se cierra igual en el cliente */
    }
    clearTokens();
    disconnectSocket();
    set({ user: null, notice: notice || 'Su sesión se cerró por inactividad.' });
  },

  /**
   * Inicia sesión. Devuelve { ok } en éxito, o { conflict, activeSession } si ya
   * hay una sesión activa en otro dispositivo (para confirmar el reemplazo con
   * `force`). Cualquier otro fallo deja el mensaje en `error`.
   */
  async login(username, password, force = false) {
    set({ loading: true, error: null, notice: null });
    try {
      const { data } = await api.post('/auth/login', { username, password, force });
      setTokens(data.data);
      // Reinicia el reloj de inactividad: el usuario acaba de autenticarse (está
      // activo AHORA). Sin esto, ProtectedRoute leería una marca vieja de una
      // sesión anterior y lo expulsaría al instante por "inactividad".
      try {
        localStorage.setItem('wabots_last_activity', String(Date.now()));
      } catch {
        /* localStorage no disponible: el contador se reinicia igual al montar */
      }
      set({ user: data.data.user, loading: false, notice: null });
      return { ok: true };
    } catch (e) {
      set({ loading: false });
      if (e?.response?.status === 409) {
        return { conflict: true, activeSession: e.response.data?.activeSession };
      }
      set({ error: e?.response?.data?.message || 'Error al iniciar sesión' });
      return { ok: false };
    }
  },

  /**
   * Valida la sesión contra /auth/me. Devuelve:
   *  - 'ok'            → usuario cargado.
   *  - 'unauthorized'  → 401: sesión inválida/reemplazada → limpia y saldrá al login.
   *  - 'error'         → fallo TRANSITORIO (backend caído en un deploy, red):
   *                       NO se cierra la sesión (el llamador reintenta).
   *  - 'no-token'      → sin token.
   */
  async fetchMe() {
    if (!getAccessToken()) return 'no-token';
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data });
      return 'ok';
    } catch (e) {
      if (e?.response?.status === 401) {
        // Sesión inválida o reemplazada: limpiar tokens muertos (evita el bucle
        // "Cargando…"). Solo con 401 real, NUNCA por una caída transitoria.
        clearTokens();
        disconnectSocket();
        set({ user: null });
        return 'unauthorized';
      }
      // Backend momentáneamente inaccesible (deploy) o error de red → conservar
      // la sesión; el ProtectedRoute reintenta sin desloguear.
      return 'error';
    }
  },

  async logout() {
    // Revoca la sesión en el servidor (best-effort) y limpia el cliente.
    try {
      await api.post('/auth/logout');
    } catch {
      /* la sesión igual se cierra en el cliente */
    }
    clearTokens();
    disconnectSocket();
    set({ user: null });
  },
}));
