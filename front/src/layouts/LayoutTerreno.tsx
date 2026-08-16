import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  ClipboardList,
  Flame,
  HandHeart,
  Home,
  LayoutDashboard,
  Plus,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import type { DemoView } from '@/shared/types';
import { useSesionDemo } from '@/shared/hooks/useSesionDemo';
import SelectorRolDemo from '@/shared/components/SelectorRolDemo';

/**
 * Armazón de la experiencia de terreno: celular, una mano, bajo estrés.
 *
 * Cabecera mínima y navegación inferior fija al alcance del pulgar. No se oculta
 * al desplazar: buscar el menú en una emergencia es tiempo perdido.
 */

interface Destino {
  to: string;
  label: string;
  icon: LucideIcon;
  /** El destino grande y central de la barra inferior. */
  principal?: boolean;
}

export default function LayoutTerreno() {
  const { t } = useTranslation();
  const { rol } = useSesionDemo();
  const { pathname } = useLocation();

  const destinos = destinosPorRol(rol, t);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-ungrd-700/20 bg-ungrd-600/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500 shadow-sm">
              <Shield className="h-5 w-5 text-ungrd-900" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold text-white">
              {t('brand.conecta')}
              <span className="text-gold-400">{t('brand.riesgo')}</span>
            </span>
          </Link>
          <SelectorRolDemo variante="oscuro" />
        </div>
      </header>

      {/* pb-24: deja aire para que la barra inferior no tape el contenido. */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>

      <nav
        aria-label={t('nav.home')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
          {destinos.map(({ to, label, icon: Icono, principal }) => {
            const activo = pathname === to;
            return (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  aria-current={activo ? 'page' : undefined}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors ${
                    principal
                      ? 'text-ungrd-700'
                      : activo
                        ? 'text-ungrd-600'
                        : 'text-slate-500 hover:text-ungrd-600'
                  }`}
                >
                  <span
                    className={
                      principal
                        ? 'flex h-11 w-11 items-center justify-center rounded-full bg-red-700 text-white shadow-md'
                        : ''
                    }
                  >
                    <Icono className={principal ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden="true" />
                  </span>
                  <span className={principal ? 'sr-only sm:not-sr-only' : ''}>{label}</span>
                  {activo && !principal && (
                    <span className="h-0.5 w-6 rounded-full bg-gold-500" aria-hidden="true" />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** Cada rol de terreno tiene su propia barra; reportar es siempre la acción central. */
function destinosPorRol(rol: DemoView, t: (clave: string) => string): Destino[] {
  if (rol === 'Brigadista') {
    return [
      { to: '/brigada', label: t('nav.myPanel'), icon: LayoutDashboard },
      { to: '/brigada/censo', label: t('nav.newCensus'), icon: Plus, principal: true },
      { to: '/alertas', label: t('nav.alerts'), icon: Bell },
    ];
  }

  if (rol === 'Socorro') {
    return [
      { to: '/socorro', label: t('nav.myPanel'), icon: LayoutDashboard },
      { to: '/socorro/incidente', label: t('nav.incident'), icon: Flame, principal: true },
      { to: '/socorro/evaluacion', label: t('nav.evaluateHousing'), icon: Home },
      { to: '/alertas', label: t('nav.alerts'), icon: Bell },
    ];
  }

  return [
    { to: '/', label: t('nav.home'), icon: Home },
    { to: '/mis-reportes', label: t('nav.myReports'), icon: ClipboardList },
    { to: '/reportar', label: t('nav.report'), icon: Plus, principal: true },
    { to: '/ayudas', label: t('nav.aid'), icon: HandHeart },
    { to: '/alertas', label: t('nav.alerts'), icon: Bell },
  ];
}
