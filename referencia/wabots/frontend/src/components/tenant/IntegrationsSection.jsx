// Integraciones externas de la empresa (con su propio modal de alta/edición).
import { useState } from 'react';
import { createIntegration, updateIntegration, deleteIntegration } from '../../lib/tenantsApi';
import Modal from '../Modal';
import Section from './Section';

const INTEGRATION_TYPES = ['AI_API', 'GMAIL', 'CALENDAR', 'HTTP'];

function emptyConfigFor(type) {
  if (type === 'AI_API') return { baseUrl: '', apiKey: '', model: '' };
  return {};
}

export default function IntegrationsSection({ tenantId, integrations, onChanged }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [type, setType] = useState('AI_API');
  const [name, setName] = useState('');
  const [aiConfig, setAiConfig] = useState(emptyConfigFor('AI_API'));
  const [jsonConfig, setJsonConfig] = useState('{}');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const openNew = () => {
    setEditing(null);
    setType('AI_API');
    setName('');
    setAiConfig(emptyConfigFor('AI_API'));
    setJsonConfig('{}');
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (integ) => {
    setEditing(integ);
    setType(integ.type);
    setName(integ.name || '');
    if (integ.type === 'AI_API') {
      setAiConfig({
        baseUrl: integ.config?.baseUrl || '',
        apiKey: integ.config?.apiKey || '',
        model: integ.config?.model || '',
      });
    } else {
      setJsonConfig(JSON.stringify(integ.config || {}, null, 2));
    }
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      let config;
      if (type === 'AI_API') {
        config = { ...aiConfig };
      } else {
        try {
          config = jsonConfig.trim() ? JSON.parse(jsonConfig) : {};
        } catch {
          setFormError('La configuración JSON no es válida.');
          setSaving(false);
          return;
        }
      }
      const payload = { type, name, config };
      if (editing) await updateIntegration(editing.id, payload);
      else await createIntegration(tenantId, payload);
      setModalOpen(false);
      await onChanged();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'No se pudo guardar la integración');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (integ) => {
    if (!window.confirm(`¿Eliminar la integración "${integ.name || integ.type}"?`)) return;
    try {
      await deleteIntegration(integ.id);
      await onChanged();
    } catch {
      // silencioso; el listado se mantiene
    }
  };

  return (
    <Section
      title="Integraciones"
      description="Conexiones externas usadas por los nodos del flujo."
      actions={
        <button className="btn-ghost" onClick={openNew}>
          + Nueva integración
        </button>
      }
    >
      {(integrations || []).length === 0 ? (
        <p className="text-sm text-slate-500">No hay integraciones configuradas.</p>
      ) : (
        <ul className="divide-y divide-slate-200/80">
          {(integrations || []).map((it) => (
            <li key={it?.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-slate-900">{it?.name || it?.type}</div>
                <div className="text-xs text-slate-500">{it?.type}</div>
              </div>
              <div className="flex gap-3 text-sm">
                <button className="text-brand hover:underline" onClick={() => openEdit(it)}>
                  Editar
                </button>
                <button className="text-danger-dark hover:underline" onClick={() => handleDelete(it)}>
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Editar integración' : 'Nueva integración'}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <button className="btn-primary" form="integration-form" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <form id="integration-form" onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label" htmlFor="integration-type">Tipo</label>
            <select
              id="integration-type"
              className="input"
              value={type}
              onChange={(e) => {
                const t = e.target.value;
                setType(t);
                if (t === 'AI_API') setAiConfig(emptyConfigFor('AI_API'));
                else setJsonConfig('{}');
              }}
              disabled={!!editing}
            >
              {INTEGRATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="integration-name">Nombre</label>
            <input
              id="integration-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi integración"
              required
            />
          </div>

          {type === 'AI_API' ? (
            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="integration-base-url">Base URL</label>
                <input
                  id="integration-base-url"
                  className="input"
                  value={aiConfig.baseUrl}
                  onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
              </div>
              <div>
                <label className="label" htmlFor="integration-api-key">API Key</label>
                <input
                  id="integration-api-key"
                  className="input"
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  placeholder="sk-…"
                />
              </div>
              <div>
                <label className="label" htmlFor="integration-model">Modelo</label>
                <input
                  id="integration-model"
                  className="input"
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                  placeholder="gpt-4o-mini"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="label" htmlFor="integration-json">Configuración (JSON)</label>
              <textarea
                id="integration-json"
                className="input min-h-[120px] font-mono text-xs"
                value={jsonConfig}
                onChange={(e) => setJsonConfig(e.target.value)}
                placeholder='{ "key": "value" }'
              />
            </div>
          )}

          {formError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-dark">
              {formError}
            </div>
          )}
        </form>
      </Modal>
    </Section>
  );
}
