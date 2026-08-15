import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  Menu,
  X,
  Home,
  FileText,
  ClipboardList,
  HandHeart,
  Bell,
  LayoutDashboard,
  Users,
  ChevronDown,
  Plus,
  Flame,
} from 'lucide-react';
import type { UserRole } from '@/types';

const citizenLinks = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/mis-reportes', label: 'Mis Reportes', icon: ClipboardList },
  { to: '/reportar', label: 'Reportar', icon: FileText },
  { to: '/ayudas', label: 'Ayudas', icon: HandHeart },
  { to: '/alertas', label: 'Alertas', icon: Bell },
];

const managerLinks = [
  { to: '/gestor', label: 'Panel de Triage', icon: LayoutDashboard },
  { to: '/alertas', label: 'Alertas', icon: Bell },
];

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
];

const rescuerLinks = [
  { to: '/rescatista', label: 'Mi Panel', icon: LayoutDashboard },
  { to: '/rescatista/censo', label: 'Nuevo Censo', icon: Plus },
  { to: '/alertas', label: 'Alertas', icon: Bell },
];

const socorroLinks = [
  { to: '/socorro', label: 'Mi Panel', icon: LayoutDashboard },
  { to: '/socorro/incidente', label: 'Incidente', icon: Flame },
  { to: '/socorro/evaluacion', label: 'Evaluar Vivienda', icon: Home },
  { to: '/alertas', label: 'Alertas', icon: Bell },
];

const roleLabels: Record<UserRole, string> = {
  citizen: 'Ciudadano',
  manager: 'Gestor CMGRD',
  admin: 'Administrador',
  rescuer: 'Brigadista',
  socorro: 'Org. Socorro',
};

interface HeaderProps {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const roleHome: Record<UserRole, string> = {
  citizen: '/',
  manager: '/gestor',
  admin: '/admin',
  rescuer: '/rescatista',
  socorro: '/socorro',
};

export default function Header({ role, onRoleChange }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  function switchRole(r: UserRole) {
    onRoleChange(r);
    navigate(roleHome[r]);
  }

  const links =
    role === 'admin'
      ? adminLinks
      : role === 'manager'
        ? managerLinks
        : role === 'rescuer'
          ? rescuerLinks
          : role === 'socorro'
            ? socorroLinks
            : citizenLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-ungrd-700/20 bg-ungrd-600/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500 shadow-sm">
            <Shield className="h-5 w-5 text-ungrd-900" />
          </div>
          <span className="text-lg font-bold text-white">
            Conecta<span className="text-gold-400">Riesgo</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? 'bg-white/15 text-gold-300'
                    : 'text-ungrd-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-ungrd-100 transition-colors hover:bg-white/10 md:flex"
            >
              <div className="h-2 w-2 rounded-full bg-gold-400" />
              {roleLabels[role]}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {roleMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setRoleMenuOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-scale-in">
                  <p className="px-3 py-1.5 text-xs font-medium text-slate-400">Cambiar vista (demo)</p>
                  {(['citizen', 'socorro', 'rescuer', 'manager', 'admin'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => { switchRole(r); setRoleMenuOpen(false); }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        r === role ? 'bg-ungrd-50 text-ungrd-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`h-2 w-2 rounded-full ${r === role ? 'bg-ungrd-600' : 'bg-slate-300'}`} />
                      {roleLabels[r]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 text-ungrd-100 transition-colors hover:bg-white/10 md:hidden"
            aria-label="Menú"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-ungrd-500/30 bg-ungrd-700 px-4 pb-4 pt-2 md:hidden animate-slide-up">
          <p className="mb-2 text-xs font-medium text-ungrd-200">Vista: {roleLabels[role]}</p>
          <div className="mb-3 flex flex-wrap gap-1">
            {(['citizen', 'socorro', 'rescuer', 'manager', 'admin'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => { switchRole(r); setMenuOpen(false); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  r === role ? 'bg-gold-500 text-ungrd-900' : 'bg-ungrd-600 text-ungrd-200'
                }`}
              >
                {roleLabels[r]}
              </button>
            ))}
          </div>
          <div className="space-y-0.5">
            {links.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? 'bg-white/10 text-gold-300' : 'text-ungrd-100 hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
