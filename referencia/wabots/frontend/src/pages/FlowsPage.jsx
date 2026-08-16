import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listFlows, listTemplates, createFlow, getFlow, deleteFlow } from '../lib/flowsApi';
import Modal from '../components/Modal';
import { useAsync } from '../hooks/useAsync';
import { IconFlow } from '../components/icons';

const EMPTY_GRAPH = { nodes: [], edges: [] };

// Listado de flujos (filtrable por ?tenant=:id) y creación desde cero o plantilla.
export default function FlowsPage() {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant') || '';

  const { data, loading, error, reload } = useAsync(
    () => Promise.all([listFlows(tenantId), listTemplates()]),
    [tenantId],
  );
  const [fl, tpl] = data || [];
  const flows = Array.isArray(fl) ? fl : [];
  const templates = Array.isArray(tpl) ? tpl : [];

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);

  // Borrado de flujo (con confirmación). El backend, al borrar, pone en null el
  // activeFlowId de las empresas que lo usaban (queda sin flujo activo).
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteFlow(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err?.response?.data?.message || 'No se pudo borrar el flujo');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      let graph = EMPTY_GRAPH;
      if (templateId) {
        // Los listados ya no traen el grafo (solo metadatos); se pide completo
        // únicamente al clonar la plantilla elegida.
        const t = await getFlow(templateId);
        if (t?.graph) graph = t.graph;
      }
      await createFlow({
        name,
        tenantId: tenantId || undefined,
        graph,
      });
      setModalOpen(false);
      setName('');
      setTemplateId('');
      reload();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'No se pudo crear el flujo');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Flujos</h1>
          <p className="text-sm text-slate-500">
            {tenantId ? 'Flujos de la empresa seleccionada' : 'Todos los flujos'}
          </p>
        </div>
        <button className="btn-primary self-start sm:self-auto" onClick={() => setModalOpen(true)}>
          + Nuevo flujo
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-dark">
          {error?.response?.data?.message || 'No se pudieron cargar los flujos'}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-28 w-full rounded-2xl" />)}
        </div>
      ) : flows.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900/[0.04] text-2xl">⌥</span>
          <p className="text-sm text-slate-500">No hay flujos todavía.</p>
          <button className="btn-ghost mt-2" onClick={() => setModalOpen(true)}>
            + Crear el primero
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flows.map((f) => (
            <div
              key={f.id}
              className="card card-hover group relative flex flex-col justify-between"
            >
              <button
                type="button"
                title="Borrar flujo"
                aria-label={`Borrar flujo ${f.name}`}
                onClick={() => setDeleteTarget(f)}
                className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-danger/10 hover:text-danger-dark"
              >
                🗑
              </button>
              <Link to={`/flows/${f.id}/editor`} className="flex items-start gap-3 pr-8">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                  <IconFlow className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-900">{f.name}</h3>
                  <span className="chip mt-1.5">{f.nodesCount ?? 0} nodos</span>
                </div>
              </Link>
              <div className="mt-4 flex justify-end">
                <Link
                  to={`/flows/${f.id}/editor`}
                  className="text-sm font-medium text-brand transition-transform group-hover:translate-x-0.5"
                >
                  Editar →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !creating && setModalOpen(false)}
        title="Nuevo flujo"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setModalOpen(false)} disabled={creating}>
              Cancelar
            </button>
            <button className="btn-primary" form="create-flow-form" disabled={creating}>
              {creating ? 'Creando…' : 'Crear'}
            </button>
          </>
        }
      >
        <form id="create-flow-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label" htmlFor="flow-name">Nombre del flujo</label>
            <input
              id="flow-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bienvenida"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="flow-template">Crear desde plantilla (opcional)</label>
            <select
              id="flow-template"
              className="input"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">Flujo en blanco</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {!tenantId && (
            <p className="rounded-lg border border-warn/25 bg-warn/10 px-3 py-2 text-xs text-amber-700">
              No hay empresa seleccionada. Abra los flujos desde una empresa para asociarlos.
            </p>
          )}
          {formError && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-dark">
              {formError}
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Borrar flujo"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </button>
            <button
              className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:bg-danger-dark disabled:opacity-60"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Borrando…' : 'Borrar'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            ¿Seguro que quieres borrar el flujo <strong>{deleteTarget?.name}</strong>? Esta acción no
            se puede deshacer.
          </p>
          <p className="rounded-lg border border-warn/25 bg-warn/10 px-3 py-2 text-xs text-amber-700">
            Si alguna empresa lo tiene como flujo activo, quedará <strong>sin flujo activo</strong> (su
            bot dejará de responder hasta que le asignes otro).
          </p>
          {deleteError && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-dark">
              {deleteError}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
