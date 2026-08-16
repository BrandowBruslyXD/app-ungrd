import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, PackageCheck, Shield, type LucideIcon } from 'lucide-react';
import { useSesionDemo } from '@/shared/hooks/useSesionDemo';
import SelectorRolDemo from '@/shared/components/SelectorRolDemo';

/**
 * Armazón de la sala de crisis: escritorio, teclado, dos horas seguidas.
 *
 * Navegación lateral persistente y densidad alta: quien trabaja aquí necesita
 * ver varias cosas a la vez, lo contrario que quien está en la calle.
 * En pantalla estrecha la barra lateral pasa a ser una fila superior.
 *
 * El ancho de contenido lo pone este armazón: `max-w-7xl` con `px-4 lg:px-6`.
 * Ninguna página vuelve a declarar `mx-auto`, `max-w-*` ni `px-*` en su raíz.
 */

interface DestinoSala {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Solo el funcionario de la UNGRD (rol Admin) lo ve. */
  soloUngrd?: boolean;
}

export default function LayoutSala() {
  const { t } = useTranslation();
  const { rol } = useSesionDemo();

  /**
   * El código va escrito aquí a propósito: mientras no exista la lista de eventos (A1),
   * el menú entra directo al paquete sembrado. Importar el mock desde el armazón lo
   * metería en el paquete base que descarga todo el mundo, y esta pantalla debe seguir
   * viajando en su propio archivo.
   */
  const destinos: DestinoSala[] = [
    { to: '/panel', label: t('nav.triagePanel'), icon: LayoutDashboard },
    {
      to: '/panel/paquetes/PQT-2026-08-15-0007',
      label: t('nav.paqueteMinisterio'),
      icon: PackageCheck,
      soloUngrd: true,
    },
  ];

  const visibles = destinos.filter((destino) => !destino.soloUngrd || rol === 'Admin');

  return (
    <div className="min-h-screen bg-slate-100">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-modal focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-base focus:font-semibold focus:text-ungrd-700"
      >
        {t('nav.saltarAlContenido')}
      </a>

      <header className="sticky top-0 z-sticky border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ungrd-600">
              <Shield className="h-5 w-5 text-gold-400" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">
                {t('brand.conecta')}
                <span className="text-ungrd-600">{t('brand.riesgo')}</span>
              </p>
              <p className="text-xs text-slate-600">{t(`roles.${rol}`)}</p>
            </div>
          </div>
          <SelectorRolDemo variante="claro" />
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        <nav
          aria-label={t('nav.sala')}
          className="border-b border-slate-200 bg-white lg:min-h-[calc(100vh-3.5rem)] lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r"
        >
          <ul className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:gap-1 lg:overflow-visible lg:p-3">
            {visibles.map(({ to, label, icon: Icono }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end
                  className={({ isActive }) =>
                    `relative flex min-h-toque items-center gap-2.5 whitespace-nowrap rounded-lg py-2 pl-4 pr-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-ungrd-50 text-ungrd-700'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* El oro marca la posición. NavLink ya pone aria-current, así que el color no va solo. */}
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-2 left-1.5 w-1 rounded-full bg-gold-500"
                        />
                      )}
                      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main id="contenido" className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
