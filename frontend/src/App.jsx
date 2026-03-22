import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import OpportunitiesPage       from './pages/public/OpportunitiesPage';
import PostOpportunityPage     from './pages/public/PostOpportunityPage';
import AdminOpportunities      from './pages/admin/AdminOpportunities';

// Admin pages
import AdminDashboard       from './pages/admin/AdminDashboard';
import AdminCompanies       from './pages/admin/AdminCompanies';
import AdminPendingSalaries from './pages/admin/AdminPendingSalaries';
import AdminAuditLogs       from './pages/admin/AdminAuditLogs';
import AdminGuideLevels     from './pages/admin/AdminGuideLevels';
import AdminJobFunctions    from './pages/admin/AdminJobFunctions';
import { AppDataProvider }  from './context/AppDataContext';
import AdminSidebar         from './components/admin/AdminSidebar';
import Footer              from './components/shared/Footer';
import LevelGuideView      from './pages/public/LevelGuideView';

// Static pages
import AboutPage           from './pages/public/AboutPage';
import FAQPage             from './pages/public/FAQPage';
import ContactPage         from './pages/public/ContactPage';
import PrivacyPage         from './pages/public/PrivacyPage';
import TermsPage           from './pages/public/TermsPage';

function PrivateRoute({ children, adminOnly = false }) {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

/** Renders Footer on all public routes, hidden on /admin/* (admin has its own offset Footer) */
function PublicFooter() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return null;
  return <Footer />;
}

function AdminLayout({ children }) {
  return (
    <div style={{ display: 'flex' }}>
      <AdminSidebar />
      <div style={{ flex: 1, marginLeft: 220, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1 }}>{children}</div>
        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
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
            <Route path="/opportunities"      element={<OpportunitiesPage />} />
            <Route path="/opportunities/post"  element={
              <PrivateRoute><PostOpportunityPage /></PrivateRoute>
            }/>
            {/* Legacy referral routes — redirect to new Opportunities system */}
            <Route path="/referrals"           element={<Navigate to="/opportunities" replace />} />
            <Route path="/refer"               element={<Navigate to="/opportunities/post" replace />} />
            <Route path="/my-referral-links"   element={<Navigate to="/opportunities/post" replace />} />
            {/* Legacy launchpad routes — redirect to Opportunities */}
            <Route path="/launchpad"        element={<Navigate to="/opportunities" replace />} />
            <Route path="/launchpad/submit" element={<Navigate to="/opportunities/post" replace />} />

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
            <Route path="/admin/opportunities" element={
              <PrivateRoute adminOnly>
                <AdminLayout><AdminOpportunities /></AdminLayout>
              </PrivateRoute>
            }/>
            {/* Legacy redirect */}
            <Route path="/admin/referrals"     element={<Navigate to="/admin/opportunities" replace />} />

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
            <Route path="*" element={<Navigate to="/" replace />} />
          {/* Static pages */}
            <Route path="/about"       element={<AboutPage />} />
            <Route path="/faq"         element={<FAQPage />} />
            <Route path="/contact"     element={<ContactPage />} />
            <Route path="/privacy"     element={<PrivacyPage />} />
            <Route path="/terms"       element={<TermsPage />} />
            <Route path="/level-guide" element={<LevelGuideView />} />
          </Routes>
        <PublicFooter />
        </div>
      </BrowserRouter>
      </AppDataProvider>
    </AuthProvider>
  );
}
