import axios from 'axios';

// Cliente HTTP único: inyecta el access token y renueva la sesión ante un 401.
const api = axios.create({ baseURL: '/api' });

const ACCESS_KEY = 'wabots_access';
const REFRESH_KEY = 'wabots_refresh';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Renovación compartida: varias peticiones que reciban 401 a la vez esperan
// al mismo intercambio de refresh en lugar de dispararlo en paralelo.
let refreshInFlight = null;

function refreshSession() {
  if (!refreshInFlight) {
    const refreshToken = getRefreshToken();
    refreshInFlight = axios
      .post('/api/auth/refresh', { refreshToken })
      .then(({ data }) => {
        setTokens(data.data);
        return data.data.accessToken;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

// Sesión muerta (refresh falló / sin refresh): limpia tokens y AVISA por evento.
// El árbol React (App) lo escucha y hace un logout suave con aviso, sin recargar
// toda la página (evita el parpadeo y conserva el mensaje para el usuario).
function redirectToLogin() {
  clearTokens();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wabots:session-dead'));
  }
}

// Solo login y refresh quedan FUERA del auto-refresh (si el propio refresh
// devuelve 401 la sesión murió de verdad). /auth/me SÍ se renueva: así una
// sesión con access vencido pero refresh vigente se reanuda sola, sin bucles.
const isAuthPath = (url) => /\/auth\/(login|refresh)\b/.test(url || '');

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const status = err?.response?.status;

    if (status !== 401 || isAuthPath(original?.url)) return Promise.reject(err);

    // 401 definitivo (sin refresh disponible o ya reintentado): la sesión no
    // sirve → LIMPIAR tokens siempre (evita el bucle de "Cargando…" con
    // tokens muertos en localStorage) y volver al login.
    if (!original || original._retry || !getRefreshToken()) {
      redirectToLogin();
      return Promise.reject(err);
    }

    original._retry = true;
    try {
      const accessToken = await refreshSession();
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch {
      // El refresh falló (sesión revocada/reemplazada en otro dispositivo).
      redirectToLogin();
      return Promise.reject(err);
    }
  },
);

export default api;
