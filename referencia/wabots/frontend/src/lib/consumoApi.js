import api from './api';

// Encapsula las llamadas REST al panel de consumo de IA (metering).
// El payload real siempre viene en res.data.data.

export async function getSummary({ from, to } = {}) {
  const { data } = await api.get('/admin/metering/summary', {
    params: { from, to },
  });
  return data.data;
}

export async function getTenantConsumo(tenantId, { from, to } = {}) {
  const { data } = await api.get(`/admin/metering/tenant/${tenantId}`, {
    params: { from, to },
  });
  return data.data;
}

// Saldo GLOBAL del proveedor de LLM de la plataforma (la API key es una sola).
// Devuelve { provider, available, balanceUsd, currency, note }. Para proveedores
// que no exponen saldo (Gemini/OpenAI/Anthropic) → available:false.
export async function getProviderBalance() {
  const { data } = await api.get('/admin/metering/provider-balance');
  return data.data;
}
