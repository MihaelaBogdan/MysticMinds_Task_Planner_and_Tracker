import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import ExecutorDashboard from './pages/ExecutorDashboard';

function HomeRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const routes = { admin: '/admin', manager: '/manager', executor: '/executor' };
  return <Navigate to={routes[user?.role] || '/login'} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/" element={<HomeRedirect />} />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/manager" element={
            <ProtectedRoute allowedRoles={['manager']}>
              <ManagerDashboard />
            </ProtectedRoute>
          } />

          <Route path="/executor" element={
            <ProtectedRoute allowedRoles={['executor']}>
              <ExecutorDashboard />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
