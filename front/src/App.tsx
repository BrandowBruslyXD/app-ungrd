import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import CitizenDashboard from '@/pages/CitizenDashboard';
import ReportWizard from '@/pages/ReportWizard';
import MyReports from '@/pages/MyReports';
import ReportDetail from '@/pages/ReportDetail';
import AidDirectory from '@/pages/AidDirectory';
import Alerts from '@/pages/Alerts';
import ManagerDashboard from '@/pages/ManagerDashboard';
import RescuerDashboard from '@/pages/RescuerDashboard';
import FieldCensusWizard from '@/pages/FieldCensusWizard';
import SocorroDashboard from '@/pages/SocorroDashboard';
import IncidentLogWizard from '@/pages/IncidentLogWizard';
import HabitabilityWizard from '@/pages/HabitabilityWizard';
import type { DemoView } from '@/types';

export default function App() {
  const [role, setRole] = useState<DemoView>('Ciudadano');

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 overflow-x-hidden">
        <Header role={role} onRoleChange={setRole} />
        <main>
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
        </main>
      </div>
    </BrowserRouter>
  );
}
