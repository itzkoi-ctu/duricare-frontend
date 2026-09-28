import { Link, Outlet, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useOverviewContext } from '../../context/OverviewContext';
import { getWeatherInfo } from '../../utils/weatherLabels';

export default function Shell() {
  const location = useLocation();
  const { data } = useOverviewContext();

  const farmName = data?.farmName || 'Nông trại DuriCare';
  const totalAlerts = data?.totalUnresolvedAlerts ?? 0;
  const weather = data?.weather;
  const weatherInfo = weather ? getWeatherInfo(weather.weatherCode) : null;

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/zones');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* ─── Desktop Top Bar (lg+) ─── */}
      <header className="hidden lg:flex fixed top-0 left-64 right-0 z-30 h-16 bg-surface/90 backdrop-blur-md border-b border-border items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-navy dark:text-blue">
            Hệ thống giám sát vi khí hậu &amp; rễ sầu riêng
          </span>
          <span className="text-gray text-xs">•</span>
          <span className="text-xs font-semibold text-text truncate max-w-md">
            {farmName}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Weather status pill (gracefully hidden if weather is null) */}
          {weather && weatherInfo && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg border border-border text-xs text-text shadow-2xs">
              <span className="material-symbols-outlined text-[18px] text-amber">
                {weatherInfo.icon}
              </span>
              <span className="font-medium">
                {weather.temperature}°C {weatherInfo.label} • Cần Thơ
              </span>
            </div>
          )}

          {/* Alert bell icon with badge */}
          <Link
            to="/alerts"
            aria-label={`Xem ${totalAlerts} cảnh báo`}
            className="relative p-2 rounded-xl text-gray hover:text-text hover:bg-border/40 transition-colors"
            title={`Có ${totalAlerts} cảnh báo chưa xử lý`}
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs">
                {totalAlerts > 99 ? '99+' : totalAlerts}
              </span>
            )}
          </Link>

          {/* Theme Toggle */}
          <div className="pl-1 border-l border-border">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ─── Desktop Sidebar (lg+) ─── */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:flex-col bg-surface border-r border-border justify-between">
        <div>
          {/* Brand Logo & App Name */}
          <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
            <span className="text-2xl" role="img" aria-label="durian tree">
              🌳
            </span>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold text-navy dark:text-blue tracking-tight">
                DuriCare
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-teal">
                IoT &amp; AI Agriculture
              </span>
            </div>
          </div>

          {/* Farm identification chip */}
          <div className="px-4 py-3 border-b border-border/60">
            <div className="px-3 py-2 rounded-xl bg-bg border border-border/80 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray">
                Trạm theo dõi
              </span>
              <span className="text-xs font-semibold text-text truncate" title={farmName}>
                {farmName}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-4 space-y-1.5">
            <Link
              to="/"
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive('/')
                  ? 'bg-navy/10 text-navy dark:bg-blue/15 dark:text-blue shadow-2xs'
                  : 'text-gray hover:bg-border/40 hover:text-text'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
                <span>Tổng quan</span>
              </div>
            </Link>

            <Link
              to="/alerts"
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive('/alerts')
                  ? 'bg-coral/10 text-coral shadow-2xs'
                  : 'text-gray hover:bg-border/40 hover:text-text'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                <span>Cảnh báo</span>
              </div>
              {totalAlerts > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-coral text-white text-[11px] font-bold leading-none">
                  {totalAlerts > 99 ? '99+' : totalAlerts}
                </span>
              )}
            </Link>

            <Link
              to="/agent"
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive('/agent')
                  ? 'bg-teal/10 text-teal shadow-2xs'
                  : 'text-gray hover:bg-border/40 hover:text-text'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">psychology</span>
                <span>Trợ lý AI</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-teal/15 text-teal text-[10px] font-bold uppercase tracking-wider">
                AI Agent
              </span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer: Station Info */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="p-3 rounded-xl bg-bg border border-border/80 flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text">Hệ thống trạm đo CTU</span>
              <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            </div>
            <span className="text-[11px] text-gray">
              Kết nối ổn định • Cảm biến trực tuyến
            </span>
          </div>
        </div>
      </aside>

      {/* ─── Mobile Top Bar (<lg) ─── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-surface/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4">
        {/* Mobile Header Title */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0" role="img" aria-label="durian tree">
            🌳
          </span>
          <span className="text-sm font-bold text-navy dark:text-blue truncate">
            {farmName}
          </span>
        </div>

        {/* Right Actions: ThemeToggle + Bell */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Link
            to="/alerts"
            aria-label={`Xem ${totalAlerts} cảnh báo`}
            className="relative p-2 rounded-lg text-gray hover:text-text hover:bg-border/50 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {totalAlerts > 99 ? '99+' : totalAlerts}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* ─── Mobile Bottom Navigation (<lg) ─── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 py-1.5 safe-area-pb shadow-lg">
        <Link
          to="/"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[11px] font-medium transition-colors ${
            isActive('/')
              ? 'text-navy dark:text-blue font-bold'
              : 'text-gray hover:text-text'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">grid_view</span>
          <span>Tổng quan</span>
        </Link>

        <Link
          to="/alerts"
          className={`relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[11px] font-medium transition-colors ${
            isActive('/alerts')
              ? 'text-coral font-bold'
              : 'text-gray hover:text-text'
          }`}
        >
          <div className="relative">
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {totalAlerts > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-coral text-white text-[9px] font-bold flex items-center justify-center leading-none shadow-xs">
                {totalAlerts > 99 ? '99+' : totalAlerts}
              </span>
            )}
          </div>
          <span>Cảnh báo</span>
        </Link>

        <Link
          to="/agent"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[11px] font-medium transition-colors ${
            isActive('/agent')
              ? 'text-teal font-bold'
              : 'text-gray hover:text-text'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">psychology</span>
          <span>Trợ lý AI</span>
        </Link>
      </nav>

      {/* ─── Main Content ─── */}
      <main className="pt-14 pb-20 lg:pt-16 lg:pb-8 lg:pl-64 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
