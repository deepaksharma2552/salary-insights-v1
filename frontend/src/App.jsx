import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/shared/Navbar';
import { RouterProgressBar } from './components/shared/TopProgressBar';

// Public pages
import HomePage         from './pages/public/HomePage';
import SalariesPage     from './pages/public/SalariesPage';
import CompaniesPage    from './pages/public/CompaniesPage';
import DashboardPage    from './pages/public/DashboardPage';
import LoginPage        from './pages/public/LoginPage';
import RegisterPage     from './pages/public/RegisterPage';
import OAuth2RedirectPage from './pages/public/OAuth2RedirectPage';
import SubmitSalaryPage from './pages/public/SubmitSalaryPage';
import SubmitReferralPage  from './pages/public/SubmitReferralPage';
import MyReferralLinksPage     from './pages/public/MyReferralLinksPage';
import ViewReferralsPage       from './pages/public/ViewReferralsPage';
import LaunchpadPage           from './pages/public/LaunchpadPage';
import SubmitExperiencePage    from './pages/public/SubmitExperiencePage';
import AdminLaunchpad          from './pages/admin/AdminLaunchpad';
import { LaunchpadProvider }   from './context/LaunchpadContext';

// Admin pages
import AdminDashboard       from './pages/admin/AdminDashboard';
import AdminCompanies       from './pages/admin/AdminCompanies';
import AdminPendingSalaries from './pages/admin/AdminPendingSalaries';
import AdminAuditLogs       from './pages/admin/AdminAuditLogs';
import AdminReferrals       from './pages/admin/AdminReferrals';
import AdminGuideLevels     from './pages/admin/AdminGuideLevels';
import AdminJobFunctions    from './pages/admin/AdminJobFunctions';
import { AppDataProvider }  from './context/AppDataContext';
import AdminSidebar         from './components/admin/AdminSidebar';

function PrivateRoute({ children, adminOnly = false }) {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

function AdminLayout({ children }) {
  return (
    <div style={{ display: 'flex' }}>
      <AdminSidebar />
      <div style={{ flex: 1, marginLeft: 220 }}>{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
      <LaunchpadProvider>
      <BrowserRouter>
        <Navbar />
        <RouterProgressBar />
        <div style={{ paddingTop: 56 }}>
          <Routes>
            {/* Public */}
            <Route path="/"          element={<HomePage />} />
            <Route path="/salaries"  element={<SalariesPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/login"     element={<LoginPage />} />
            <Route path="/register"  element={<RegisterPage />} />
            <Route path="/oauth2/redirect" element={<OAuth2RedirectPage />} />
            <Route path="/submit"    element={
              <PrivateRoute><SubmitSalaryPage /></PrivateRoute>
            }/>
            <Route path="/referrals"        element={<ViewReferralsPage />} />
            <Route path="/refer" element={
              <PrivateRoute><SubmitReferralPage /></PrivateRoute>
            }/>
            <Route path="/my-referral-links" element={
              <PrivateRoute><MyReferralLinksPage /></PrivateRoute>
            }/>
            <Route path="/launchpad" element={<LaunchpadPage />} />
            <Route path="/launchpad/submit" element={
              <PrivateRoute><SubmitExperiencePage /></PrivateRoute>
            }/>

            {/* Admin */}
            <Route path="/admin" element={
              <PrivateRoute adminOnly>
                <AdminLayout><AdminDashboard /></AdminLayout>
              </PrivateRoute>
            }/>
            <Route path="/admin/companies" element={
              <PrivateRoute adminOnly>
                <AdminLayout><AdminCompanies /></AdminLayout>
              </PrivateRoute>
            }/>
            <Route path="/admin/salaries" element={
              <PrivateRoute adminOnly>
                <AdminLayout><AdminPendingSalaries /></AdminLayout>
              </PrivateRoute>
            }/>
            <Route path="/admin/audit" element={
              <PrivateRoute adminOnly>
                <AdminLayout><AdminAuditLogs /></AdminLayout>
              </PrivateRoute>
            }/>
            <Route path="/admin/referrals" element={
              <PrivateRoute adminOnly>
                <AdminLayout><AdminReferrals /></AdminLayout>
              </PrivateRoute>
            }/>

            <Route path="/admin/guide-levels" element={
              <PrivateRoute adminOnly>
                <AdminLayout><AdminGuideLevels /></AdminLayout>
              </PrivateRoute>
            }/>
            <Route path="/admin/job-functions" element={
              <PrivateRoute adminOnly>
                <AdminLayout><AdminJobFunctions /></AdminLayout>
              </PrivateRoute>
            }/>
            <Route path="/admin/launchpad" element={
              <PrivateRoute adminOnly>
                <AdminLayout><AdminLaunchpad /></AdminLayout>
              </PrivateRoute>
            }/>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
      </LaunchpadProvider>
      </AppDataProvider>
    </AuthProvider>
  );
}
