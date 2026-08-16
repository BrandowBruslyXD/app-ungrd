import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DemoView } from '@/shared/types';

/**
 * Sesión de demostración: el rol activo vive aquí en lugar de pasarse por props.
 *
 * ⚠️ Esto NO es autenticación. Mientras no exista el ingreso con JWT, el rol se
 * elige desde el selector de demo y cualquiera puede alcanzar cualquier vista.
 * La autorización real es el 403 del servidor; ver docs/EXPERIENCIAS-FRONTEND.md.
 */
interface SesionDemo {
  rol: DemoView;
  cambiarRol: (rol: DemoView) => void;
}

const ContextoSesion = createContext<SesionDemo | null>(null);

/** Ruta de inicio de cada rol, para saber a dónde llevarlo al cambiar de vista. */
export const inicioPorRol: Record<DemoView, string> = {
  Ciudadano: '/',
  Brigadista: '/brigada',
  Socorro: '/socorro',
  Gestor: '/panel',
  Admin: '/panel',
};

/** Roles de la experiencia de sala de crisis; el resto es experiencia de terreno. */
export const rolesDeSala: DemoView[] = ['Gestor', 'Admin'];

export function ProveedorSesionDemo({ children }: { children: ReactNode }) {
  const [rol, setRol] = useState<DemoView>('Ciudadano');
  const valor = useMemo<SesionDemo>(() => ({ rol, cambiarRol: setRol }), [rol]);

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesionDemo(): SesionDemo {
  const contexto = useContext(ContextoSesion);
  if (!contexto) {
    throw new Error('useSesionDemo debe usarse dentro de ProveedorSesionDemo');
  }
  return contexto;
}
