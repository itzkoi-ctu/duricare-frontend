import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Shell from '../components/layout/Shell';
import { OverviewProvider } from '../context/OverviewContext';
import RequireAuth from '../components/auth/RequireAuth';
import RequireRole from '../components/auth/RequireRole';
import LoginRoute from '../components/auth/LoginRoute';
import AuthorizationNotice from '../components/auth/AuthorizationNotice';
import ExpertShell from '../components/layout/ExpertShell';
import { ToastProvider } from '../context/ToastContext';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ZoneDetailPage = lazy(() => import('../pages/ZoneDetailPage'));
const AlertsPage = lazy(() => import('../pages/AlertsPage'));
const AgentPage = lazy(() => import('../pages/AgentPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const FarmSettingsPage = lazy(() => import('../pages/FarmSettingsPage'));
const ZoneManagementPage = lazy(() => import('../pages/ZoneManagementPage'));
const ZoneEditorPage = lazy(() => import('../pages/ZoneEditorPage'));
const KnowledgePage = lazy(() => import('../pages/KnowledgePage'));
const KnowledgeSourcesPage = lazy(() => import('../pages/KnowledgeSourcesPage'));
const KnowledgeSourceCreatePage = lazy(() => import('../pages/KnowledgeSourceCreatePage'));
const KnowledgeSourceDetailPage = lazy(() => import('../pages/KnowledgeSourceDetailPage'));
const KnowledgeSourceEditPage = lazy(() => import('../pages/KnowledgeSourceEditPage'));
const ExpertListPage = lazy(() => import('../pages/ExpertListPage'));
const ExpertCreatePage = lazy(() => import('../pages/ExpertCreatePage'));
const ExpertDetailPage = lazy(() => import('../pages/ExpertDetailPage'));

import { useAuth } from '../hooks/useAuth';

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

function KnowledgeSourcesShell() {
  const { user } = useAuth();
  if (user?.role === 'EXPERT') {
    return <ExpertShell />;
  }
  return (
    <OverviewProvider>
      <Shell />
    </OverviewProvider>
  );
}

export default function AppRoutes() {
  useLanguage();
  return (
    <ToastProvider>
      <Suspense fallback={<LoadingFallback />}>
        <AuthorizationNotice />
        <Routes>
          <Route path="/login" element={<LoginRoute><LoginPage /></LoginRoute>} />
          <Route element={<RequireAuth />}>
            {/* EXPERT Profile Route */}
            <Route element={<RequireRole roles={['EXPERT']} />}>
              <Route element={<ExpertShell />}>
                <Route path="/knowledge" element={<KnowledgePage />} />
              </Route>
            </Route>

            {/* Knowledge Governance Routes for ADMIN and EXPERT */}
            <Route element={<RequireRole roles={['ADMIN', 'EXPERT']} />}>
              <Route element={<KnowledgeSourcesShell />}>
                <Route path="/knowledge/sources" element={<KnowledgeSourcesPage />} />
                <Route path="/knowledge/sources/new" element={<KnowledgeSourceCreatePage />} />
                <Route path="/knowledge/sources/:id" element={<KnowledgeSourceDetailPage />} />
                <Route path="/knowledge/sources/:sourceId/revisions/:revisionId/edit" element={<KnowledgeSourceEditPage />} />
              </Route>
            </Route>

            {/* Farm & Management Routes for ADMIN and OWNER */}
            <Route element={<RequireRole roles={['ADMIN', 'OWNER']} />}>
            <Route element={<OverviewProvider><Shell /></OverviewProvider>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/zones/:zoneCode" element={<ZoneDetailPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/agent" element={<AgentPage />} />
              <Route element={<RequireRole roles={['ADMIN']} />}>
                <Route path="/settings/farm" element={<FarmSettingsPage />} />
                <Route path="/settings/zones" element={<ZoneManagementPage />} />
                <Route path="/settings/zones/new" element={<ZoneEditorPage />} />
                <Route path="/settings/zones/:code/edit" element={<ZoneEditorPage />} />
                <Route path="/settings/experts" element={<ExpertListPage />} />
                <Route path="/settings/experts/new" element={<ExpertCreatePage />} />
                <Route path="/settings/experts/:id" element={<ExpertDetailPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}
