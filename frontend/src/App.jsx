import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import HomePage from './pages/public/HomePage';
import SalariesPage from './pages/public/SalariesPage';
import CompaniesPage from './pages/public/CompaniesPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import SubmitSalaryPage from './pages/public/SubmitSalaryPage';
import DashboardPage from './pages/public/DashboardPage';
import OAuth2RedirectPage from './pages/public/OAuth2RedirectPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCompanies from './pages/admin/AdminCompanies';
import AdminPendingSalaries from './pages/admin/AdminPendingSalaries';
import AdminLevelMappings from './pages/admin/AdminLevelMappings';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/salaries" element={<SalariesPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/oauth2/redirect" element={<OAuth2RedirectPage />} />

          {/* Authenticated user routes */}
          <Route path="/submit" element={
            <ProtectedRoute><SubmitSalaryPage /></ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/companies" element={
            <ProtectedRoute adminOnly><AdminCompanies /></ProtectedRoute>
          } />
          <Route path="/admin/pending" element={
            <ProtectedRoute adminOnly><AdminPendingSalaries /></ProtectedRoute>
          } />
          <Route path="/admin/levels" element={
            <ProtectedRoute adminOnly><AdminLevelMappings /></ProtectedRoute>
          } />
          <Route path="/admin/audit" element={
            <ProtectedRoute adminOnly><AdminAuditLogs /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
