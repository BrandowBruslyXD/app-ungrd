import { lazy } from 'react';
import { Navigate, Route, useParams } from 'react-router-dom';
import LayoutTerreno from '@/layouts/LayoutTerreno';

/**
 * Rutas de la experiencia de terreno: ciudadano, brigadista y organismos de socorro.
 * Cada pantalla se carga por separado para que un celular con red mala solo
 * descargue lo que abre.
 */

const CitizenDashboard = lazy(() => import('@/experiencias/terreno/ciudadano/pages/CitizenDashboard'));
const ReportWizard = lazy(() => import('@/experiencias/terreno/ciudadano/pages/ReportWizard'));
const MyReports = lazy(() => import('@/experiencias/terreno/ciudadano/pages/MyReports'));
const ReportDetail = lazy(() => import('@/experiencias/terreno/ciudadano/pages/ReportDetail'));
const AidDirectory = lazy(() => import('@/experiencias/terreno/ciudadano/pages/AidDirectory'));
const Alerts = lazy(() => import('@/experiencias/terreno/ciudadano/pages/Alerts'));

const RescuerDashboard = lazy(() => import('@/experiencias/terreno/brigada/pages/RescuerDashboard'));
const FieldCensusWizard = lazy(() => import('@/experiencias/terreno/brigada/pages/FieldCensusWizard'));

const SocorroDashboard = lazy(() => import('@/experiencias/terreno/socorro/pages/SocorroDashboard'));
const IncidentLogWizard = lazy(() => import('@/experiencias/terreno/socorro/pages/IncidentLogWizard'));
const HabitabilityWizard = lazy(() => import('@/experiencias/terreno/socorro/pages/HabitabilityWizard'));

export const rutasTerreno = (
  <Route element={<LayoutTerreno />}>
    <Route index element={<CitizenDashboard />} />
    <Route path="reportar" element={<ReportWizard />} />
    <Route path="mis-reportes" element={<MyReports />} />
    <Route path="reportes/:codigo" element={<ReportDetail />} />
    <Route path="ayudas" element={<AidDirectory />} />
    <Route path="alertas" element={<Alerts />} />

    <Route path="brigada" element={<RescuerDashboard />} />
    <Route path="brigada/censo" element={<FieldCensusWizard />} />

    <Route path="socorro" element={<SocorroDashboard />} />
    <Route path="socorro/incidente" element={<IncidentLogWizard />} />
    <Route path="socorro/evaluacion" element={<HabitabilityWizard />} />

    {/* Rutas anteriores: se conservan para que ningún enlace ya compartido muera. */}
    <Route path="reporte/:codigo" element={<RedireccionSeguimiento />} />
    <Route path="rescatista" element={<Navigate to="/brigada" replace />} />
    <Route path="rescatista/censo" element={<Navigate to="/brigada/censo" replace />} />
  </Route>
);

/**
 * `/reporte/:codigo` era la ruta vieja; el contrato usa `codigo` y plural.
 *
 * El código sale del parámetro de la ruta y no de `window.location`: así el redirección funciona
 * igual bajo cualquier router y no depende de la URL real del navegador.
 */
function RedireccionSeguimiento() {
  const { codigo } = useParams<{ codigo: string }>();
  return <Navigate to={`/reportes/${codigo ?? ''}`} replace />;
}
