import api from './api';

// Panel de la sesión DeepSeek-web (login/logout + estado del pool). El backend
// delega login/logout en el daemon (contenedor con navegador+VNC).

export async function getDsStatus() {
  const { data } = await api.get('/admin/deepseek-panel/status');
  return data;
}

export async function dsLogin(label) {
  const { data } = await api.post('/admin/deepseek-panel/login', { label });
  return data;
}

export async function dsLogout(label) {
  const { data } = await api.post('/admin/deepseek-panel/logout', { label });
  return data;
}
