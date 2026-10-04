import { useLanguage } from '../../i18n/useLanguage';
import { t } from '../../i18n';
import { Link, Outlet } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import LanguageSelect from './LanguageSelect';
import { useOverviewContext } from '../../context/OverviewContext';
import { getWeatherInfo } from '../../utils/weatherLabels';
import { useAuth } from '../../hooks/useAuth';
import useLogout from '../../hooks/useLogout';
import UserAccount from '../auth/UserAccount';
import ShellNavigation from './ShellNavigation';

export default function Shell() {
  useLanguage();
  const { user } = useAuth();
  const logout = useLogout();
  const { data } = useOverviewContext();

  const farmName = data?.farmName || t("Nông trại DuriCare");
  const totalAlerts = data?.totalUnresolvedAlerts ?? 0;
  const weather = data?.weather;
  const weatherInfo = weather ? getWeatherInfo(weather.weatherCode) : null;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* ─── Desktop Top Bar (lg+) ─── */}
      <header className="hidden lg:flex fixed top-0 left-64 right-0 z-30 h-16 bg-surface/90 backdrop-blur-md border-b border-border items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-navy dark:text-blue"> {t("Hệ thống giám sát vi khí hậu & rễ sầu riêng")} </span>
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
                {weather.temperature}°C {weatherInfo.label} {t("• Cần Thơ")} </span>
            </div>
          )}

          {/* Alert bell icon with badge */}
          <Link
            to="/alerts"
            aria-label={t("Xem {0} cảnh báo", [totalAlerts])}
            className="relative p-2 rounded-xl text-gray hover:text-text hover:bg-border/40 transition-colors"
            title={t("Có {0} cảnh báo chưa xử lý", [totalAlerts])}
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs">
                {totalAlerts > 99 ? '99+' : totalAlerts}
              </span>
            )}
          </Link>

          <LanguageSelect />
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
            <span className="text-2xl" role="img" aria-label={t('Cây sầu riêng')}>
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
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray"> {t("Trạm theo dõi")} </span>
              <span className="text-xs font-semibold text-text truncate" title={farmName}>
                {farmName}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <ShellNavigation role={user.role} totalAlerts={totalAlerts} />
        </div>

        {/* Sidebar Footer: Station Info */}
        <div className="p-4 border-t border-border space-y-3">
          <UserAccount user={user} pending={logout.pending} error={logout.error} onLogout={logout.submit} />
          <div className="p-3 rounded-xl bg-bg border border-border/80 flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text">{t("Hệ thống trạm đo CTU")}</span>
              <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            </div>
            <span className="text-[11px] text-gray"> {t("Kết nối ổn định • Cảm biến trực tuyến")} </span>
          </div>
        </div>
      </aside>

      {/* ─── Mobile Top Bar (<lg) ─── */}
      <header className={`lg:hidden fixed top-0 left-0 right-0 z-40 ${logout.error ? 'h-[calc(11.5rem+env(safe-area-inset-top))]' : 'h-[calc(8.5rem+env(safe-area-inset-top))]'} pt-[env(safe-area-inset-top)] bg-surface/95 backdrop-blur-md border-b border-border px-4`}>
        <div className="h-14 flex items-center justify-between gap-3">
        {/* Mobile Header Title */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0" role="img" aria-label={t('Cây sầu riêng')}>
            🌳
          </span>
          <span className="text-sm font-bold text-navy dark:text-blue truncate">
            {farmName}
          </span>
        </div>

        {/* Right Actions: ThemeToggle + Bell */}
        <div className="flex items-center gap-2 shrink-0">
          <LanguageSelect />
          <ThemeToggle />
          <Link
            to="/alerts"
            aria-label={t("Xem {0} cảnh báo", [totalAlerts])}
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
        </div>
        <div className="min-h-20 border-t border-border/60 flex items-center py-2">
          <UserAccount compact user={user} pending={logout.pending} error={logout.error} onLogout={logout.submit} />
        </div>
      </header>

      {/* ─── Mobile Bottom Navigation (<lg) ─── */}
      <ShellNavigation mobile role={user.role} totalAlerts={totalAlerts} />

      {/* ─── Main Content ─── */}
      {/* Keep the mobile scroll viewport below the header, including device safe areas. */}
      <main className={`fixed inset-x-0 ${logout.error ? 'top-[calc(11.5rem+env(safe-area-inset-top))]' : 'top-[calc(8.5rem+env(safe-area-inset-top))]'} bottom-[calc(4rem+env(safe-area-inset-bottom))] overflow-y-auto scroll-pt-4 lg:static lg:overflow-visible lg:pt-16 lg:pb-8 lg:pl-64 lg:min-h-screen`}>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
