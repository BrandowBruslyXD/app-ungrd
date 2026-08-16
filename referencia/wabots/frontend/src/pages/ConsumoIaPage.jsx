import { Fragment, useState } from 'react';
import { getSummary, getTenantConsumo, getProviderBalance } from '../lib/consumoApi';
import { useAsync } from '../hooks/useAsync';

// Formatea un valor numérico (number o string) como entero con separadores.
function fmtNum(value) {
  const n = Number(value) || 0;
  return n.toLocaleString();
}

// Formatea un costo (number o string) en USD con 4 decimales.
function fmtUsd(value) {
  const n = Number(value) || 0;
  return `$${n.toFixed(4)}`;
}

// Formatea un saldo de proveedor: monto con 2 decimales + moneda (p.ej. "$12.34 USD").
function fmtSaldo(value, currency) {
  const n = Number(value) || 0;
  return `$${n.toFixed(2)}${currency ? ` ${currency}` : ''}`;
}

function MetricCard({ label, value, accent, hint }) {
  return (
    <div className="card px-4 py-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1.5 truncate text-2xl font-semibold ${accent || 'text-slate-900'}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
}

/** Nombre legible del proveedor para la tarjeta de saldo. */
function providerLabel(p) {
  const map = { deepseek: 'DeepSeek', openai: 'OpenAI', anthropic: 'Anthropic', google: 'Gemini' };
  return map[(p || '').toLowerCase()] || p || 'proveedor';
}

// Panel de consumo de IA (metering): tokens y dinero por cliente (tenant).
export default function ConsumoIaPage() {
  // Filtro de rango de fechas. Vacío = mes actual (lo resuelve el backend).
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, loading, error } = useAsync(() => {
    // Convierte las fechas (yyyy-mm-dd) a ISO; vacío = sin filtro.
    const params = {
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
    };
    return getSummary(params);
  }, [from, to]);
  // Ante un error de carga no se muestra un resumen desactualizado.
  const summary = error ? null : data || null;

  // SALDO GLOBAL del proveedor (una sola API key de plataforma): se consulta
  // una vez, independiente del rango de fechas del resumen.
  const { data: saldo, loading: saldoLoading } = useAsync(() => getProviderBalance(), []);

  // Detalle por modelo del tenant seleccionado (opcional, al hacer click).
  const [detailId, setDetailId] = useState(null);
  // Etiquetas legibles del ORIGEN del consumo (campo `source` del metering).
  const SOURCE_LABELS = {
    platform: 'Bot — LLM de plataforma',
    tenant: 'Bot — LLM de la empresa',
    node: 'Bot — LLM del nodo',
    builder: 'Constructor de flujos IA (uso interno)',
  };
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Carga (o cierra) el detalle por modelo de un tenant al hacer click en su fila.
  const handleRowClick = async (tenantId) => {
    if (detailId === tenantId) {
      setDetailId(null);
      setDetail(null);
      setDetailError(null);
      return;
    }
    setDetailId(tenantId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const params = {
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      };
      const data = await getTenantConsumo(tenantId, params);
      setDetail(data || null);
    } catch (e) {
      setDetailError(e?.response?.data?.message || 'No se pudo cargar el detalle del cliente');
    } finally {
      setDetailLoading(false);
    }
  };

  const totals = summary?.totals || {};
  const perTenant = Array.isArray(summary?.perTenant) ? summary.perTenant : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Consumo de IA</h1>
        <p className="text-sm text-slate-500">
          Consumo de LLM por cliente: tokens y costo en dólares
        </p>
      </div>

      {/* Filtro de rango de fechas. Vacío = mes actual. */}
      <div className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="label" htmlFor="consumo-from">Desde</label>
          <input
            id="consumo-from"
            type="date"
            className="input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="consumo-to">Hasta</label>
          <input
            id="consumo-to"
            type="date"
            className="input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        {(from || to) && (
          <button
            className="btn-ghost"
            onClick={() => {
              setFrom('');
              setTo('');
            }}
          >
            Limpiar
          </button>
        )}
        <p className="text-xs text-slate-500">Sin fechas se muestra el mes actual.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-dark">
          {error?.response?.data?.message || 'No se pudo cargar el consumo de IA'}
        </div>
      )}

      {loading ? (
        <div className="text-slate-500">Cargando…</div>
      ) : (
        <>
          {/* Totales del rango + saldo GLOBAL del proveedor (una sola API key). */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Llamadas" value={fmtNum(totals.calls)} />
            <MetricCard label="Tokens totales" value={fmtNum(totals.totalTokens)} accent="text-accent" />
            <MetricCard label="Consumo total" value={fmtUsd(totals.costUsd)} accent="text-brand" hint="suma de todas las empresas" />
            <MetricCard
              label={`Saldo actual · ${providerLabel(saldo?.provider)}`}
              value={
                saldoLoading
                  ? '…'
                  : saldo?.available
                    ? fmtSaldo(saldo.balanceUsd, saldo.currency)
                    : 'no disponible'
              }
              accent={saldo?.available ? 'text-emerald-600' : 'text-slate-400'}
              hint={saldo?.available ? 'saldo global de la plataforma' : saldo?.note || 'el proveedor no expone saldo'}
            />
          </div>

          {/* Tabla por cliente */}
          <div className="card overflow-hidden p-0">
            {perTenant.length === 0 ? (
              <div className="p-6 text-slate-500">
                Aún no hay empresas registradas.
              </div>
            ) : (
              <div className="scroll-x">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Cliente</th>
                    <th className="px-5 py-3 text-right font-medium">Llamadas</th>
                    <th className="px-5 py-3 text-right font-medium">Tokens prompt</th>
                    <th className="px-5 py-3 text-right font-medium">Tokens salida</th>
                    <th className="px-5 py-3 text-right font-medium">Tokens total</th>
                    <th className="px-5 py-3 text-right font-medium">Costo (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {perTenant.map((t) => {
                    // La fila "Plataforma (sin tenant)" también es desplegable:
                    // usa el pseudo-id 'platform' para ver NUESTRO consumo
                    // interno (constructor de flujos, pruebas sin empresa).
                    const rowId = t.tenantId || 'platform';
                    const open = detailId === rowId;
                    return (
                      <Fragment key={rowId}>
                        <tr
                          className="cursor-pointer hover:bg-slate-900/[0.04]"
                          onClick={() => handleRowClick(rowId)}
                          role="button"
                          tabIndex={0}
                          aria-expanded={open}
                          onKeyDown={(e) => {
                            // Accesibilidad: Enter/Espacio activan la fila como un botón.
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleRowClick(rowId);
                            }
                          }}
                        >
                          <td className="px-5 py-3 font-medium text-slate-900">
                            {t.tenantName || t.tenantId}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-600">{fmtNum(t.calls)}</td>
                          <td className="px-5 py-3 text-right text-slate-600">{fmtNum(t.promptTokens)}</td>
                          <td className="px-5 py-3 text-right text-slate-600">{fmtNum(t.completionTokens)}</td>
                          <td className="px-5 py-3 text-right text-slate-900">{fmtNum(t.totalTokens)}</td>
                          <td className="px-5 py-3 text-right font-medium text-brand">{fmtUsd(t.costUsd)}</td>
                        </tr>
                        {open && (
                          <tr className="bg-slate-900/[0.04]">
                            <td colSpan={6} className="px-5 py-4">
                              {detailLoading ? (
                                <div className="text-slate-500">Cargando detalle…</div>
                              ) : detailError ? (
                                <div className="text-sm text-danger-dark">{detailError}</div>
                              ) : (detail?.byModel || []).length === 0 &&
                                (detail?.bySource || []).length === 0 ? (
                                <div className="text-sm text-slate-500">
                                  Sin consumo registrado en el rango.
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {(detail?.bySource || []).length > 0 && (
                                    <div className="space-y-2">
                                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Origen del consumo (cuentas claras)
                                      </div>
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                                            <th className="py-2 pr-4 font-medium">Origen</th>
                                            <th className="py-2 pr-4 text-right font-medium">Llamadas</th>
                                            <th className="py-2 pr-4 text-right font-medium">Tokens entrada</th>
                                            <th className="py-2 pr-4 text-right font-medium">Tokens total</th>
                                            <th className="py-2 text-right font-medium">Costo (USD)</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(detail?.bySource || []).map((s) => (
                                            <tr key={s.source} className="border-t border-slate-200/80">
                                              <td className="py-2 pr-4 text-slate-700">
                                                {SOURCE_LABELS[s.source] || s.source}
                                              </td>
                                              <td className="py-2 pr-4 text-right text-slate-600">{fmtNum(s.calls)}</td>
                                              <td className="py-2 pr-4 text-right text-slate-600">{fmtNum(s.promptTokens)}</td>
                                              <td className="py-2 pr-4 text-right text-slate-900">{fmtNum(s.totalTokens)}</td>
                                              <td className="py-2 text-right text-brand">{fmtUsd(s.costUsd)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Detalle por modelo
                                  </div>
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                                        <th className="py-2 pr-4 font-medium">Proveedor</th>
                                        <th className="py-2 pr-4 font-medium">Modelo</th>
                                        <th className="py-2 pr-4 text-right font-medium">Llamadas</th>
                                        <th className="py-2 pr-4 text-right font-medium">Tokens total</th>
                                        <th className="py-2 text-right font-medium">Costo (USD)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(detail?.byModel || []).map((m, i) => (
                                        <tr key={`${m.provider}-${m.model}-${i}`} className="border-t border-slate-200/80">
                                          <td className="py-2 pr-4 text-slate-600">{m.provider}</td>
                                          <td className="py-2 pr-4 text-slate-600">{m.model}</td>
                                          <td className="py-2 pr-4 text-right text-slate-600">{fmtNum(m.calls)}</td>
                                          <td className="py-2 pr-4 text-right text-slate-900">{fmtNum(m.totalTokens)}</td>
                                          <td className="py-2 text-right text-brand">{fmtUsd(m.costUsd)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
