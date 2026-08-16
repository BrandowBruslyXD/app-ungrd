// Cliente del agente constructor de flujos (IA que arma/edita el grafo).
import api from './api';

/**
 * Pide al agente que construya/edite el flujo según una instrucción NL.
 * @param {object} payload { graph, message, history, context }
 * @returns {Promise<{reply, graph, changed, problems, trace, iterations}>}
 */
export async function buildFlow(payload) {
  const res = await api.post('/flow-agent/build', payload);
  return res.data?.data ?? res.data;
}

/** Lista las plantillas por rubro (estilo Dapta) para usar como punto de partida. */
export async function getRubroTemplates() {
  const res = await api.post('/flow-agent/templates', {});
  return res.data?.data ?? res.data;
}
