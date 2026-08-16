import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import type { DemoView } from '@/shared/types';
import { inicioPorRol, useSesionDemo } from '@/shared/hooks/useSesionDemo';

/** Se apaga con VITE_MODO_DEMO=false cuando exista el ingreso real. */
export const modoDemo = import.meta.env.VITE_MODO_DEMO !== 'false';

const rolesDemo: DemoView[] = ['Ciudadano', 'Socorro', 'Brigadista', 'Gestor', 'Admin'];

interface SelectorRolDemoProps {
  /** `oscuro` sobre la cabecera azul de terreno; `claro` sobre la barra blanca de sala. */
  variante?: 'oscuro' | 'claro';
}

/**
 * Cambia el rol activo sin cerrar sesión. Existe para poder recorrer las dos
 * experiencias en vivo durante la demostración; no es un control de acceso.
 */
export default function SelectorRolDemo({ variante = 'oscuro' }: SelectorRolDemoProps) {
  const { t } = useTranslation();
  const { rol, cambiarRol } = useSesionDemo();
  const [abierto, setAbierto] = useState(false);
  const navigate = useNavigate();

  if (!modoDemo) return null;

  function seleccionar(nuevoRol: DemoView) {
    cambiarRol(nuevoRol);
    setAbierto(false);
    navigate(inicioPorRol[nuevoRol]);
  }

  const estiloDisparador =
    variante === 'oscuro'
      ? 'text-ungrd-100 hover:bg-white/10'
      : 'text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${estiloDisparador}`}
        aria-expanded={abierto}
        aria-haspopup="menu"
        aria-label={t('header.roleMenu')}
      >
        <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
        {t(`roles.${rol}`)}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {abierto && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label={t('header.closeRoleMenu')}
            onClick={() => setAbierto(false)}
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-scale-in"
          >
            <p className="px-3 py-1.5 text-xs font-medium text-slate-400">{t('header.changeView')}</p>
            {rolesDemo.map((opcion) => (
              <button
                key={opcion}
                type="button"
                role="menuitem"
                onClick={() => seleccionar(opcion)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  opcion === rol ? 'bg-ungrd-50 font-medium text-ungrd-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${opcion === rol ? 'bg-ungrd-600' : 'bg-slate-300'}`}
                  aria-hidden="true"
                />
                {t(`roles.${opcion}`)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
