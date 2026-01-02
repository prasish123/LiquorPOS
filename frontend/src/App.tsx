import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { Login } from './pages/Login';
import { POSTerminal } from './pages/POSTerminal';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboard } from './pages/Admin/Dashboard';
import { OfflineBanner } from './components/OfflineBanner';
import { Toast } from './components/Toast';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import './index.css';

function ProtectedRoute({ children, allowedRoles }: { children: React.JSX.Element, allowedRoles?: string[] }) {
  const { user, isAuthenticated } = useAuth();

  // BYPASS: For demo, check if there is a user, but if not, let it through or redirect?
  // Actually, we are removing protection from the route itself, so this component might not be used.
  // But let's keep logic sound just in case.
  if (!isAuthenticated) return <Navigate to="/login" />;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return user.role === 'CASHIER' ? <Navigate to="/pos" /> : <Navigate to="/admin" />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app bg-black min-h-screen text-white">
          <Toast />
          <OfflineBanner />
          <PWAInstallPrompt />
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/pos" element={
              <ProtectedRoute allowedRoles={['CASHIER', 'MANAGER', 'ADMIN']}>
                <POSTerminal />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
            </Route>

            {/* Default redirect to POS */}
            <Route path="/" element={<Navigate to="/pos" />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
