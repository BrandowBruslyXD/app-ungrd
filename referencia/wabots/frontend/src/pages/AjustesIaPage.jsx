import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

// Página de configuración del LLM de la plataforma (admin).
// Permite elegir proveedor, modelo y guardar la API key (cifrada en el backend).
export default function AjustesIaPage() {
  const [providers, setProviders] = useState([]); // lista de proveedores disponibles
  const [current, setCurrent] = useState(null); // config actual { provider, model, baseUrl } o null

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado del formulario.
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Carga inicial: proveedores + config actual.
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [provRes, platRes] = await Promise.all([
        api.get('/integrations/ai/providers'),
        api.get('/integrations/ai/platform'),
      ]);
      const provList = Array.isArray(provRes.data.data) ? provRes.data.data : [];
      const cfg = platRes.data.data || null;
      setProviders(provList);
      setCurrent(cfg);

      // Prefill del formulario con la config actual (o el primer proveedor).
      const initialProvider = cfg?.provider || provList[0]?.id || '';
      setProvider(initialProvider);
      const def = provList.find((p) => p.id === initialProvider);
      setModel(cfg?.model || def?.models?.[0] || '');
      setBaseUrl(cfg?.baseUrl || def?.defaultBaseUrl || '');
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo cargar la configuración de IA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Proveedor seleccionado (definición completa).
  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === provider),
    [providers, provider],
  );

  // Al cambiar de proveedor, ajusta modelo y baseUrl por defecto.
  const handleProviderChange = (id) => {
    setProvider(id);
    const def = providers.find((p) => p.id === id);
    setModel(def?.models?.[0] || '');
    setBaseUrl(def?.defaultBaseUrl || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setSuccess(null);
    try {
      await api.post('/integrations/ai/platform', {
        provider,
        model,
        apiKey,
        baseUrl: baseUrl || undefined,
      });
      setApiKey(''); // no conservamos la key en memoria tras guardar
      setSuccess('Configuración de IA guardada correctamente');
      await load();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">IA / LLM</h1>
        <p className="text-sm text-slate-400">
          Configura el proveedor, el modelo y la API key del LLM de la plataforma
        </p>
      </div>

      {/* Estado actual del LLM activo */}
      {current?.provider && (
        <div className="rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-slate-200">
          LLM activo: <span className="font-medium text-brand">{current.provider}</span>
          {' / '}
          <span className="font-medium text-brand">{current.model}</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="card max-w-2xl">
        {loading ? (
          <div className="text-slate-400">Cargando…</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Proveedor</label>
              <select
                className="input"
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                {providers.length === 0 && <option value="">Sin proveedores</option>}
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label || p.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Modelo</label>
              {/* Lista sugerida por el proveedor; también admite escribir uno custom. */}
              <input
                className="input"
                value={model}
                list="ia-model-list"
                placeholder="Ej. gpt-4o-mini"
                onChange={(e) => setModel(e.target.value)}
              />
              <datalist id="ia-model-list">
                {(selectedProvider?.models || []).map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="label">API key</label>
              <input
                type="password"
                className="input"
                value={apiKey}
                placeholder={
                  current?.provider
                    ? '•••• ya configurada — escribe para reemplazarla'
                    : '•••• se guarda cifrada'
                }
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Base URL (opcional)</label>
              <input
                className="input"
                value={baseUrl}
                placeholder={selectedProvider?.defaultBaseUrl || 'https://...'}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>

            {formError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {formError}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
                {success}
              </div>
            )}

            <button className="btn-primary" disabled={saving || !provider}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
