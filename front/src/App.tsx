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
      <p className="text-sm text-slate-500">{t('app.loadingPage')}</p>
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
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-lg font-bold text-slate-800">{t('acceso.noEncontradoTitulo')}</h1>
      <p className="mt-2 text-sm text-slate-600">{t('acceso.noEncontradoApoyo')}</p>
      <a
        href={destino}
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-ungrd-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ungrd-700"
      >
        {t('acceso.volverInicio')}
      </a>
    </div>
  );
}
