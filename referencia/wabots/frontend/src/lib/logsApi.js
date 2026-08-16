import api from './api';

// Encapsula las llamadas REST al visor de LOGS (EventLog).
// El payload real siempre viene en res.data.data.

// Lista los eventos más recientes. Filtros opcionales: tenantId, level, limit.
export async function getLogs({ tenantId, level, limit } = {}) {
  const { data } = await api.get('/admin/logs', {
    params: {
      tenantId: tenantId || undefined,
      level: level || undefined,
      limit: limit || undefined,
    },
  });
  return data.data;
}

// Lista la ACTIVIDAD de mensajes (MessageLog) más reciente.
// Filtros opcionales: tenantId, limit. El backend ya normaliza cada item:
// { id, tenantId, empresa, contacto, direction ('IN'|'OUT'), texto, tipo, createdAt }.
export async function getActivity({ tenantId, limit } = {}) {
  const { data } = await api.get('/admin/activity', {
    params: {
      tenantId: tenantId || undefined,
      limit: limit || undefined,
    },
  });
  return data.data;
}
