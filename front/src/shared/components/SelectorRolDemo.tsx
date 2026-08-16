import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown } from 'lucide-react';
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
 *
 * El menú se cierra al pulsar fuera y con Escape, sin capa invisible a pantalla
 * completa: esa capa era un botón enfocable con el que el teclado se quedaba atrapado.
 */
export default function SelectorRolDemo({ variante = 'oscuro' }: SelectorRolDemoProps) {
  const { t } = useTranslation();
  const { rol, cambiarRol } = useSesionDemo();
  const [abierto, setAbierto] = useState(false);
  const navigate = useNavigate();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const disparadorRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return undefined;

    function alPulsarFuera(evento: PointerEvent) {
      if (!contenedorRef.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }

    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return;
      setAbierto(false);
      // El foco vuelve al disparador: si se queda en el aire, el teclado empieza de cero.
      disparadorRef.current?.focus();
    }

    document.addEventListener('pointerdown', alPulsarFuera);
    document.addEventListener('keydown', alPresionarTecla);
    return () => {
      document.removeEventListener('pointerdown', alPulsarFuera);
      document.removeEventListener('keydown', alPresionarTecla);
    };
  }, [abierto]);

  if (!modoDemo) return null;

  function seleccionar(nuevoRol: DemoView) {
    cambiarRol(nuevoRol);
    setAbierto(false);
    navigate(inicioPorRol[nuevoRol]);
  }

  const estiloDisparador =
    variante === 'oscuro'
      ? 'text-white ring-1 ring-white/30 hover:bg-white/10'
      : 'text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50';

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        ref={disparadorRef}
        type="button"
        onClick={() => setAbierto(!abierto)}
        className={`inline-flex min-h-toque items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${estiloDisparador}`}
        aria-expanded={abierto}
        aria-haspopup="menu"
        aria-label={t('header.roleMenu')}
      >
        <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
        {t(`roles.${rol}`)}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {abierto && (
        <div
          role="menu"
          aria-label={t('header.changeView')}
          className="animate-scale-in absolute right-0 top-full z-dropdown mt-2 w-60 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <p className="px-2.5 py-1.5 text-xs font-semibold text-slate-500">
            {t('header.changeView')}
          </p>
          {rolesDemo.map((opcion) => {
            const activo = opcion === rol;
            return (
              <button
                key={opcion}
                type="button"
                role="menuitemradio"
                aria-checked={activo}
                onClick={() => seleccionar(opcion)}
                className={`flex min-h-toque w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-base transition-colors ${
                  activo
                    ? 'bg-ungrd-50 font-semibold text-ungrd-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t(`roles.${opcion}`)}
                {/* El marcado no puede ser solo el color de fondo: lo dice el icono y aria-checked. */}
                {activo && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
