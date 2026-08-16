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
 *
 * El ancho de contenido lo pone este armazón y solo este armazón: `max-w-4xl` con
 * `px-4 sm:px-6`, la misma caja para cabecera, contenido y barra inferior. Ninguna
 * página vuelve a declarar `mx-auto`, `max-w-*` ni `px-*` en su raíz.
 */

/** Ancho y respiro comunes a las tres franjas del armazón. */
const CAJA = 'mx-auto w-full max-w-4xl px-4 sm:px-6';

/** Alto fijo de cada destino de la barra inferior; de ahí sale el `pb` del contenido. */
const ALTO_DESTINO = 'h-[4.5rem]';

interface Destino {
  to: string;
  label: string;
  icon: LucideIcon;
  /**
   * El destino grande y central de la barra inferior.
   *
   * `emergencia` lo pinta de rojo, que está reservado a eso; una acción principal que
   * no es una emergencia (abrir un censo) va en azul institucional.
   */
  principal?: 'emergencia' | 'accion';
}

export default function LayoutTerreno() {
  const { t } = useTranslation();
  const { rol } = useSesionDemo();
  const { pathname } = useLocation();

  const destinos = destinosPorRol(rol, t);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-50">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-modal focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-base focus:font-semibold focus:text-ungrd-700"
      >
        {t('nav.saltarAlContenido')}
      </a>

      <header className="sticky top-0 z-sticky border-b border-ungrd-800/60 bg-ungrd-600">
        <div className={`${CAJA} flex h-14 items-center justify-between`}>
          <Link to="/" className="flex items-center gap-2.5 rounded-lg">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500">
              <Shield className="h-5 w-5 text-ungrd-900" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              {t('brand.conecta')}
              <span className="text-gold-400">{t('brand.riesgo')}</span>
            </span>
          </Link>
          <SelectorRolDemo variante="oscuro" />
        </div>
      </header>

      {/*
        pb-barra-terreno = alto de la barra (72 px) + aire + el área segura del iPhone.
        Sin eso la barra tapa el último elemento de la página, y con los toques a 44 px
        ese último elemento suele ser un botón.
      */}
      <main id="contenido" className={`${CAJA} flex-1 pb-barra-terreno pt-5`}>
        <Outlet />
      </main>

      <nav
        aria-label={t('nav.principal')}
        className="fixed inset-x-0 bottom-0 z-sticky border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_4px_rgba(15,23,42,0.06)]"
      >
        <ul className={`${CAJA} flex items-stretch justify-around`}>
          {destinos.map(({ to, label, icon: Icono, principal }) => {
            const activo = pathname === to;
            return (
              <li key={to} className="min-w-0 flex-1">
                <NavLink
                  to={to}
                  aria-current={activo ? 'page' : undefined}
                  className={`relative flex ${ALTO_DESTINO} flex-col items-center justify-center gap-1 px-1 text-xs font-semibold transition-colors ${
                    activo ? 'text-ungrd-700' : 'text-slate-600 hover:text-ungrd-700'
                  }`}
                >
                  {/* El oro marca la posición; el color nunca va solo: hay aria-current y relleno. */}
                  {activo && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-2 top-0 h-1 rounded-b-full bg-gold-500"
                    />
                  )}
                  <span className={claseIcono(principal, activo)}>
                    <Icono className={principal ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden="true" />
                  </span>
                  <span className="w-full truncate text-center leading-none">{label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** El destino principal va en un círculo relleno; el resto, en una pastilla que se tiñe al estar activa. */
function claseIcono(principal: Destino['principal'], activo: boolean): string {
  const base = 'flex items-center justify-center rounded-full transition-colors';

  if (principal) {
    const tono = principal === 'emergencia' ? 'bg-red-700' : 'bg-ungrd-600';
    return `${base} h-12 w-12 text-white shadow-md ${tono}`;
  }

  return `${base} h-10 w-10 ${activo ? 'bg-ungrd-50 text-ungrd-700' : 'text-slate-600'}`;
}

/** Cada rol de terreno tiene su propia barra; la acción central es la que ese rol repite. */
function destinosPorRol(rol: DemoView, t: (clave: string) => string): Destino[] {
  if (rol === 'Brigadista') {
    return [
      { to: '/brigada', label: t('nav.myPanel'), icon: LayoutDashboard },
      { to: '/brigada/censo', label: t('nav.newCensus'), icon: Plus, principal: 'accion' },
      { to: '/alertas', label: t('nav.alerts'), icon: Bell },
    ];
  }

  if (rol === 'Socorro') {
    return [
      { to: '/socorro', label: t('nav.myPanel'), icon: LayoutDashboard },
      { to: '/socorro/incidente', label: t('nav.incident'), icon: Flame, principal: 'emergencia' },
      { to: '/socorro/evaluacion', label: t('nav.evaluateHousing'), icon: Home },
      { to: '/alertas', label: t('nav.alerts'), icon: Bell },
    ];
  }

  return [
    { to: '/', label: t('nav.home'), icon: Home },
    { to: '/mis-reportes', label: t('nav.myReports'), icon: ClipboardList },
    { to: '/reportar', label: t('nav.report'), icon: Plus, principal: 'emergencia' },
    { to: '/ayudas', label: t('nav.aid'), icon: HandHeart },
    { to: '/alertas', label: t('nav.alerts'), icon: Bell },
  ];
}
