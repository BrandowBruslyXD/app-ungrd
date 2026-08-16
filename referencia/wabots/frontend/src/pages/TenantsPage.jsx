import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listTenants, createTenant, deleteTenant } from '../lib/tenantsApi';
import { setTenantServiceStatus, tenantToggleErrorMessage } from '../lib/tenantActions';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import { useAsync } from '../hooks/useAsync';

// Listado y gestión de empresas (tenants).
export default function TenantsPage() {
  const { data, loading, error: loadError, reload } = useAsync(listTenants, []);
  const tenants = Array.isArray(data) ? data : [];

  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', notes: '' });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);

  const error =
    actionError ||
    (loadError ? loadError?.response?.data?.message || 'No se pudieron cargar las empresas' : null);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      await createTenant({ name: form.name, notes: form.notes });
      setModalOpen(false);
      setForm({ name: '', notes: '' });
      reload();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'No se pudo crear la empresa');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (tenant) => {
    if (!tenant?.id) return;
    const ok = window.confirm(
      `¿Eliminar la empresa "${tenant.name}"?\n\nSe borrarán también sus flujos, conversaciones, integraciones y recargas. Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    setBusyId(tenant.id);
    setActionError(null);
    try {
      await deleteTenant(tenant.id);
      reload();
    } catch (e) {
      setActionError(e?.response?.data?.message || 'No se pudo eliminar la empresa');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggle = async (tenant, next) => {
    if (!tenant?.id) return;
    setBusyId(tenant.id);
    setActionError(null);
    try {
      await setTenantServiceStatus(tenant.id, next);
      reload();
    } catch (e) {
      setActionError(tenantToggleErrorMessage(e, next));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Empresas</h1>
          <p className="text-sm text-slate-500">Administración de los tenants de la plataforma</p>
        </div>
        <button className="btn-primary self-start sm:self-auto" onClick={() => setModalOpen(true)}>
          + Nueva empresa
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-dark">
          {error}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-6 text-slate-500">Cargando…</div>
        ) : (tenants || []).length === 0 ? (
          <div className="p-6 text-slate-500">
            No hay empresas. Cree la primera con “Nueva empresa”.
          </div>
        ) : (
          <div className="scroll-x">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Slug</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Servicio</th>
                <th className="px-5 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {(tenants || []).map((t) => (
                <tr key={t?.id} className="hover:bg-slate-900/[0.04]">
                  <td className="px-5 py-3 font-medium text-slate-900">{t?.name}</td>
                  <td className="px-5 py-3 text-slate-500">{t?.slug}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={t?.status} />
                  </td>
                  <td className="px-5 py-3">
                    <Toggle
                      on={t?.status === 'ACTIVE'}
                      disabled={busyId === t?.id}
                      onChange={(next) => handleToggle(t, next)}
                      ariaLabel={`Activar o suspender la empresa ${t?.name || ''}`.trim()}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-3">
                      <Link to={`/tenants/${t.id}`} className="text-brand hover:underline">
                        Administrar
                      </Link>
                      <Link
                        to={`/flows?tenant=${t.id}`}
                        className="text-accent hover:underline"
                      >
                        Flujos
                      </Link>
                      <button
                        onClick={() => handleDelete(t)}
                        disabled={busyId === t?.id}
                        className="text-danger-dark hover:underline disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => !creating && setModalOpen(false)}
        title="Nueva empresa"
        footer={
          <>
            <button
              className="btn-ghost"
              onClick={() => setModalOpen(false)}
              disabled={creating}
            >
              Cancelar
            </button>
            <button className="btn-primary" form="create-tenant-form" disabled={creating}>
              {creating ? 'Creando…' : 'Crear'}
            </button>
          </>
        }
      >
        <form id="create-tenant-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label" htmlFor="tenant-name">Nombre</label>
            <input
              id="tenant-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Mi empresa S.A."
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="tenant-notes">Notas (opcional)</label>
            <textarea
              id="tenant-notes"
              className="input min-h-[80px]"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Información interna…"
            />
          </div>
          {formError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-dark">
              {formError}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
