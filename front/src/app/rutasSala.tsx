import { lazy } from 'react';
import { Route } from 'react-router-dom';
import LayoutSala from '@/layouts/LayoutSala';
import RutaPorRol from '@/app/RutaPorRol';

/**
 * Rutas de la sala de crisis: gestor de la alcaldía y funcionario de la UNGRD.
 * Todas cuelgan de `/panel`, que es la costura que permitiría separar esta
 * experiencia en su propia aplicación sin reescribir nada.
 */

const ManagerDashboard = lazy(() => import('@/experiencias/sala/gestor/pages/ManagerDashboard'));
const PaqueteMinisterio = lazy(
  () => import('@/experiencias/sala/ungrd/pages/PaqueteMinisterio'),
);

export const rutasSala = (
  <Route
    path="panel"
    element={
      <RutaPorRol permitidos={['Gestor', 'Admin']}>
        <LayoutSala />
      </RutaPorRol>
    }
  >
    <Route index element={<ManagerDashboard />} />
    <Route
      path="paquetes/:codigo"
      element={
        <RutaPorRol permitidos={['Admin']}>
          <PaqueteMinisterio />
        </RutaPorRol>
      }
    />
  </Route>
);
