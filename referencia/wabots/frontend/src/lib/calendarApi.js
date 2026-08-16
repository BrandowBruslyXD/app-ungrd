import api from './api';

// Encapsula las llamadas REST al visor de Google Calendar (panel admin).
// El payload real siempre viene en res.data.data (lista de eventos normalizados).
// El backend es tolerante a fallos: puede devolver { data: [], error }.

// Lista las próximas citas del calendario.
//  - source: 'platform' (por defecto) o 'tenant'.
//  - tenantId: requerido cuando source='tenant'.
//  - max: máximo de eventos a traer.
// Devuelve el array de eventos (data.data). Si el backend reportó un error,
// se adjunta como propiedad no-enumerable para no romper el array.
export async function getEvents({ source, tenantId, max } = {}) {
  const { data } = await api.get('/admin/calendar/events', {
    params: { source, tenantId, max },
  });
  const events = Array.isArray(data?.data) ? data.data : [];
  if (data?.error) {
    Object.defineProperty(events, '__error', {
      value: data.error,
      enumerable: false,
    });
  }
  return events;
}
