// Conexiones Google (Gmail + Calendar) POR EMPRESA: vincular/desvincular.
// Cada empresa conecta SUS propias cuentas → el bot agenda/envía con las
// credenciales de esa empresa (separación de datos, sin cruzar información).
import { useState } from 'react';
import api from '../../lib/api';
import { deleteIntegration } from '../../lib/tenantsApi';
import Section from './Section';

/* Fila de conexión, a nivel de módulo para conservar su identidad entre
   renders (evita el remount que provocaba definirla dentro del componente). */
function ConnectionRow({ type, nombre, desc, integration, busy, onConnect, onDisconnect }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white/60 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{nombre}</span>
          {integration ? (
            <span className="badge border-brand/30 bg-brand/10 text-brand-dark">Conectado</span>
          ) : (
            <span className="badge border-slate-200 bg-slate-100 text-slate-500">No conectado</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
      </div>
      {integration ? (
        <button className="btn-ghost" onClick={() => onDisconnect(integration, nombre)} disabled={busy === type}>
          Desvincular
        </button>
      ) : (
        <button className="btn-primary" onClick={() => onConnect(type === 'GMAIL' ? 'gmail' : 'calendar')} disabled={busy === type}>
          {busy === type ? 'Abriendo…' : 'Vincular'}
        </button>
      )}
    </div>
  );
}

export default function GoogleConnectionsSection({ tenantId, integrations, onChanged }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);

  // Estado de conexión por tipo (a partir de las integraciones de la empresa).
  const byType = (t) => (integrations || []).find((i) => i?.type === t && i?.isActive !== false);
  const gmail = byType('GMAIL');
  const calendar = byType('CALENDAR');

  const connect = async (type) => {
    // `busy` guarda el tipo en MAYÚSCULAS (como ConnectionRow compara);
    // el backend recibe el tipo en minúsculas.
    setBusy(type.toUpperCase());
    setMsg(null);
    try {
      const res = await api.get('/integrations/google/auth-url', { params: { tenantId, type } });
      const url = res?.data?.data?.url;
      if (!url) throw new Error('Respuesta sin URL de autorización');
      // Abre el consentimiento de Google en otra pestaña; al volver, Actualizar.
      window.open(url, '_blank', 'noopener');
      setMsg({ type: 'ok', text: 'Se abrió la ventana de Google. Autorice y luego pulse “Actualizar estado”.' });
    } catch (err) {
      setMsg({ type: 'err', text: err?.response?.data?.message || err?.message || 'No se pudo iniciar la conexión' });
    } finally {
      setBusy('');
    }
  };

  const disconnect = async (integration, nombre) => {
    if (!integration?.id) return;
    if (!window.confirm(`¿Desvincular ${nombre} de esta empresa?`)) return;
    setBusy(integration.type);
    setMsg(null);
    try {
      await deleteIntegration(integration.id);
      setMsg({ type: 'ok', text: `${nombre} desvinculado.` });
      await onChanged?.();
    } catch (err) {
      setMsg({ type: 'err', text: err?.response?.data?.message || 'No se pudo desvincular' });
    } finally {
      setBusy('');
    }
  };

  return (
    <Section
      title="Conexiones de Google (por empresa)"
      description="Cada empresa vincula sus propias cuentas: así el bot agenda e invita con las credenciales de ESTA empresa, sin mezclar información con otras."
    >
      <div className="space-y-3">
        <ConnectionRow
          type="CALENDAR"
          nombre="Google Calendar"
          desc="Agenda las citas en el calendario propio de la empresa e invita a sus clientes."
          integration={calendar}
          busy={busy}
          onConnect={connect}
          onDisconnect={disconnect}
        />
        <ConnectionRow
          type="GMAIL"
          nombre="Gmail"
          desc="Envía correos (confirmaciones, recordatorios) desde la cuenta de la empresa."
          integration={gmail}
          busy={busy}
          onConnect={connect}
          onDisconnect={disconnect}
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button className="btn-ghost" onClick={() => onChanged?.()} disabled={!!busy}>
          ↻ Actualizar estado
        </button>
        <span className="text-xs text-slate-500">
          Tras autorizar en Google, pulse “Actualizar estado” para ver la conexión.
        </span>
      </div>

      {msg && (
        <div className={`mt-3 text-sm ${msg.type === 'ok' ? 'text-brand-dark' : 'text-danger-dark'}`}>{msg.text}</div>
      )}
    </Section>
  );
}
