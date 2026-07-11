import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { consumeGoogleOAuthRedirect } from './lib/googleAuth';
import { getUserFacingError } from './lib/userFacingError';
import { getOrCreateSessionId, trackEvent } from './utils/analytics';
import UserGuideProvider from './components/onboarding/UserGuideProvider';
import MaintenanceGate from './components/maintenance/MaintenanceGate';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const FemaleDashboardPage = lazy(() => import('./pages/FemaleDashboardPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const CyclesPage = lazy(() => import('./pages/CyclesPage'));
const SymptomsPage = lazy(() => import('./pages/SymptomsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SettingsNotificationsPage = lazy(() => import('./pages/SettingsNotificationsPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const CoupleMapPage = lazy(() => import('./pages/CoupleMapPage'));
const MaleDashboardPage = lazy(() => import('./pages/MaleDashboardPage'));
const MaleSettingsNotificationsPage = lazy(() => import('./pages/MaleSettingsNotificationsPage'));
const PartnerPage = lazy(() => import('./pages/PartnerPage'));
const PartnerInvitePage = lazy(() => import('./pages/PartnerInvitePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const Layout = lazy(() => import('./components/layout/Layout'));
const FloatingHiChat = lazy(() => import('./components/chat/FloatingHiChat'));
const PaymentSuccessPage = lazy(() => import('./pages/payment/PaymentSuccessPage'));
const PaymentCancelPage = lazy(() => import('./pages/payment/PaymentCancelPage'));
const HelpPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.HelpPage })));
const PrivacyPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.TermsPage })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token, isBootstrapping } = useAuthStore();
  if (isBootstrapping) return null;
  if (!token) return <Navigate to="/login" replace />;
  if (user && !user.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function UserOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, token, isBootstrapping } = useAuthStore();
  if (isBootstrapping) return null;
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function authDest(user: ReturnType<typeof useAuthStore.getState>['user']) {
  if (user?.role === 'admin') return '/admin';
  if (!user?.onboardingCompleted) return '/onboarding';
  return user.gender === 'female' ? '/female-dashboard' : '/male-dashboard';
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, token, isBootstrapping } = useAuthStore();
  if (isBootstrapping) return null;
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to={authDest(user)} replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { token, user, isBootstrapping } = useAuthStore();
  if (isBootstrapping) return null;
  if (token) return <Navigate to={authDest(user)} replace />;
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { token, user, isBootstrapping } = useAuthStore();
  if (isBootstrapping) return null;
  if (!token) return <Navigate to="/login" replace />;
  if (user?.onboardingCompleted) return <Navigate to={authDest(user)} replace />;
  return <>{children}</>;
}

function HomeRoute() {
  const { token, user, isBootstrapping } = useAuthStore();
  if (isBootstrapping) return null;
  if (token) return <Navigate to={authDest(user)} replace />;
  return <LandingPage />;
}

/** Redirect /dashboard → gender-specific dashboard */
function DashboardRedirect() {
  const { user } = useAuthStore();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to={user?.gender === 'female' ? '/female-dashboard' : '/male-dashboard'} replace />;
}

function FloatingHiChatGate() {
  const { token, user, isBootstrapping } = useAuthStore();
  const location = useLocation();
  const path = location.pathname;
  const hiddenOnRoute =
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/onboarding') ||
    path.startsWith('/admin') ||
    path.startsWith('/terms') ||
    path.startsWith('/privacy') ||
    path.startsWith('/help');

  if (isBootstrapping || !token || user?.role === 'admin' || hiddenOnRoute) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <FloatingHiChat />
    </Suspense>
  );
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-pink-50/40">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-100 border-t-pink-500" />
    </div>
  );
}

export default function App() {
  const { bootstrapSession, socialLogin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  // ── ANALYTICS TRACKING ──
  useEffect(() => {
    getOrCreateSessionId();
    trackEvent('PAGE_VIEW', location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickable = target.closest('button, a, [role="button"], [data-track]');
      if (clickable) {
        const trackId = clickable.getAttribute('data-track') || clickable.id;
        const text = clickable.textContent?.trim() || '';
        if (trackId || clickable.tagName === 'BUTTON' || clickable.tagName === 'A' || clickable.getAttribute('role') === 'button') {
          const identifier = trackId || `tag:${clickable.tagName.toLowerCase()}`;
          trackEvent('CLICK', identifier, text.substring(0, 50));
        }
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('id_token=') || hash.includes('access_token='))) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      const performRedirectLogin = async () => {
        toast.loading('Dang xu ly dang nhap Google...', { id: 'google-redirect-login' });
        try {
          const redirect = consumeGoogleOAuthRedirect(hash);
          if (!redirect) {
            throw new Error('Google redirect khong hop le');
          }
          const user = await socialLogin('google', { credential: redirect.credential });
          toast.dismiss('google-redirect-login');
          toast.success('Dang nhap Google thanh cong!');

          let destination = '/male-dashboard';
          if (user.role === 'admin') destination = '/admin';
          else if (!user.onboardingCompleted) destination = '/onboarding';
          else if (user.gender === 'female') destination = '/female-dashboard';

          navigate(redirect.nextPath ?? destination);
        } catch (err: any) {
          toast.dismiss('google-redirect-login');
          toast.error(getUserFacingError(err, 'Đăng nhập Google thất bại'));
        }
      };
      performRedirectLogin();
    }
  }, [location.hash, socialLogin, navigate]);

  return (
    <MaintenanceGate>
      <UserGuideProvider>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
      <Route path="/forgot-password" element={<AuthRoute><ForgotPasswordPage /></AuthRoute>} />
      <Route path="/reset-password/:token" element={<AuthRoute><ResetPasswordPage /></AuthRoute>} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/connect" element={<PartnerInvitePage />} />
      <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />
      {/* Female dashboard — standalone (no sidebar Layout) */}
      <Route path="/female-dashboard" element={<UserOnlyRoute><ProtectedRoute><FemaleDashboardPage /></ProtectedRoute></UserOnlyRoute>} />
      {/* Standalone pages for female users */}
      <Route path="/settings/notifications" element={<UserOnlyRoute><ProtectedRoute><SettingsNotificationsPage /></ProtectedRoute></UserOnlyRoute>} />
      <Route path="/cycles" element={<UserOnlyRoute><ProtectedRoute><CyclesPage /></ProtectedRoute></UserOnlyRoute>} />
      {/* Male dashboard — standalone (no sidebar Layout) */}
      <Route path="/male-dashboard" element={<UserOnlyRoute><ProtectedRoute><MaleDashboardPage /></ProtectedRoute></UserOnlyRoute>} />
      <Route path="/male-settings/notifications" element={<UserOnlyRoute><ProtectedRoute><MaleSettingsNotificationsPage /></ProtectedRoute></UserOnlyRoute>} />
      <Route path="/partner" element={<UserOnlyRoute><ProtectedRoute><PartnerPage /></ProtectedRoute></UserOnlyRoute>} />
      {/* Standalone payment routes */}
      <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
      <Route path="/payment/cancel" element={<ProtectedRoute><PaymentCancelPage /></ProtectedRoute>} />

      {/* Admin — standalone, no Navbar */}
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

      <Route element={<Layout />}>
        <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/products" element={<UserOnlyRoute><ProtectedRoute><ProductsPage /></ProtectedRoute></UserOnlyRoute>} />
        <Route path="/couple-map" element={<UserOnlyRoute><ProtectedRoute><CoupleMapPage /></ProtectedRoute></UserOnlyRoute>} />
        <Route path="/symptoms" element={<ProtectedRoute><SymptomsPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      </Route>
        </Routes>
        </Suspense>
        <FloatingHiChatGate />
      </UserGuideProvider>
    </MaintenanceGate>
  );
}
