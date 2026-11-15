import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import { t } from '../../i18n';
import { Link, Outlet } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import LanguageSelect from './LanguageSelect';
import { useOverviewContext } from '../../context/OverviewContext';
import { useAuth } from '../../hooks/useAuth';
import useLogout from '../../hooks/useLogout';
import ShellNavigation from './ShellNavigation';
import { BrandLogo, BrandMark } from '../BrandLogo';

export default function Shell() {
  useLanguage();
  const { user } = useAuth();
  const logout = useLogout();
  const { data, farms, selectedFarmId, onSelectFarm } = useOverviewContext();

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('duricare_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const mobileSidebarRef = useRef<HTMLElement>(null);
  const mobileCloseBtnRef = useRef<HTMLButtonElement>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('duricare_sidebar_collapsed', String(next));
      } catch {
        // ignore storage write errors
      }
      return next;
    });
  };

  const openMobileDrawer = (e?: React.MouseEvent) => {
    e?.preventDefault();
    lastActiveElementRef.current = (document.activeElement as HTMLElement) || document.getElementById('btnHamburger');
    setMobileDrawerOpen(true);
  };

  const closeMobileDrawer = () => {
    setMobileDrawerOpen(false);
    const hamburger = document.getElementById('btnHamburger');
    if (hamburger) {
      hamburger.focus();
    } else if (lastActiveElementRef.current) {
      lastActiveElementRef.current.focus();
    }
  };

  // Focus #btnSidebarClose once drawer DOM is mounted & transition initiated
  useEffect(() => {
    if (mobileDrawerOpen) {
      const timer = setTimeout(() => {
        mobileCloseBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [mobileDrawerOpen]);

  // Keyboard accessibility & focus trap for mobile drawer
  useEffect(() => {
    if (!mobileDrawerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMobileDrawer();
        return;
      }

      if (e.key === 'Tab') {
        const sidebar = mobileSidebarRef.current;
        if (!sidebar) return;
        const focusables = sidebar.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !sidebar.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileDrawerOpen]);

  const farmName = data?.farmName || t("Nông trại DuriCare");
  const totalAlerts = data?.totalUnresolvedAlerts ?? 0;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* ─── Desktop Top Bar (lg+) ─── */}
      <header className={`hidden lg:flex fixed top-0 ${sidebarCollapsed ? 'lg:left-20' : 'lg:left-56'} right-0 z-30 h-16 bg-surface/95 backdrop-blur-md border-b border-border items-center justify-between px-6 transition-[left] duration-200`}>
        {/* Left: Farm selector / context pill */}
        {user.role === 'ADMIN' && farms && farms.length > 1 ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg/80 text-text shadow-2xs">
            <span aria-hidden="true" className="material-symbols-outlined text-[#1F5CA9] dark:text-[#60A5FA] text-base shrink-0">
              yard
            </span>
            <select
              id="header-farm-picker"
              aria-label={t("Chọn nông trại")}
              value={String(selectedFarmId ?? '')}
              onChange={(e) => {
                const val = e.target.value;
                if (val) onSelectFarm(Number(val));
              }}
              className="bg-transparent text-xs font-semibold text-text focus:outline-none cursor-pointer pr-1 truncate max-w-xs"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id} className="bg-surface text-text">
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-bg/80 text-text shadow-2xs">
            <span aria-hidden="true" className="material-symbols-outlined text-[#1F5CA9] dark:text-[#60A5FA] text-base shrink-0">
              yard
            </span>
            <span className="text-xs font-semibold text-text truncate max-w-xs sm:max-w-md">
              {farmName}
            </span>
          </div>
        )}

        {/* Right: Notifications, Language, Theme, User Avatar & Logout */}
        <div className="flex items-center gap-3">
          {/* Alert bell icon with badge */}
          <Link
            to="/alerts"
            aria-label={t("Xem {0} cảnh báo", [totalAlerts])}
            className="relative p-2 rounded-xl text-gray hover:text-text hover:bg-border/40 transition-colors"
            title={t("Có {0} cảnh báo chưa xử lý", [totalAlerts])}
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
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

          {/* User profile compact badge & quick logout */}
          <div className="pl-2 border-l border-border flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1F5CA9] text-white flex items-center justify-center text-xs font-bold uppercase shadow-2xs shrink-0">
              {user.email.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-text truncate max-w-[120px]">
                {user.email.split('@')[0]}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray">
                {user.role}
              </span>
            </div>
            <button
              type="button"
              onClick={logout.submit}
              disabled={logout.pending}
              title={t("Đăng xuất")}
              aria-label={t("Đăng xuất")}
              className="p-1.5 rounded-lg text-gray hover:text-coral hover:bg-coral/10 transition-colors cursor-pointer shrink-0"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Desktop Sidebar (lg+) ─── */}
      <aside className={`hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-56'} lg:flex-col bg-surface border-r border-border justify-between transition-[width] duration-200 select-none`}>
        <div className="min-w-0">
          {/* Brand Logo & App Name & Collapse Toggle */}
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center justify-center h-16 border-b border-border relative">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={t("Mở rộng thanh điều hướng")}
                title={t("Mở rộng thanh điều hướng")}
                className="flex items-center justify-center p-2 rounded-xl text-gray hover:text-text hover:bg-border/40 transition-colors group cursor-pointer"
              >
                <BrandMark sizeClass="w-8 h-8" />
                <span className="material-symbols-outlined absolute -right-2 top-5 text-[15px] bg-surface border border-border rounded-full shadow-xs text-navy dark:text-blue">
                  chevron_right
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3.5 h-16 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <BrandLogo variant="full" size="md" />
              </div>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={t("Thu gọn thanh điều hướng")}
                title={t("Thu gọn thanh điều hướng")}
                className="p-1.5 rounded-lg text-gray hover:text-text hover:bg-border/40 transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <div className="pt-2">
            <ShellNavigation role={user.role} totalAlerts={totalAlerts} collapsed={sidebarCollapsed} />
          </div>
        </div>

        {/* Sidebar Footer: Quiet branding & accessible logout */}
        <div className={`p-3 border-t border-border/70 ${sidebarCollapsed ? 'flex flex-col items-center gap-2 px-2' : 'space-y-1.5'}`}>
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={logout.submit}
              disabled={logout.pending}
              title={`${user.email} (${t(user.role)}) — ${t("Đăng xuất")}`}
              aria-label={t("Đăng xuất")}
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-gray hover:text-coral hover:bg-coral/10 disabled:opacity-60 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={logout.submit}
                disabled={logout.pending}
                aria-label={t("Đăng xuất")}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray hover:text-coral hover:bg-coral/10 transition-colors cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">logout</span>
                <span>{t("Đăng xuất")}</span>
              </button>
              <div className="flex items-center justify-between px-3 text-[11px] text-gray/60">
                <span>DuriCare CTU</span>
                <span>v1.0</span>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ─── Mobile Off-Canvas Drawer (<lg) ─── */}
      <div
        id="sidebarBackdrop"
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-200 lg:hidden ${
          mobileDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobileDrawer}
        aria-hidden="true"
      />
      <aside
        id="appSidebar"
        ref={mobileSidebarRef}
        inert={!mobileDrawerOpen ? true : undefined}
        aria-label={t("Danh mục điều hướng")}
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-surface border-r border-border flex flex-col justify-between shadow-2xl transition-transform duration-200 lg:hidden ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          visibility: mobileDrawerOpen ? 'visible' : 'hidden',
          pointerEvents: mobileDrawerOpen ? 'auto' : 'none',
        }}
      >
        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-4 h-16 border-b border-border">
            <BrandLogo variant="full" size="md" />
            <button
              id="btnSidebarClose"
              ref={mobileCloseBtnRef}
              type="button"
              onClick={closeMobileDrawer}
              aria-label={t("Đóng danh mục điều hướng")}
              className="p-2 rounded-lg text-gray hover:text-text hover:bg-border/40 cursor-pointer"
              style={{ transition: 'none' }}
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          <div className="pt-2">
            <ShellNavigation
              role={user.role}
              totalAlerts={totalAlerts}
              onNavigate={closeMobileDrawer}
            />
          </div>
        </div>

        <div className="p-4 border-t border-border space-y-2">
          <button
            type="button"
            onClick={() => {
              closeMobileDrawer();
              void logout.submit();
            }}
            disabled={logout.pending}
            aria-label={t("Đăng xuất")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray hover:text-coral hover:bg-coral/10 transition-colors cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">logout</span>
            <span>{t("Đăng xuất")}</span>
          </button>
          <div className="flex items-center justify-between px-3 text-[11px] text-gray/60">
            <span>DuriCare · {t('Nông nghiệp thông minh')}</span>
            <span className="font-mono">v1.0</span>
          </div>
        </div>
      </aside>

      {/* ─── Mobile Top Bar (<lg) ─── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 pt-[env(safe-area-inset-top)] bg-surface/95 backdrop-blur-md border-b border-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button
            id="btnHamburger"
            type="button"
            onClick={openMobileDrawer}
            onMouseDown={(e) => e.preventDefault()}
            aria-label={t("Mở danh mục điều hướng")}
            aria-expanded={mobileDrawerOpen}
            className="p-1.5 -ml-1 rounded-lg text-gray hover:text-text hover:bg-border/40 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <BrandMark sizeClass="w-6 h-6" />
          {user.role === 'ADMIN' && farms && farms.length > 1 ? (
            <select
              aria-label={t("Chọn nông trại")}
              value={String(selectedFarmId ?? '')}
              onChange={(e) => {
                const val = e.target.value;
                if (val) onSelectFarm(Number(val));
              }}
              className="bg-transparent text-xs font-bold text-[#1F5CA9] dark:text-[#60A5FA] focus:outline-none cursor-pointer truncate max-w-[140px]"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id} className="bg-surface text-text">
                  {f.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-bold text-[#1F5CA9] dark:text-[#60A5FA] truncate">
              {farmName}
            </span>
          )}
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
      </header>

      {/* ─── Mobile Bottom Navigation (<lg) ─── */}
      <ShellNavigation mobile role={user.role} totalAlerts={totalAlerts} />

      {/* ─── Main Content ─── */}
      <main className={`fixed inset-x-0 top-16 bottom-[calc(4rem+env(safe-area-inset-bottom))] overflow-y-auto scroll-pt-4 lg:static lg:overflow-visible lg:pt-16 lg:pb-8 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-56'} lg:min-h-screen transition-[padding-left] duration-200`}>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
