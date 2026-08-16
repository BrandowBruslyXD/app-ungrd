import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getTenant,
  updateTenant,
  connectWhatsapp,
  listIntegrations,
} from '../lib/tenantsApi';
import { setTenantServiceStatus, tenantToggleErrorMessage } from '../lib/tenantActions';
import { listFlows } from '../lib/flowsApi';
import { subscribeTenant } from '../lib/socket';
import StatusBadge from '../components/StatusBadge';
import Toggle from '../components/Toggle';
import Section from '../components/tenant/Section';
import WhatsappChannelSection from '../components/tenant/WhatsappChannelSection';
import GoogleConnectionsSection from '../components/tenant/GoogleConnectionsSection';
import IntegrationsSection from '../components/tenant/IntegrationsSection';
import ChatsSection from '../components/tenant/ChatsSection';
import MediaSection from '../components/tenant/MediaSection';

// Detalle y administración completa de una empresa.
export default function TenantDetailPage() {
  const { id } = useParams();

  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Datos editables
  const [form, setForm] = useState({ name: '', notes: '', activeFlowId: '', clientEmail: '' });
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState(null);

  // WhatsApp en vivo
  const [wa, setWa] = useState({ connectionState: null, qr: null, phoneNumber: null });
  const [connecting, setConnecting] = useState(false);
  const [waError, setWaError] = useState(null);
  const [waNotice, setWaNotice] = useState(null);

  // Servicio ON/OFF
  const [busyStatus, setBusyStatus] = useState(false);

  // Flujos
  const [flows, setFlows] = useState([]);
  const [savingFlow, setSavingFlow] = useState(false);

  // Integraciones
  const [integrations, setIntegrations] = useState([]);

  const loadTenant = useCallback(async () => {
    const data = await getTenant(id);
    setTenant(data);
    setForm({
      name: data?.name || '',
      notes: data?.notes || '',
      activeFlowId: data?.activeFlowId || '',
      clientEmail: data?.clientEmail || '',
    });
    if (data?.connectionState || data?.phoneNumber) {
      setWa((w) => ({
        ...w,
        connectionState: data.connectionState ?? w.connectionState,
        phoneNumber: data.phoneNumber ?? w.phoneNumber,
      }));
    }
  }, [id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [, fl, integ] = await Promise.all([
          loadTenant(),
          listFlows(id).catch(() => []),
          listIntegrations(id).catch(() => []),
        ]);
        if (!alive) return;
        setFlows(Array.isArray(fl) ? fl : []);
        setIntegrations(Array.isArray(integ) ? integ : []);
      } catch (e) {
        if (alive) setError(e?.response?.data?.message || 'No se pudo cargar la empresa');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, loadTenant]);

  // Suscripción en vivo al estado de WhatsApp del tenant.
  // Si el socket falla, no debe tumbar la página: todo va en try/catch.
  useEffect(() => {
    let unsub;
    try {
      unsub = subscribeTenant(id, (payload) => {
        if (!payload) return;
        setWa((w) => ({
          connectionState: payload.connectionState ?? w.connectionState,
          qr: payload.qr ?? w.qr,
          phoneNumber: payload.phoneNumber ?? w.phoneNumber,
        }));
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('No se pudo suscribir al socket del tenant:', e);
    }
    return () => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch {
        // limpieza silenciosa
      }
    };
  }, [id]);

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    // Validación simple de formato de correo (opcional: vacío es válido).
    const email = (form.clientEmail || '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInfoMsg({ type: 'err', text: 'El correo del cliente no tiene un formato válido' });
      return;
    }
    setSavingInfo(true);
    setInfoMsg(null);
    try {
      const updated = await updateTenant(id, {
        name: form.name,
        notes: form.notes,
        clientEmail: email,
      });
      setTenant((t) => ({ ...t, ...updated }));
      setInfoMsg({ type: 'ok', text: 'Datos guardados' });
    } catch (err) {
      setInfoMsg({ type: 'err', text: err?.response?.data?.message || 'Error al guardar' });
    } finally {
      setSavingInfo(false);
    }
  };

  const handleToggleStatus = async (next) => {
    setBusyStatus(true);
    setWaError(null);
    try {
      await setTenantServiceStatus(id, next);
      // Si el recargado falla no debe propagarse al render.
      await loadTenant().catch(() => {});
    } catch (err) {
      setWaError(tenantToggleErrorMessage(err, next));
    } finally {
      setBusyStatus(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setWaError(null);
    setWaNotice(null);
    try {
      const data = await connectWhatsapp(id);
      setWa((w) => ({
        connectionState: data?.connectionState ?? w.connectionState,
        qr: data?.qr ?? w.qr,
        phoneNumber: data?.phoneNumber ?? w.phoneNumber,
      }));
      // Si activó el servicio pero no llegó un QR, se avisa en vez de
      // intentar renderizar un QR nulo.
      const qr = data?.qr;
      if (!qr || typeof qr !== 'string' || qr.trim() === '') {
        setWaNotice(
          'Servicio activado, pero WhatsApp aún no está disponible (configure Evolution API)',
        );
      }
    } catch (err) {
      setWaError(
        err?.response?.data?.message ||
          'No se pudo activar: WhatsApp/Evolution no está disponible',
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveFlow = async () => {
    setSavingFlow(true);
    try {
      const updated = await updateTenant(id, { activeFlowId: form.activeFlowId || null });
      setTenant((t) => ({ ...t, ...updated }));
      setInfoMsg({ type: 'ok', text: 'Flujo activo actualizado' });
    } catch (err) {
      setInfoMsg({ type: 'err', text: err?.response?.data?.message || 'Error al guardar flujo' });
    } finally {
      setSavingFlow(false);
    }
  };

  const refreshIntegrations = async () => {
    const data = await listIntegrations(id).catch(() => []);
    setIntegrations(Array.isArray(data) ? data : []);
  };

  if (loading) return <div className="text-slate-500">Cargando…</div>;
  if (error)
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-dark">
        {error}
      </div>
    );
  if (!tenant) return <div className="text-slate-500">Empresa no encontrada.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/tenants" className="text-sm text-slate-500 hover:text-slate-900">
            ← Empresas
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{tenant.name}</h1>
          <StatusBadge status={tenant.status} />
        </div>
        <Link to={`/flows?tenant=${id}`} className="text-sm text-accent hover:underline">
          Ir a flujos →
        </Link>
      </div>

      {/* Servicio ON/OFF */}
      <Section
        title="Estado del servicio"
        description="Active o suspenda el procesamiento de mensajes."
        actions={
          <Toggle
            on={tenant.status === 'ACTIVE'}
            disabled={busyStatus}
            onChange={handleToggleStatus}
            ariaLabel="Activar o suspender el servicio de la empresa"
          />
        }
      />

      {/* Datos de la empresa */}
      <Section title="Datos de la empresa" description="Información general editable.">
        <form onSubmit={handleSaveInfo} className="space-y-4">
          <div>
            <label className="label" htmlFor="tenant-detail-name">Nombre</label>
            <input
              id="tenant-detail-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="tenant-detail-notes">Notas</label>
            <textarea
              id="tenant-detail-notes"
              className="input min-h-[80px]"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="tenant-detail-email">Correo del cliente (para invitaciones)</label>
            <input
              id="tenant-detail-email"
              type="email"
              className="input"
              value={form.clientEmail}
              placeholder="cliente@correo.com"
              onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500">
              Se usa como <code>{'{{clienteEmail}}'}</code> en los flujos para invitarlo a sus
              citas.
            </p>
          </div>
          {infoMsg && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                infoMsg.type === 'ok'
                  ? 'border border-brand/30 bg-brand/10 text-brand'
                  : 'border border-danger/30 bg-danger/10 text-danger-dark'
              }`}
            >
              {infoMsg.text}
            </div>
          )}
          <button className="btn-primary" disabled={savingInfo}>
            {savingInfo ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </Section>

      {/* Canal de WhatsApp: se elige y configura el proveedor desde aquí. */}
      <WhatsappChannelSection
        tenantId={id}
        provider={tenant?.channelProvider || 'EVOLUTION'}
        config={tenant?.channelConfig || {}}
        onChanged={loadTenant}
      />

      {/* WhatsApp por QR (solo cuando el canal es Evolution) */}
      {(tenant?.channelProvider || 'EVOLUTION') === 'EVOLUTION' && (
      <Section
        title="WhatsApp (Evolution · QR)"
        description="Conecte la instancia escaneando el código QR."
        actions={
          <button className="btn-primary" onClick={handleConnect} disabled={connecting}>
            {connecting ? 'Conectando…' : 'Conectar WhatsApp'}
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-sm">
            <span className="text-slate-500">Estado de conexión: </span>
            <span className="font-medium text-slate-900">
              {wa.connectionState || 'desconocido'}
            </span>
            {wa.phoneNumber && (
              <div className="mt-1 text-slate-500">
                Número: <span className="text-slate-900">{wa.phoneNumber}</span>
              </div>
            )}
          </div>

          {/* El QR solo se renderiza si es un string no vacío. */}
          {typeof wa.qr === 'string' && wa.qr.trim() !== '' ? (
            <div className="rounded-lg bg-white p-3">
              <img
                src={wa.qr.startsWith('data:') ? wa.qr : `data:image/png;base64,${wa.qr}`}
                alt="Código QR de WhatsApp"
                className="h-44 w-44"
              />
            </div>
          ) : (
            <div className="flex h-44 w-44 items-center justify-center rounded-lg border border-dashed border-slate-200/80 text-center text-xs text-slate-500">
              Pulse “Conectar WhatsApp” para generar el QR
            </div>
          )}
        </div>
        {waNotice && (
          <div className="rounded-xl border border-warn/25 bg-warn/10 px-3 py-2 text-sm text-amber-700">
            {waNotice}
          </div>
        )}
        {waError && <div className="text-sm text-danger-dark">{waError}</div>}
      </Section>
      )}

      {/* Flujo activo */}
      <Section
        title="Flujo activo"
        description="Seleccione el flujo que atenderá las conversaciones."
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="label" htmlFor="tenant-active-flow">Flujo</label>
            <select
              id="tenant-active-flow"
              className="input"
              value={form.activeFlowId}
              onChange={(e) => setForm({ ...form, activeFlowId: e.target.value })}
            >
              <option value="">— Sin flujo activo —</option>
              {(flows || []).map((f) => (
                <option key={f?.id} value={f?.id}>
                  {f?.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={handleSaveFlow} disabled={savingFlow}>
            {savingFlow ? 'Guardando…' : 'Guardar flujo'}
          </button>
        </div>
        {(flows || []).length === 0 && (
          <p className="text-xs text-slate-500">
            Esta empresa no tiene flujos.{' '}
            <Link to={`/flows?tenant=${id}`} className="text-brand hover:underline">
              Crear uno
            </Link>
            .
          </p>
        )}
      </Section>

      {/* Integraciones */}
      <IntegrationsSection
        tenantId={id}
        integrations={integrations}
        onChanged={refreshIntegrations}
      />

      {/* Conexiones de Google (Gmail + Calendar) por empresa */}
      <GoogleConnectionsSection
        tenantId={id}
        integrations={integrations}
        onChanged={refreshIntegrations}
      />

      {/* Conversaciones (lista + historial completo por chat) */}
      <ChatsSection tenantId={id} />

      {/* Archivos y media archivados (audios/imágenes) */}
      <MediaSection tenantId={id} />
    </div>
  );
}
