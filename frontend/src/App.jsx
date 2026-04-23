import { Routes, Route, Navigate } from 'react-router-dom';

// Layout
import Layout from './layouts/Layout';
import { PatientProvider } from './context/PatientContext';
import { useAuth } from './context/AuthContext';
import { AdminProvider } from './context/AdminContext';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages (No layout)
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

// Authenticated Pages (With layout)
import Dashboard from './pages/Dashboard';
import NewAnalysisPage from './pages/NewAnalysisPage';
import PatientRecordsPage from './pages/PatientRecordsPage';
import ReportsPage from './pages/ReportsPage';
import AIModelsPage from './pages/AIModelsPage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboard from './pages/AdminDashboard';
import UserManagementPage from './pages/UserManagementPage';
import ScanMonitoringPage from './pages/ScanMonitoringPage';
import AuditLogsPage from './pages/AuditLogsPage';
import SystemHealthPage from './pages/SystemHealthPage';

const AdminRoute = ({ children }) => {
    const { token, user, isLoading } = useAuth();
    if (isLoading) return null;
    if (!token || !user) return <Navigate to="/" replace />;
    if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
    return children;
};

function AppRoutes() {
  const { user, isPathologist, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: '#0a0f1a'
        }}>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-400" />
        </div>
    );
  }

  return (
    <Routes>
      {/* ═══ Public / Auth Routes ═══ */}
      <Route path="/" element={
        user ? (user.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/dashboard" replace />) : <Navigate to="/welcome" replace />
      } />

      <Route path="/welcome" element={
        user ? (user.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/dashboard" replace />) : <WelcomePage />
      } />

      <Route path="/login" element={
        <Navigate to="/welcome" replace />
      } />

      <Route path="/register" element={
        user ? (user.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/dashboard" replace />) : <RegisterPage />
      } />

      <Route path="/forgot-password" element={
        user ? (user.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/dashboard" replace />) : <ForgotPasswordPage />
      } />

      {/* ═══ Admin Protected Routes (With Layout) ═══ */}
      <Route element={
        <AdminRoute>
          <AdminProvider>
            <Layout />
          </AdminProvider>
        </AdminRoute>
      }>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/admin/audit" element={<AuditLogsPage />} />
      </Route>

      {/* ═══ Doctor Protected Routes (With Layout) ═══ */}
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/analysis" element={
          (isPathologist || user?.role === 'doctor' || user?.role === 'pathologist') ? <NewAnalysisPage /> : <Navigate to="/" />
        } />

        <Route path="/dashboard" element={
          (isPathologist || user?.role === 'doctor' || user?.role === 'pathologist') ? <Dashboard /> : <Navigate to={user?.role === 'admin' ? "/admin/dashboard" : "/welcome"} replace />
        } />

        <Route path="/patients" element={<PatientRecordsPage />} />

        <Route path="/reports" element={
          isPathologist ? <ReportsPage /> : <Navigate to="/" />
        } />


        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <PatientProvider>
      <AppRoutes />
    </PatientProvider>
  );
}
