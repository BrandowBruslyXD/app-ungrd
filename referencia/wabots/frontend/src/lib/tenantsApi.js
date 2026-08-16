import api from './api';

// Encapsula las llamadas REST a empresas (tenants), servicio, WhatsApp,
// integraciones y conversaciones. El payload real siempre viene en res.data.data.

export async function listTenants() {
  const { data } = await api.get('/tenants');
  return data.data;
}

export async function getTenant(id) {
  const { data } = await api.get(`/tenants/${id}`);
  return data.data;
}

export async function createTenant(payload) {
  const { data } = await api.post('/tenants', payload);
  return data.data;
}

export async function updateTenant(id, payload) {
  const { data } = await api.patch(`/tenants/${id}`, payload);
  return data.data;
}

export async function deleteTenant(id) {
  const { data } = await api.delete(`/tenants/${id}`);
  return data.data;
}

export async function activateTenant(id) {
  const { data } = await api.post(`/tenants/${id}/activate`);
  return data.data;
}

export async function suspendTenant(id) {
  const { data } = await api.post(`/tenants/${id}/suspend`);
  return data.data;
}

export async function connectWhatsapp(id) {
  const { data } = await api.post(`/tenants/${id}/whatsapp/connect`);
  return data.data; // { qr, connectionState, phoneNumber, ... }
}

// Configura el canal Twilio de la empresa (secretos se cifran en backend).
export async function configureTwilioChannel(id, payload) {
  const { data } = await api.post(`/tenants/${id}/channel/twilio`, payload);
  return data.data;
}

// Configura el canal Meta / WhatsApp Cloud API (secretos se cifran en backend).
export async function configureMetaChannel(id, payload) {
  const { data } = await api.post(`/tenants/${id}/channel/meta`, payload);
  return data.data;
}

// Desvincula el canal actual y vuelve a Evolution (QR).
export async function resetChannel(id) {
  const { data } = await api.post(`/tenants/${id}/channel/reset`);
  return data.data;
}

export async function listIntegrations(tenantId) {
  const { data } = await api.get(`/tenants/${tenantId}/integrations`);
  return data.data;
}

export async function createIntegration(tenantId, payload) {
  const { data } = await api.post(`/tenants/${tenantId}/integrations`, payload);
  return data.data;
}

export async function updateIntegration(integrationId, payload) {
  const { data } = await api.patch(`/integrations/${integrationId}`, payload);
  return data.data;
}

export async function deleteIntegration(integrationId) {
  const { data } = await api.delete(`/integrations/${integrationId}`);
  return data.data;
}

export async function listConversations(tenantId) {
  const { data } = await api.get(`/tenants/${tenantId}/conversations`);
  return data.data;
}

// Trae una conversación con sus mensajes en orden cronológico
// (`take` limita cuántos mensajes recientes se cargan).
export async function getConversation(id, take = 1000) {
  const { data } = await api.get(`/conversations/${id}`, { params: { take } });
  return data.data;
}
