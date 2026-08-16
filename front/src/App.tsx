import { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ProveedorSesionDemo,
  inicioPorRol,
  rolesDeSala,
  useSesionDemo,
} from '@/shared/hooks/useSesionDemo';
import { ProveedorReportesDemo } from '@/shared/hooks/useReportesDemo';
import { rutasTerreno } from '@/app/rutasTerreno';
import { rutasSala } from '@/app/rutasSala';

/**
 * Dos experiencias en una sola aplicación: terreno (celular, en la emergencia) y
 * sala de crisis (escritorio, coordinando). Comparten datos, tipos y marca;
 * cambian de armazón. Detalle en docs/EXPERIENCIAS-FRONTEND.md.
 *
 * El proveedor de reportes envuelve a las dos: mientras no haya backend, es el único lugar donde
 * vive el estado de un reporte, y por eso el gestor puede cambiarlo y el ciudadano verlo avanzar.
 */
export default function App() {
  return (
    <ProveedorSesionDemo>
      <ProveedorReportesDemo>
        <BrowserRouter>
          <Suspense fallback={<PantallaCargando />}>
            <Routes>
              <Route path="/inicio-rol" element={<InicioSegunRol />} />
              {rutasTerreno}
              {rutasSala}
              <Route path="*" element={<NoEncontrado />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ProveedorReportesDemo>
    </ProveedorSesionDemo>
  );
}

function PantallaCargando() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <p className="text-base text-slate-600">{t('app.loadingPage')}</p>
    </div>
  );
}

/** Lleva a cada rol a su pantalla de inicio; se usa al cambiar de vista en la demo. */
function InicioSegunRol() {
  const { rol } = useSesionDemo();
  return <Navigate to={inicioPorRol[rol]} replace />;
}

function NoEncontrado() {
  const { t } = useTranslation();
  const { rol } = useSesionDemo();
  const destino = rolesDeSala.includes(rol) ? '/panel' : '/';

  return (
    // Esta ruta cae fuera de los dos armazones, así que aquí sí le toca poner su propia caja.
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-slate-900">{t('acceso.noEncontradoTitulo')}</h1>
        <p className="mt-2 text-base text-slate-600">{t('acceso.noEncontradoApoyo')}</p>
        <a href={destino} className="btn-primary mt-6">
          {t('acceso.volverInicio')}
        </a>
      </div>
    </div>
  );
}
