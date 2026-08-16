import type { DemoView } from '@/types';

/**
 * A dónde llega cada rol cuando entra.
 *
 * Vive aparte porque lo necesitan tres sitios —el encabezado, la landing y el
 * ingreso— y tener tres copias es la forma segura de que un día dejen de
 * coincidir.
 */
export const RUTA_POR_ROL: Record<DemoView, string> = {
  Ciudadano: '/inicio',
  Gestor: '/gestor',
  Admin: '/gestor',
  Brigadista: '/rescatista',
  Socorro: '/socorro',
};

/** Roles que entran con usuario. El ciudadano reporta sin cuenta. */
export const ROLES_CON_INGRESO: readonly Extract<
  DemoView,
  'Socorro' | 'Brigadista' | 'Gestor'
>[] = ['Socorro', 'Brigadista', 'Gestor'];
