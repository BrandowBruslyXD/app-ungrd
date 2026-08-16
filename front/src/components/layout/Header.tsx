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
  LogIn,
  type LucideIcon,
} from 'lucide-react';
import { RUTA_POR_ROL } from '@/lib/rutasPorRol';
import type { DemoView } from '@/types';

interface HeaderProps {
  role: DemoView;
  onRoleChange: (role: DemoView) => void;
  /**
   * En rutas públicas solo se muestra la marca y el acceso al ingreso: ahí
   * todavía no hay sesión y un menú de secciones internas solo estorba.
   */
  reducido?: boolean;
}

interface Enlace {
  to: string;
  label: string;
  icon: LucideIcon;
}

const demoRoles: readonly DemoView[] = ['Ciudadano', 'Socorro', 'Brigadista', 'Gestor'];

export default function Header({ role, onRoleChange, reducido = false }: HeaderProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  /*
   * «Inicio» siempre lleva a la página de presentación, nunca al panel.
   *
   * Antes había dos inicios compitiendo: el logo iba a «/» y el menú decía
   * «Inicio» pero llevaba a «/inicio», el tablero del ciudadano. Estando en el
   * tablero, tocar «Inicio» no hacía nada visible. Ahora el panel propio de
   * cada rol se llama «Mi panel» y se distingue del inicio del sitio.
   */
  const inicioDelSitio: Enlace = { to: '/', label: t('nav.presentation'), icon: Home };

  const citizenLinks: Enlace[] = [
    inicioDelSitio,
    { to: '/inicio', label: t('nav.home'), icon: LayoutDashboard },
    { to: '/reportar', label: t('nav.report'), icon: FileText },
    { to: '/mis-reportes', label: t('nav.myReports'), icon: ClipboardList },
    { to: '/ayudas', label: t('nav.aid'), icon: HandHeart },
    { to: '/alertas', label: t('nav.alerts'), icon: Bell },
  ];

  const managerLinks: Enlace[] = [
    inicioDelSitio,
    { to: '/gestor', label: t('nav.triagePanel'), icon: LayoutDashboard },
    { to: '/alertas', label: t('nav.alerts'), icon: Bell },
  ];

  const rescuerLinks: Enlace[] = [
    inicioDelSitio,
    { to: '/rescatista', label: t('nav.myPanel'), icon: LayoutDashboard },
    { to: '/rescatista/censo', label: t('nav.newCensus'), icon: Plus },
    { to: '/alertas', label: t('nav.alerts'), icon: Bell },
  ];

  const socorroLinks: Enlace[] = [
    inicioDelSitio,
    { to: '/socorro', label: t('nav.myPanel'), icon: LayoutDashboard },
    { to: '/socorro/incidente', label: t('nav.incident'), icon: Flame },
    { to: '/socorro/evaluacion', label: t('nav.evaluateHousing'), icon: Home },
    { to: '/alertas', label: t('nav.alerts'), icon: Bell },
  ];

  function switchRole(r: DemoView): void {
    onRoleChange(r);
    navigate(RUTA_POR_ROL[r]);
  }

  const links =
    role === 'Gestor' || role === 'Admin'
      ? managerLinks
      : role === 'Brigadista'
        ? rescuerLinks
        : role === 'Socorro'
          ? socorroLinks
          : citizenLinks;

  const marca = (
    <Link to="/" className="flex items-center gap-3 rounded-control py-2">
      <span className="flex h-11 w-11 items-center justify-center rounded-control bg-oro-500">
        <Shield className="h-6 w-6 text-azul-900" aria-hidden="true" />
      </span>
      <span className="text-xl font-bold text-white">
        {t('brand.conecta')}
        <span className="text-oro-400">{t('brand.riesgo')}</span>
      </span>
    </Link>
  );

  if (reducido) {
    return (
      <header className="sobre-oscuro border-b-2 border-azul-700 bg-azul-600">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
          {marca}
          {location.pathname !== '/entrar' && (
            <Link
              to="/entrar"
              className="btn inline-flex min-h-[2.75rem] border-2 border-white/40 bg-white/10 px-4 text-base text-white hover:bg-white/20"
            >
              <LogIn className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">{t('landing.staffEnter')}</span>
              <span className="sm:hidden">{t('login.title')}</span>
            </Link>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="sobre-oscuro sticky top-0 z-50 border-b-2 border-azul-700 bg-azul-600">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
        {marca}

        <nav className="hidden items-center gap-1 lg:flex" aria-label={t('nav.home')}>
          {links.map(({ to, label, icon: Icon }) => {
            const activo = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                aria-current={activo ? 'page' : undefined}
                className={`flex min-h-[2.75rem] items-center gap-2 rounded-control px-3 font-semibold transition-colors ${
                  activo ? 'bg-white/20 text-white' : 'text-azul-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
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
              className="hidden min-h-[2.75rem] items-center gap-2 rounded-control px-3 font-semibold text-azul-100 transition-colors hover:bg-white/10 lg:flex"
              aria-expanded={roleMenuOpen}
              aria-haspopup="menu"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-oro-400" aria-hidden="true" />
              {t(`roles.${role}`)}
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
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
                  className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-64 rounded-ficha border border-papel-borde bg-white py-2 shadow-ficha-alta"
                >
                  <p className="px-4 py-1.5 text-sm font-semibold text-tinta-500">
                    {t('header.changeView')}
                  </p>
                  {demoRoles.map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        switchRole(r);
                        setRoleMenuOpen(false);
                      }}
                      className={`flex min-h-control w-full items-center gap-3 px-4 text-left font-semibold transition-colors ${
                        r === role ? 'bg-azul-50 text-azul-700' : 'text-tinta-700 hover:bg-tinta-50'
                      }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${r === role ? 'bg-azul-600' : 'bg-tinta-300'}`}
                        aria-hidden="true"
                      />
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
            className="flex h-12 w-12 items-center justify-center rounded-control text-white transition-colors hover:bg-white/10 lg:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t('header.closeMenu') : t('header.menu')}
          >
            {menuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="animate-slide-up border-t border-azul-500/40 bg-azul-700 px-4 pb-5 pt-3 lg:hidden">
          <p className="mb-2 text-sm font-semibold text-azul-200">
            {t('header.view', { role: t(`roles.${role}`) })}
          </p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {demoRoles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  switchRole(r);
                  setMenuOpen(false);
                }}
                className={`min-h-[2.75rem] rounded-control px-3 font-semibold transition-colors ${
                  r === role ? 'bg-oro-500 text-azul-900' : 'bg-azul-600 text-azul-100'
                }`}
              >
                {t(`roles.${r}`)}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            {links.map(({ to, label, icon: Icon }) => {
              const activo = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  aria-current={activo ? 'page' : undefined}
                  className={`flex min-h-control items-center gap-3 rounded-control px-4 text-base font-semibold transition-colors ${
                    activo ? 'bg-white/15 text-white' : 'text-azul-100 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
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
