import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { useAuthStore } from './store/authStore';

// Code-splitting por ruta: cada página se descarga sólo cuando se visita.
// El editor de flujos (reactflow) es el chunk más pesado y queda fuera del
// bundle inicial; la landing pública tampoco carga el panel.
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TenantsPage = lazy(() => import('./pages/TenantsPage'));
const TenantDetailPage = lazy(() => import('./pages/TenantDetailPage'));
const FlowsPage = lazy(() => import('./pages/FlowsPage'));
const FlowEditorPage = lazy(() => import('./pages/FlowEditorPage'));
const ConsumoIaPage = lazy(() => import('./pages/ConsumoIaPage'));
const CalendarioPage = lazy(() => import('./pages/CalendarioPage'));

// Fallback ligero mientras baja el chunk de la ruta.
function RouteFallback() {
  return (
    <div className="flex h-full min-h-[40vh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />
    </div>
  );
}

// Enrutado principal del panel admin.
export default function App() {
  // Cuando la API detecta que la sesión murió (refresh falló / reemplazada),
  // se cierra suave con aviso, desde cualquier ruta.
  useEffect(() => {
    const onDead = () =>
      useAuthStore
        .getState()
        .forceLogout('Su sesión se cerró. Es posible que haya iniciado sesión en otro dispositivo.');
    window.addEventListener('wabots:session-dead', onDead);
    return () => window.removeEventListener('wabots:session-dead', onDead);
  }, []);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/tenants/:id" element={<TenantDetailPage />} />
          <Route path="/flows" element={<FlowsPage />} />
          <Route path="/consumo" element={<ConsumoIaPage />} />
          <Route path="/calendario" element={<CalendarioPage />} />
        </Route>

        {/* El editor de flujos va a pantalla completa, fuera del layout con sidebar */}
        <Route
          path="/flows/:id/editor"
          element={
            <ProtectedRoute>
              <FlowEditorPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
