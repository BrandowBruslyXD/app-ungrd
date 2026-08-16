import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  ChevronDown,
  Plus,
  Flame,
} from 'lucide-react';
import type { DemoView } from '@/types';

interface HeaderProps {
  role: DemoView;
  onRoleChange: (role: DemoView) => void;
}

const roleHome: Record<DemoView, string> = {
  Ciudadano: '/',
  Gestor: '/gestor',
  Admin: '/',
  Brigadista: '/rescatista',
  Socorro: '/socorro',
};

const demoRoles: DemoView[] = ['Ciudadano', 'Socorro', 'Brigadista', 'Gestor'];

export default function Header({ role, onRoleChange }: HeaderProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const citizenLinks = [
    { to: '/', label: t('nav.home'), icon: Home },
    { to: '/mis-reportes', label: t('nav.myReports'), icon: ClipboardList },
    { to: '/reportar', label: t('nav.report'), icon: FileText },
    { to: '/ayudas', label: t('nav.aid'), icon: HandHeart },
    { to: '/alertas', label: t('nav.alerts'), icon: Bell },
  ];

  const managerLinks = [
    { to: '/gestor', label: t('nav.triagePanel'), icon: LayoutDashboard },
    { to: '/alertas', label: t('nav.alerts'), icon: Bell },
  ];

  const rescuerLinks = [
    { to: '/rescatista', label: t('nav.myPanel'), icon: LayoutDashboard },
    { to: '/rescatista/censo', label: t('nav.newCensus'), icon: Plus },
    { to: '/alertas', label: t('nav.alerts'), icon: Bell },
  ];

  const socorroLinks = [
    { to: '/socorro', label: t('nav.myPanel'), icon: LayoutDashboard },
    { to: '/socorro/incidente', label: t('nav.incident'), icon: Flame },
    { to: '/socorro/evaluacion', label: t('nav.evaluateHousing'), icon: Home },
    { to: '/alertas', label: t('nav.alerts'), icon: Bell },
  ];

  function switchRole(r: DemoView) {
    onRoleChange(r);
    navigate(roleHome[r]);
  }

  const links =
    role === 'Gestor'
      ? managerLinks
      : role === 'Brigadista'
        ? rescuerLinks
        : role === 'Socorro'
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
            {t('brand.conecta')}<span className="text-gold-400">{t('brand.riesgo')}</span>
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
              type="button"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-ungrd-100 transition-colors hover:bg-white/10 md:flex"
              aria-expanded={roleMenuOpen}
              aria-haspopup="menu"
              aria-label={t('header.roleMenu')}
            >
              <div className="h-2 w-2 rounded-full bg-gold-400" />
              {t(`roles.${role}`)}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {roleMenuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default bg-transparent"
                  aria-label={t('header.closeRoleMenu')}
                  onClick={() => setRoleMenuOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-scale-in"
                >
                  <p className="px-3 py-1.5 text-xs font-medium text-slate-400">{t('header.changeView')}</p>
                  {demoRoles.map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="menuitem"
                      onClick={() => { switchRole(r); setRoleMenuOpen(false); }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        r === role ? 'bg-ungrd-50 text-ungrd-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`h-2 w-2 rounded-full ${r === role ? 'bg-ungrd-600' : 'bg-slate-300'}`} />
                      {t(`roles.${r}`)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 text-ungrd-100 transition-colors hover:bg-white/10 md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t('header.closeMenu') : t('header.menu')}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-ungrd-500/30 bg-ungrd-700 px-4 pb-4 pt-2 md:hidden animate-slide-up">
          <p className="mb-2 text-xs font-medium text-ungrd-200">{t('header.view', { role: t(`roles.${role}`) })}</p>
          <div className="mb-3 flex flex-wrap gap-1">
            {demoRoles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { switchRole(r); setMenuOpen(false); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  r === role ? 'bg-gold-500 text-ungrd-900' : 'bg-ungrd-600 text-ungrd-200'
                }`}
              >
                {t(`roles.${r}`)}
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
