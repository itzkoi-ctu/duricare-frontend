import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Shell from '../components/layout/Shell';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ZoneDetailPage = lazy(() => import('../pages/ZoneDetailPage'));
const AlertsPage = lazy(() => import('../pages/AlertsPage'));
const AgentPage = lazy(() => import('../pages/AgentPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-navy/30 border-t-navy rounded-full animate-spin" />
        <span className="text-sm text-gray">Đang tải...</span>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/zones/:zoneCode" element={<ZoneDetailPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/agent" element={<AgentPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
