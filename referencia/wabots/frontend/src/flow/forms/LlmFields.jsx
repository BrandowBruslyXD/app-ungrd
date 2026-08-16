// Sub-formulario compartido de configuración del LLM (Agente IA y Recordatorio).
// Edita llmMode/provider/model/apiKey/baseUrl sobre el `data` del nodo.
// Para el proveedor `deepseek_web` (sesión web, sin API key) se muestra además
// el bloque de FALLBACK: si la sesión web falla, el motor cae en silencio a este
// proveedor de API. Los campos coinciden con lo que lee ai-runner.service.ts:
// fallbackProvider / fallbackModel / fallbackApiKey / fallbackBaseUrl.
import { Field } from './fields.jsx';

// Proveedores soportados por el motor.
const LLM_PROVIDERS = [
  { value: 'deepseek_web', label: 'DeepSeek Web (sesión, sin API key)' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'google', label: 'Google (Gemini)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai_compatible', label: 'OpenAI-compatible' },
  { value: 'custom', label: 'Personalizado' },
];

// El fallback nunca puede ser la propia sesión web (evita circularidad).
const FALLBACK_PROVIDERS = LLM_PROVIDERS.filter((p) => p.value !== 'deepseek_web');

const needsBaseUrl = (p) => p === 'openai_compatible' || p === 'custom';

export default function LlmFields({ data, patch }) {
  // Modo del LLM: 'node' (se define aquí), 'platform' o 'tenant' (integración guardada).
  const llmMode = data.llmMode || 'node';
  const provider = data.provider || 'deepseek';
  const isWeb = provider === 'deepseek_web';
  const fallbackProvider = data.fallbackProvider || 'deepseek';
  // El backend manda un PREVIEW enmascarado (contiene '•', p.ej. "••••cdef") cuando
  // ya hay una key guardada. Mostramos ese preview como pista y dejamos el input
  // vacío para escribir una nueva; si no se escribe, el backend conserva la real.
  const maskOf = (v) => (typeof v === 'string' && v.includes('•') ? v : null);
  const apiKeyMask = maskOf(data.apiKey);
  // El fallback efectivo usa fallbackApiKey y, si está vacío, la apiKey del nodo
  // (así lo resuelve ai-runner: fallbackApiKey || apiKey). Mostramos la que aplica.
  const fbKeyMask = maskOf(data.fallbackApiKey) || maskOf(data.apiKey);
  const keyHint = (mask) =>
    mask
      ? `Guardada: ${mask} · escribe para reemplazarla`
      : 'Por seguridad no se muestra al reabrir. Si ya la guardaste, déjala vacía para conservarla.';
  return (
    <>
      <Field label="Origen del LLM">
        <select
          className="input"
          value={llmMode}
          onChange={(e) => patch({ llmMode: e.target.value })}
        >
          <option value="node">Definir en este nodo</option>
          <option value="platform">Usar LLM de plataforma</option>
          <option value="tenant">Usar LLM de la empresa</option>
        </select>
      </Field>
      {llmMode === 'node' && (
        <>
          <Field label="Proveedor">
            <select
              className="input"
              value={provider}
              onChange={(e) => patch({ provider: e.target.value })}
            >
              {LLM_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          {isWeb ? (
            <>
              <p style={{ fontSize: 12, opacity: 0.7, margin: '4px 0 8px' }}>
                Usa la sesión web de DeepSeek (sin costo de API). Si la sesión falla, el
                motor cae en silencio al proveedor de fallback de abajo.
              </p>
              <Field label="Fallback · Proveedor">
                <select
                  className="input"
                  value={fallbackProvider}
                  onChange={(e) => patch({ fallbackProvider: e.target.value })}
                >
                  {FALLBACK_PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fallback · Modelo">
                <input
                  className="input"
                  value={data.fallbackModel || ''}
                  placeholder="deepseek-chat · gpt-4o-mini · claude-sonnet-4-6"
                  onChange={(e) => patch({ fallbackModel: e.target.value })}
                />
              </Field>
              <Field label="Fallback · API key">
                <input
                  type="password"
                  className="input"
                  value={fbKeyMask ? '' : data.fallbackApiKey || ''}
                  placeholder={fbKeyMask || 'sk-… / AIza…'}
                  onChange={(e) => patch({ fallbackApiKey: e.target.value })}
                />
                <p style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{keyHint(fbKeyMask)}</p>
              </Field>
              {needsBaseUrl(fallbackProvider) && (
                <Field label="Fallback · Base URL (opcional)">
                  <input
                    className="input"
                    value={data.fallbackBaseUrl || ''}
                    placeholder="https://mi-endpoint/v1"
                    onChange={(e) => patch({ fallbackBaseUrl: e.target.value })}
                  />
                </Field>
              )}
            </>
          ) : (
            <>
              <Field label="Modelo">
                <input
                  className="input"
                  value={data.model || ''}
                  placeholder="deepseek-chat · gpt-4o-mini · claude-sonnet-4-6"
                  onChange={(e) => patch({ model: e.target.value })}
                />
              </Field>
              <Field label="API key">
                <input
                  type="password"
                  className="input"
                  value={apiKeyMask ? '' : data.apiKey || ''}
                  placeholder={apiKeyMask || 'sk-… / AIza…'}
                  onChange={(e) => patch({ apiKey: e.target.value })}
                />
                <p style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{keyHint(apiKeyMask)}</p>
              </Field>
              {needsBaseUrl(provider) && (
                <Field label="Base URL (opcional)">
                  <input
                    className="input"
                    value={data.baseUrl || ''}
                    placeholder="https://mi-endpoint/v1"
                    onChange={(e) => patch({ baseUrl: e.target.value })}
                  />
                </Field>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
