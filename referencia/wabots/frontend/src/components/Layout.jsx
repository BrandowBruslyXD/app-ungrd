import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  IconBuilding,
  IconCalendar,
  IconDashboard,
  IconFlow,
  IconMenu,
  IconMoney,
} from './icons';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { to: '/tenants', label: 'Empresas', icon: IconBuilding },
  { to: '/flows', label: 'Flujos', icon: IconFlow },
  { to: '/consumo', label: 'Consumo IA', icon: IconMoney },
  { to: '/calendario', label: 'Calendario', icon: IconCalendar },
];

function SidebarContent({ user, onLogout, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-gradient text-lg font-extrabold text-ink-950 shadow-glow-brand">
          W
        </span>
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight text-slate-900">WA Bots</div>
          <div className="text-[11px] text-slate-500">Panel de control</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white text-slate-900 shadow-soft'
                  : 'text-slate-500 hover:bg-slate-900/[0.04] hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-gradient transition-opacity duration-200 ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <item.icon className={`h-5 w-5 ${isActive ? 'text-brand' : ''}`} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200/80 p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-gradient text-sm font-bold text-ink-950">
            {(user?.username || 'A').slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-700">{user?.username || 'admin'}</div>
            <div className="truncate text-[11px] text-slate-500" title={user?.email}>
              {user?.email || 'administrador'}
            </div>
          </div>
        </div>
        <button onClick={onLogout} className="btn-ghost w-full">
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// Layout del panel: sidebar (drawer en móvil) + contenido animado.
export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [drawer, setDrawer] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentLabel = NAV.find((n) => location.pathname.startsWith(n.to))?.label || 'Panel';

  return (
    <div className="flex h-full">
      {/* Sidebar fijo (desktop) */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white/60 backdrop-blur-xl lg:block 2xl:w-72">
        <SidebarContent user={user} onLogout={handleLogout} />
      </aside>

      {/* Drawer (móvil) */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setDrawer(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-slate-200/80 bg-white shadow-lift animate-fade-in-up">
            <SidebarContent user={user} onLogout={handleLogout} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <main className="relative flex h-full flex-1 flex-col overflow-hidden">
        {/* Topbar móvil */}
        <header className="flex items-center gap-3 border-b border-slate-200/80 bg-white/70 px-4 py-3 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setDrawer(true)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600"
            aria-label="Menú"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-slate-900">{currentLabel}</span>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* SIN tope de ancho: el panel usa toda la pantalla con márgenes
              proporcionales (crecen con el monitor), no una columna centrada. */}
          <div key={location.pathname} className="w-full animate-fade-in-up px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:px-[3vw]">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
