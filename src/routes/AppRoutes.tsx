import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Shell from '../components/layout/Shell';
import { OverviewProvider } from '../context/OverviewContext';
import RequireAuth from '../components/auth/RequireAuth';
import LoginRoute from '../components/auth/LoginRoute';
import AuthorizationNotice from '../components/auth/AuthorizationNotice';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ZoneDetailPage = lazy(() => import('../pages/ZoneDetailPage'));
const AlertsPage = lazy(() => import('../pages/AlertsPage'));
const AgentPage = lazy(() => import('../pages/AgentPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));

function LoadingFallback() {
  useLanguage();
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-navy/30 border-t-navy rounded-full animate-spin" />
        <span className="text-sm text-gray">{t("Đang tải...")}</span>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  useLanguage();
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthorizationNotice />
      <Routes>
        <Route path="/login" element={<LoginRoute><LoginPage /></LoginRoute>} />
        <Route element={<RequireAuth />}>
          <Route element={<OverviewProvider><Shell /></OverviewProvider>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/zones/:zoneCode" element={<ZoneDetailPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/agent" element={<AgentPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
