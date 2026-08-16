import { Link } from 'react-router-dom';
import { listTenants } from '../lib/tenantsApi';
import StatusBadge from '../components/StatusBadge';
import DeepseekSessionCard from '../components/DeepseekSessionCard';
import { useAsync } from '../hooks/useAsync';
import { IconBuildings, IconCheckBig, IconChatSquare, IconCircleX } from '../components/icons';

function MetricCard({ label, value, icon: Ic, tone = 'slate' }) {
  const tones = {
    slate: { chip: 'bg-slate-900/[0.04] text-slate-600', value: 'text-slate-900' },
    brand: { chip: 'bg-brand/10 text-brand', value: 'text-brand' },
    danger: { chip: 'bg-danger/10 text-danger', value: 'text-danger-dark' },
    accent: { chip: 'bg-accent/10 text-accent', value: 'text-accent' },
  }[tone];
  return (
    <div className="card card-hover flex items-center gap-4">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tones.chip}`}>
        <Ic className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`mt-0.5 text-3xl font-bold ${tones.value}`}>{value}</div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="card flex items-center gap-4">
      <div className="skeleton h-11 w-11 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-6 w-12" />
      </div>
    </div>
  );
}

// Vista general con métricas de empresas y conversaciones recientes.
export default function DashboardPage() {
  const { data, loading, error } = useAsync(listTenants, []);
  const tenants = Array.isArray(data) ? data : [];

  const total = tenants.length;
  const active = tenants.filter((t) => t.status === 'ACTIVE').length;
  const suspended = tenants.filter((t) => t.status === 'SUSPENDED').length;
  const conversations = tenants.reduce(
    (acc, t) => acc + (t.conversationsCount ?? t._count?.conversations ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Resumen general de la plataforma</p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-dark">
          {error?.response?.data?.message || 'No se pudieron cargar las empresas'}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard label="Total empresas" value={total} icon={IconBuildings} />
            <MetricCard label="Activas" value={active} icon={IconCheckBig} tone="brand" />
            <MetricCard label="Suspendidas" value={suspended} icon={IconCircleX} tone="danger" />
            <MetricCard label="Conversaciones" value={conversations} icon={IconChatSquare} tone="accent" />
          </>
        )}
      </div>

      <DeepseekSessionCard />

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Empresas</h2>
          <Link to="/tenants" className="text-sm font-medium text-brand hover:underline">
            Ver todas →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="skeleton h-10 w-full" />)}
          </div>
        ) : tenants.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Aún no hay empresas registradas.</p>
        ) : (
          <ul className="space-y-1">
            {tenants.slice(0, 8).map((t) => (
              <li key={t.id}>
                <Link
                  to={`/tenants/${t.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-900/[0.04]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-900/[0.04] text-sm font-semibold text-slate-600">
                      {(t.name || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">{t.name}</div>
                      <div className="truncate text-xs text-slate-500">{t.slug}</div>
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
