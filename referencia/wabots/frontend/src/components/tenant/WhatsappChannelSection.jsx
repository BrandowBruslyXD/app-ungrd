// Canal de WhatsApp de la empresa: Evolution (QR) / Twilio / Meta.
import { useState } from 'react';
import { configureTwilioChannel, configureMetaChannel, resetChannel } from '../../lib/tenantsApi';
import Modal from '../Modal';
import Section from './Section';
import { TwilioGuide, MetaGuide } from './guides';

export default function WhatsappChannelSection({ tenantId, provider, config, onChanged }) {
  const [sel, setSel] = useState(provider || 'EVOLUTION');
  const [tw, setTw] = useState({
    accountSid: config?.accountSid || '',
    apiKeySid: config?.apiKeySid || '',
    apiKeySecret: '',
    fromNumber: config?.fromNumber || '',
    authToken: '',
  });
  const [mt, setMt] = useState({
    phoneNumberId: config?.phoneNumberId || '',
    accessToken: '',
    verifyToken: config?.verifyToken || '',
    appSecret: '',
    graphVersion: config?.graphVersion || '',
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [guide, setGuide] = useState(null); // 'twilio' | 'meta' | null
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://TU_DOMINIO';

  const label = { EVOLUTION: 'Evolution (QR)', TWILIO: 'Twilio', META: 'Meta / WhatsApp Cloud API' };

  const saveTwilio = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await configureTwilioChannel(tenantId, tw);
      setMsg({ type: 'ok', text: 'Canal Twilio vinculado.' });
      setTw((s) => ({ ...s, apiKeySecret: '', authToken: '' }));
      await onChanged?.();
    } catch (e) {
      setMsg({ type: 'err', text: e?.response?.data?.message || 'No se pudo guardar Twilio' });
    } finally {
      setBusy(false);
    }
  };

  const saveMeta = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await configureMetaChannel(tenantId, mt);
      setMsg({ type: 'ok', text: 'Canal Meta vinculado.' });
      setMt((s) => ({ ...s, accessToken: '', appSecret: '' }));
      await onChanged?.();
    } catch (e) {
      setMsg({ type: 'err', text: e?.response?.data?.message || 'No se pudo guardar Meta' });
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    if (!window.confirm('¿Desvincular el canal actual y volver a Evolution (QR)?')) return;
    setBusy(true);
    setMsg(null);
    try {
      await resetChannel(tenantId);
      setSel('EVOLUTION');
      setMsg({ type: 'ok', text: 'Canal desvinculado. Ahora usa Evolution (QR).' });
      await onChanged?.();
    } catch (e) {
      setMsg({ type: 'err', text: e?.response?.data?.message || 'No se pudo desvincular' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="Canal de WhatsApp"
      description="Elija y configure desde aquí cómo se conecta esta empresa a WhatsApp."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">Canal actual:</span>
        <span className="badge border-brand/30 bg-brand/10 text-brand-dark">{label[provider] || provider}</span>
        {provider !== 'EVOLUTION' && (
          <button className="btn-ghost ml-auto" onClick={unlink} disabled={busy}>
            Desvincular
          </button>
        )}
      </div>

      {/* Selector de proveedor */}
      <div className="mb-4 flex flex-wrap gap-2">
        {['EVOLUTION', 'TWILIO', 'META'].map((p) => (
          <button
            key={p}
            onClick={() => setSel(p)}
            className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
              sel === p
                ? 'border-brand bg-brand/10 text-brand-dark'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label[p]}
          </button>
        ))}
      </div>

      {sel === 'EVOLUTION' && (
        <p className="text-sm text-slate-500">
          Evolution usa el código QR (más abajo). Es el canal por defecto, ideal para empezar sin cuenta de proveedor.
        </p>
      )}

      {sel === 'TWILIO' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Conecte un número de WhatsApp vía Twilio.</p>
            <button type="button" className="btn-ghost shrink-0" onClick={() => setGuide('twilio')}>
              📖 Ver tutorial
            </button>
          </div>
          <div>
            <label className="label" htmlFor="tw-account-sid">Account SID</label>
            <input id="tw-account-sid" className="input" value={tw.accountSid} onChange={(e) => setTw({ ...tw, accountSid: e.target.value })} placeholder="ACxxxxxxxx" />
          </div>
          <div>
            <label className="label" htmlFor="tw-api-key-sid">API Key SID</label>
            <input id="tw-api-key-sid" className="input" value={tw.apiKeySid} onChange={(e) => setTw({ ...tw, apiKeySid: e.target.value })} placeholder="SKxxxxxxxx" />
          </div>
          <div>
            <label className="label" htmlFor="tw-api-key-secret">API Key Secret</label>
            <input id="tw-api-key-secret" type="password" className="input" value={tw.apiKeySecret} onChange={(e) => setTw({ ...tw, apiKeySecret: e.target.value })} placeholder="•••• se guarda cifrada" />
          </div>
          <div>
            <label className="label" htmlFor="tw-from-number">Número remitente</label>
            <input id="tw-from-number" className="input" value={tw.fromNumber} onChange={(e) => setTw({ ...tw, fromNumber: e.target.value })} placeholder="whatsapp:+14155238886" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="tw-auth-token">Auth Token (opcional, requerido para validar webhooks)</label>
            <input id="tw-auth-token" type="password" className="input" value={tw.authToken} onChange={(e) => setTw({ ...tw, authToken: e.target.value })} placeholder="•••• se guarda cifrado" />
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary" onClick={saveTwilio} disabled={busy}>
              {busy ? 'Guardando…' : 'Vincular Twilio'}
            </button>
          </div>
        </div>
      )}

      {sel === 'META' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Conecte el número oficial vía WhatsApp Cloud API (Meta).</p>
            <button type="button" className="btn-ghost shrink-0" onClick={() => setGuide('meta')}>
              📖 Ver tutorial
            </button>
          </div>
          <div>
            <label className="label" htmlFor="mt-phone-number-id">Phone Number ID</label>
            <input id="mt-phone-number-id" className="input" value={mt.phoneNumberId} onChange={(e) => setMt({ ...mt, phoneNumberId: e.target.value })} placeholder="1234567890" />
          </div>
          <div>
            <label className="label" htmlFor="mt-verify-token">Verify Token (webhook)</label>
            <input id="mt-verify-token" className="input" value={mt.verifyToken} onChange={(e) => setMt({ ...mt, verifyToken: e.target.value })} placeholder="el que configure en la App de Meta" />
          </div>
          <div>
            <label className="label" htmlFor="mt-access-token">Access Token (WABA)</label>
            <input id="mt-access-token" type="password" className="input" value={mt.accessToken} onChange={(e) => setMt({ ...mt, accessToken: e.target.value })} placeholder="•••• se guarda cifrado" />
          </div>
          <div>
            <label className="label" htmlFor="mt-app-secret">App Secret</label>
            <input id="mt-app-secret" type="password" className="input" value={mt.appSecret} onChange={(e) => setMt({ ...mt, appSecret: e.target.value })} placeholder="•••• se guarda cifrado" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="mt-graph-version">Versión Graph API (opcional)</label>
            <input id="mt-graph-version" className="input" value={mt.graphVersion} onChange={(e) => setMt({ ...mt, graphVersion: e.target.value })} placeholder="v20.0" />
          </div>
          <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            En su App de Meta configure el webhook: <span className="font-mono text-slate-700">https://TU_DOMINIO/api/webhooks/meta</span> con el mismo Verify Token.
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary" onClick={saveMeta} disabled={busy}>
              {busy ? 'Guardando…' : 'Vincular Meta'}
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div className={`mt-3 text-sm ${msg.type === 'ok' ? 'text-brand-dark' : 'text-danger-dark'}`}>{msg.text}</div>
      )}

      <Modal
        open={!!guide}
        onClose={() => setGuide(null)}
        title={guide === 'meta' ? 'Tutorial · Meta (WhatsApp Cloud API)' : 'Tutorial · Twilio (WhatsApp)'}
        footer={<button className="btn-primary" onClick={() => setGuide(null)}>Entendido</button>}
      >
        {guide === 'twilio' ? <TwilioGuide origin={origin} /> : <MetaGuide origin={origin} />}
      </Modal>
    </Section>
  );
}
