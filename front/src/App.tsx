import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/layout/Header';
import PieDePagina from '@/components/layout/PieDePagina';
import FondoDePagina from '@/components/layout/FondoDePagina';
import { RUTA_POR_ROL } from '@/lib/rutasPorRol';
import { fondoDeRuta } from '@/lib/fotos';
import type { DemoView } from '@/types';

const Landing = lazy(() => import('@/features/publico/pages/Landing'));
const Login = lazy(() => import('@/features/auth/pages/Login'));
const CitizenDashboard = lazy(() => import('@/features/reportes/pages/CitizenDashboard'));
const ReportWizard = lazy(() => import('@/features/reportes/pages/ReportWizard'));
const MyReports = lazy(() => import('@/features/reportes/pages/MyReports'));
const ReportDetail = lazy(() => import('@/features/reportes/pages/ReportDetail'));
const AidDirectory = lazy(() => import('@/features/reportes/pages/AidDirectory'));
const Alerts = lazy(() => import('@/features/reportes/pages/Alerts'));
const ManagerDashboard = lazy(() => import('@/features/gestor/pages/ManagerDashboard'));
const PanelUngrd = lazy(() => import('@/features/ungrd/pages/PanelUngrd'));
const PaqueteMinisterio = lazy(() => import('@/features/ungrd/pages/PaqueteMinisterio'));
const RescuerDashboard = lazy(() => import('@/features/rescatista/pages/RescuerDashboard'));
const FieldCensusWizard = lazy(() => import('@/features/rescatista/pages/FieldCensusWizard'));
const SocorroDashboard = lazy(() => import('@/features/socorro/pages/SocorroDashboard'));
const IncidentLogWizard = lazy(() => import('@/features/socorro/pages/IncidentLogWizard'));
const HabitabilityWizard = lazy(() => import('@/features/socorro/pages/HabitabilityWizard'));

/** Rutas públicas: se ven sin haber entrado y llevan el encabezado reducido. */
const RUTAS_PUBLICAS: readonly string[] = ['/', '/entrar'];

function PageFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <p className="text-tinta-500">{t('app.loadingPage')}</p>
    </div>
  );
}

interface EstructuraProps {
  role: DemoView;
  onRoleChange: (role: DemoView) => void;
}

/**
 * Estructura común de la aplicación.
 *
 * Va dentro del router y no en `App` porque necesita `useLocation` para saber si
 * la ruta actual es pública. En la landing y en el ingreso el encabezado va
 * reducido: ahí todavía no hay sesión, así que un menú de navegación con
 * secciones internas solo estorbaría.
 */
function Estructura({ role, onRoleChange }: EstructuraProps) {
  const { pathname } = useLocation();
  const esPublica = RUTAS_PUBLICAS.includes(pathname);
  const fondo = fondoDeRuta(pathname);

  return (
    /* `flex-col` + `flex-1` en el main empujan el pie hasta abajo también en
       pantallas cortas, en vez de dejarlo flotando a media altura. */
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      {/*
        Fondo fotográfico detrás de todo, distinto en cada vista. Se asoma a los
        lados de la columna de contenido, que es donde antes solo había color
        plano. Va también en la portada: allí el bloque de arriba es a sangre y
        lo tapa, pero de la mitad para abajo el fondo aparece igual que en el
        resto de la aplicación.
      */}
      <FondoDePagina fotos={fondo} />

      <Header role={role} onRoleChange={onRoleChange} reducido={esPublica} />

      {/*
        En las vistas internas el contenido es una hoja: fondo propio, borde y
        sombra, centrada sobre el fondo fotográfico. Es la misma idea de la
        «ficha» llevada a la página entera —una planilla sobre el escritorio— y
        es lo que le da a los costados una razón de existir.

        En móvil la hoja ocupa todo el ancho y el fondo no se ve: correcto, ahí
        no sobra ni un píxel.
      */}
      <main
        className={
          esPublica
            ? 'flex-1'
            : 'mx-auto w-full max-w-6xl flex-1 bg-papel shadow-[0_0_40px_rgba(4,25,60,0.10)] lg:my-6 lg:rounded-ficha lg:border lg:border-papel-borde'
        }
      >
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Landing onRoleChange={onRoleChange} />} />
            <Route path="/entrar" element={<Login onRoleChange={onRoleChange} />} />

            {/* El inicio del ciudadano dejó de ser «/» cuando apareció la
                landing. Los roles operativos entran directo a su panel. */}
            <Route
              path="/inicio"
              element={
                role === 'Ciudadano' || role === 'Admin' ? (
                  <CitizenDashboard />
                ) : (
                  <Navigate to={RUTA_POR_ROL[role]} replace />
                )
              }
            />

            <Route path="/reportar" element={<ReportWizard />} />
            <Route path="/mis-reportes" element={<MyReports />} />
            <Route path="/reporte/:id" element={<ReportDetail />} />
            <Route path="/ayudas" element={<AidDirectory />} />
            <Route path="/alertas" element={<Alerts />} />
            <Route path="/gestor" element={<ManagerDashboard />} />
            <Route path="/gestor/reparto" element={<PanelUngrd />} />
            <Route path="/gestor/reparto/:sector" element={<PaqueteMinisterio />} />
            <Route path="/rescatista" element={<RescuerDashboard />} />
            <Route path="/rescatista/censo" element={<FieldCensusWizard />} />
            <Route path="/socorro" element={<SocorroDashboard />} />
            <Route path="/socorro/incidente" element={<IncidentLogWizard />} />
            <Route path="/socorro/evaluacion" element={<HabitabilityWizard />} />

            {/* Una dirección mal escrita devuelve al inicio en vez de a una
                pantalla en blanco, que en emergencia se lee como «se dañó». */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <PieDePagina completo={esPublica} />
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState<DemoView>('Ciudadano');

  return (
    <BrowserRouter>
      <Estructura role={role} onRoleChange={setRole} />
    </BrowserRouter>
  );
}
