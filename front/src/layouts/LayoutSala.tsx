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
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ungrd-600">
              <Shield className="h-4.5 w-4.5 text-gold-400" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-800">
                {t('brand.conecta')}
                <span className="text-ungrd-600">{t('brand.riesgo')}</span>
              </p>
              <p className="text-[11px] text-slate-500">{t(`roles.${rol}`)}</p>
            </div>
          </div>
          <SelectorRolDemo variante="claro" />
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        <nav
          aria-label={t('nav.triagePanel')}
          className="border-b border-slate-200 bg-white lg:min-h-[calc(100vh-3.5rem)] lg:w-56 lg:border-b-0 lg:border-r"
        >
          <ul className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-3">
            {visibles.map(({ to, label, icon: Icono }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-ungrd-50 text-ungrd-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <Icono className="h-4 w-4" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 px-4 py-5 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
