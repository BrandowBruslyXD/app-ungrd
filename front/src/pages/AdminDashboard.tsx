import {
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  MapPin,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
} from 'lucide-react';

const kpis = [
  { label: 'Reportes este mes', value: '1,247', change: '+12%', up: true, icon: TrendingUp, color: 'text-ungrd-600 bg-ungrd-50' },
  { label: 'Emergencias activas', value: '23', change: '-5%', up: false, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  { label: 'Tasa resolución', value: '87%', change: '+3%', up: true, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  { label: 'Tiempo prom.', value: '2h 14m', change: '-18min', up: true, icon: Clock, color: 'text-amber-600 bg-amber-50' },
];

const municipalities = [
  { name: 'Mocoa', budget: 450, spent: 312, reports: 89, resolved: 76 },
  { name: 'Pasto', budget: 680, spent: 445, reports: 156, resolved: 142 },
  { name: 'Popayán', budget: 520, spent: 390, reports: 134, resolved: 118 },
  { name: 'Quibdó', budget: 380, spent: 289, reports: 201, resolved: 165 },
  { name: 'Tumaco', budget: 290, spent: 278, reports: 178, resolved: 134 },
];

const recentUsers = [
  { name: 'María García', role: 'Gestora - Mocoa', status: 'active', lastLogin: 'Hace 5 min' },
  { name: 'Carlos Rodríguez', role: 'Gestor - Pasto', status: 'active', lastLogin: 'Hace 1h' },
  { name: 'Ana Martínez', role: 'Admin Regional', status: 'active', lastLogin: 'Hace 2h' },
  { name: 'Juan Pérez', role: 'Gestor - Quibdó', status: 'inactive', lastLogin: 'Hace 3 días' },
];

function MunicipalityCard({ m }: { m: typeof municipalities[0] }) {
  const pct = Math.round((m.spent / m.budget) * 100);
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {m.name}
        </span>
        <span className="text-xs text-slate-400">{m.resolved}/{m.reports} resueltos</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
        <span>Presupuesto: <strong className="text-slate-700">${m.budget}M</strong></span>
        <span>Ejecutado: <strong className="text-slate-700">${m.spent}M</strong></span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              pct > 90 ? 'bg-red-400' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-600 shrink-0">{pct}%</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="animate-fade-in">
      <div className="border-b border-slate-200 bg-white px-4 py-4 lg:px-8 lg:py-5">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Shield className="h-4 w-4 text-ungrd-600 shrink-0 sm:h-5 sm:w-5" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ungrd-600 sm:text-xs">
                Panel Administrativo
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-800 lg:text-2xl">
              Dashboard Ejecutivo
            </h1>
          </div>
          <p className="text-xs text-slate-400 shrink-0 sm:text-sm">Ago 2026</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8 lg:py-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2 mb-6 sm:gap-4 lg:grid-cols-4 lg:mb-8">
          {kpis.map(({ label, value, change, up, icon: Icon, color }) => (
            <div key={label} className="card p-3 sm:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${color}`}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span
                  className={`flex items-center gap-0.5 text-[11px] font-semibold sm:text-xs ${
                    up ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {change}
                </span>
              </div>
              <p className="text-xl font-bold text-slate-800 sm:text-2xl">{value}</p>
              <p className="mt-0.5 text-[11px] text-slate-500 sm:text-sm">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          {/* Transparency - cards on mobile, table on desktop */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="h-4 w-4 text-slate-400 shrink-0" />
              <h2 className="text-sm font-bold text-slate-800 sm:text-base">Transparencia Fiscal</h2>
            </div>

            {/* Mobile: card list */}
            <div className="space-y-2 lg:hidden">
              {municipalities.map((m) => (
                <MunicipalityCard key={m.name} m={m} />
              ))}
            </div>

            {/* Desktop: table */}
            <div className="card hidden lg:block">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <p className="text-xs text-slate-500">Presupuesto y ejecución en millones COP</p>
                <BarChart3 className="h-5 w-5 text-slate-400" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Municipio</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Presupuesto</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Ejecutado</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Ejecución</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Reportes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {municipalities.map((m) => {
                      const pct = Math.round((m.spent / m.budget) * 100);
                      return (
                        <tr key={m.name} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">
                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {m.name}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">${m.budget}M</td>
                          <td className="px-5 py-3 text-sm text-slate-600">${m.spent}M</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pct > 90 ? 'bg-red-400' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-400'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-slate-500">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-sm text-slate-600">{m.resolved}/{m.reports}</span>
                            <span className="text-xs text-slate-400 ml-1">resueltos</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Users + Chart */}
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 sm:p-5">
                <h2 className="text-sm font-bold text-slate-800 sm:text-base">Usuarios Recientes</h2>
                <Users className="h-4 w-4 text-slate-400 sm:h-5 sm:w-5" />
              </div>
              <div className="divide-y divide-slate-50">
                {recentUsers.map((user) => (
                  <div key={user.name} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors sm:px-5 sm:py-3.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 shrink-0 sm:h-9 sm:w-9 sm:text-sm">
                      {user.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-700 truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate sm:text-xs">{user.role}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block h-2 w-2 rounded-full ${
                        user.status === 'active' ? 'bg-emerald-400' : 'bg-slate-300'
                      }`} />
                      <p className="text-[10px] text-slate-400 mt-0.5 sm:text-[11px]">{user.lastLogin}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-slate-100 sm:p-4">
                <button className="btn-ghost w-full text-xs text-ungrd-600 hover:text-ungrd-700 sm:text-sm">
                  Ver todos los usuarios
                </button>
              </div>
            </div>

            <div className="card p-4 sm:p-5">
              <h3 className="text-xs font-bold text-slate-800 mb-3 sm:text-sm">Reportes por semana</h3>
              <div className="flex items-end gap-1 h-24 sm:gap-1.5 sm:h-32">
                {[45, 62, 38, 71, 55, 89, 67, 42, 78, 95, 58, 73].map((val, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-ungrd-200 hover:bg-ungrd-400 transition-colors cursor-pointer"
                    style={{ height: `${(val / 95) * 100}%` }}
                    title={`Semana ${i + 1}: ${val} reportes`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
