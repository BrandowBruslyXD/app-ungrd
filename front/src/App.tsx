import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/layout/Header';
import type { DemoView } from '@/types';

const CitizenDashboard = lazy(() => import('@/features/reportes/pages/CitizenDashboard'));
const ReportWizard = lazy(() => import('@/features/reportes/pages/ReportWizard'));
const MyReports = lazy(() => import('@/features/reportes/pages/MyReports'));
const ReportDetail = lazy(() => import('@/features/reportes/pages/ReportDetail'));
const AidDirectory = lazy(() => import('@/features/reportes/pages/AidDirectory'));
const Alerts = lazy(() => import('@/features/reportes/pages/Alerts'));
const ManagerDashboard = lazy(() => import('@/features/gestor/pages/ManagerDashboard'));
const RescuerDashboard = lazy(() => import('@/pages/RescuerDashboard'));
const FieldCensusWizard = lazy(() => import('@/pages/FieldCensusWizard'));
const SocorroDashboard = lazy(() => import('@/pages/SocorroDashboard'));
const IncidentLogWizard = lazy(() => import('@/pages/IncidentLogWizard'));
const HabitabilityWizard = lazy(() => import('@/pages/HabitabilityWizard'));

function PageFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <p className="text-sm text-slate-500">{t('app.loadingPage')}</p>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState<DemoView>('Ciudadano');

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 overflow-x-hidden">
        <Header role={role} onRoleChange={setRole} />
        <main>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route
                path="/"
                element={
                  role === 'Gestor' ? (
                    <Navigate to="/gestor" replace />
                  ) : role === 'Brigadista' ? (
                    <Navigate to="/rescatista" replace />
                  ) : role === 'Socorro' ? (
                    <Navigate to="/socorro" replace />
                  ) : (
                    <CitizenDashboard />
                  )
                }
              />
              <Route path="/reportar" element={<ReportWizard />} />
              <Route path="/mis-reportes" element={<MyReports />} />
              <Route path="/reporte/:id" element={<ReportDetail />} />
              <Route path="/ayudas" element={<AidDirectory />} />
              <Route path="/alertas" element={<Alerts />} />
              <Route path="/gestor" element={<ManagerDashboard />} />
              <Route path="/rescatista" element={<RescuerDashboard />} />
              <Route path="/rescatista/censo" element={<FieldCensusWizard />} />
              <Route path="/socorro" element={<SocorroDashboard />} />
              <Route path="/socorro/incidente" element={<IncidentLogWizard />} />
              <Route path="/socorro/evaluacion" element={<HabitabilityWizard />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}
