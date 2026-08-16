import api from './api';

// Encapsula las llamadas REST a flujos y plantillas.
// El payload real siempre viene en res.data.data.

export async function listFlows(tenantId) {
  const params = tenantId ? { tenantId } : {};
  const { data } = await api.get('/flows', { params });
  return data.data;
}

export async function getFlow(id) {
  const { data } = await api.get(`/flows/${id}`);
  return data.data;
}

export async function listTemplates() {
  const { data } = await api.get('/flows/templates');
  return data.data;
}

export async function createFlow(payload) {
  const { data } = await api.post('/flows', payload);
  return data.data;
}

export async function updateFlow(id, payload) {
  const { data } = await api.patch(`/flows/${id}`, payload);
  return data.data;
}

export async function deleteFlow(id) {
  const { data } = await api.delete(`/flows/${id}`);
  return data.data;
}
