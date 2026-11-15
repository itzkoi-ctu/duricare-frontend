import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import { t } from '../../i18n';
import { Link, useLocation } from 'react-router-dom';
import type { User } from '../../types/auth';
import type { NavigationItem } from '../../types/navigation';
import { navigationForRole } from '../../utils/navigation';

const DESKTOP_ACTIVE = {
  navy: 'bg-[#1F5CA9]/10 text-[#1F5CA9] dark:bg-[#60A5FA]/15 dark:text-[#60A5FA] shadow-2xs font-semibold',
  coral: 'bg-[#B91C1C]/10 text-[#B91C1C] dark:bg-[#F87171]/15 dark:text-[#F87171] shadow-2xs font-semibold',
  teal: 'bg-[#1F5CA9]/10 text-[#1F5CA9] dark:bg-[#60A5FA]/15 dark:text-[#60A5FA] shadow-2xs font-semibold',
};
const MOBILE_ACTIVE = {
  navy: 'text-[#1F5CA9] dark:text-[#60A5FA] font-bold',
  coral: 'text-[#B91C1C] dark:text-[#F87171] font-bold',
  teal: 'text-[#1F5CA9] dark:text-[#60A5FA] font-bold',
};

export default function ShellNavigation({
  role,
  totalAlerts,
  mobile = false,
  collapsed = false,
  onNavigate,
}: {
  role: User['role'];
  totalAlerts: number;
  mobile?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  useLanguage();
  const { pathname, search } = useLocation();
  const farmId = Number(new URLSearchParams(search).get('farmId'));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuDialogRef = useRef<HTMLDialogElement>(null);

  const items = navigationForRole(role);
  const useOverflow = mobile && items.length > 4;
  const primaryItems = useOverflow ? items.slice(0, 3) : items;
  const overflowItems = useOverflow ? items.slice(3) : [];

  const isOverflowActive = overflowItems.some(item => pathname.startsWith(item.path));

  useEffect(() => {
    const dialog = menuDialogRef.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) dialog.showModal();
    if (!menuOpen && dialog.open) dialog.close();
  }, [menuOpen]);

  const resolveTarget = (path: string) => {
    return role === 'ADMIN' && Number.isSafeInteger(farmId) && farmId > 0
      ? `${path}?farmId=${farmId}`
      : path;
  };

  const isItemActive = (path: string) => {
    return path === '/'
      ? pathname === '/' || pathname.startsWith('/zones')
      : path === '/knowledge'
      ? pathname === '/knowledge'
      : pathname.startsWith(path);
  };

  // Group items for desktop
  const theoDoiItems = items.filter(item => item.group === 'THEO_DOI' || !item.group);
  const quanTriItems = items.filter(item => item.group === 'QUAN_TRI');
  const hasMultipleGroups = theoDoiItems.length > 0 && quanTriItems.length > 0;

  const renderDesktopItem = (item: NavigationItem) => {
    const active = isItemActive(item.path);
    const target = resolveTarget(item.path);

    if (collapsed) {
      return (
        <Link
          key={item.path}
          to={target}
          onClick={onNavigate}
          title={t(item.label)}
          aria-label={t(item.label)}
          className={`relative flex items-center justify-center p-2.5 mx-auto rounded-xl text-sm font-semibold transition-all ${
            active ? DESKTOP_ACTIVE[item.tone] : 'text-gray hover:bg-border/40 hover:text-text'
          }`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
            {item.icon}
          </span>
          {item.path === '/alerts' && totalAlerts > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-coral text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {totalAlerts > 99 ? '99+' : totalAlerts}
            </span>
          )}
        </Link>
      );
    }

    return (
      <Link
        key={item.path}
        to={target}
        onClick={onNavigate}
        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
          active ? DESKTOP_ACTIVE[item.tone] : 'text-gray hover:bg-border/30 hover:text-text'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px] shrink-0">
            {item.icon}
          </span>
          <span className="truncate">{t(item.label)}</span>
        </div>
        {item.path === '/alerts' && totalAlerts > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-coral text-white text-[10px] font-bold leading-none shrink-0">
            {totalAlerts > 99 ? '99+' : totalAlerts}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label={mobile ? t("Điều hướng di động") : t("Điều hướng chính")}
        className={mobile
          ? 'lg:hidden fixed bottom-0 left-0 right-0 z-40 h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-surface/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 shadow-lg'
          : collapsed
          ? 'px-2 py-3 space-y-1.5'
          : 'px-3 py-3 space-y-1'}
      >
        {mobile ? (
          <>
            {primaryItems.map(item => {
              const active = isItemActive(item.path);
              const target = resolveTarget(item.path);
              return (
                <Link
                  key={item.path}
                  to={target}
                  onClick={onNavigate}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 px-1 rounded-xl text-[11px] font-medium transition-colors ${
                    active ? MOBILE_ACTIVE[item.tone] : 'text-gray hover:text-text'
                  }`}
                >
                  <div className="relative">
                    <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
                      {item.mobileIcon ?? item.icon}
                    </span>
                    {item.path === '/alerts' && totalAlerts > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-coral text-white text-[9px] font-bold flex items-center justify-center">
                        {totalAlerts > 99 ? '99+' : totalAlerts}
                      </span>
                    )}
                  </div>
                  <span className="whitespace-nowrap">{t(item.mobileLabel ?? item.label)}</span>
                </Link>
              );
            })}

            {useOverflow && (
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-expanded={menuOpen}
                aria-haspopup="dialog"
                aria-label={t("Mở rộng menu quản lý")}
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 px-1 rounded-xl text-[11px] font-medium transition-colors cursor-pointer ${
                  isOverflowActive ? MOBILE_ACTIVE.navy : 'text-gray hover:text-text'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
                  more_horiz
                </span>
                <span className="whitespace-nowrap">{t("Quản lý")}</span>
              </button>
            )}
          </>
        ) : (
          /* Desktop Navigation */
          hasMultipleGroups ? (
            <>
              {/* THEO DÕI Group */}
              {!collapsed && (
                <p className="px-3.5 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray/80 select-none">
                  {t("Theo dõi")}
                </p>
              )}
              <div className="space-y-1">
                {theoDoiItems.map(renderDesktopItem)}
              </div>

              {/* Divider when collapsed or labeled header when expanded */}
              {collapsed ? (
                <hr className="my-2 border-border/70 mx-1.5" />
              ) : (
                <p className="px-3.5 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray/80 select-none">
                  {t("Quản trị")}
                </p>
              )}

              {/* QUẢN TRỊ Group */}
              <div className="space-y-1">
                {quanTriItems.map(renderDesktopItem)}
              </div>
            </>
          ) : (
            <div className="space-y-1">
              {items.map(renderDesktopItem)}
            </div>
          )
        )}
      </nav>

      {useOverflow && (
        <dialog
          ref={menuDialogRef}
          aria-label={t("Menu quản lý")}
          onCancel={() => setMenuOpen(false)}
          onClick={e => { if (e.target === menuDialogRef.current) setMenuOpen(false); }}
          className="fixed inset-0 m-0 h-dvh max-h-dvh w-full max-w-none border-0 bg-transparent p-0 text-text backdrop:bg-black/50"
        >
          <div className="flex h-full flex-col justify-end">
            <div className="rounded-t-2xl border-t border-border bg-surface p-5 shadow-2xl space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-navy dark:text-blue">
                    settings
                  </span>
                  <h2 className="text-base font-bold text-text">{t("Quản lý hệ thống")}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label={t("Đóng menu")}
                  className="min-h-10 min-w-10 rounded-lg flex items-center justify-center text-gray hover:text-text hover:bg-bg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="space-y-2">
                {overflowItems.map(item => {
                  const active = isItemActive(item.path);
                  const target = resolveTarget(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={target}
                      onClick={() => {
                        setMenuOpen(false);
                        onNavigate?.();
                      }}
                      className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                        active
                          ? 'bg-[#1F5CA9]/10 text-[#1F5CA9] dark:bg-[#60A5FA]/15 dark:text-[#60A5FA]'
                          : 'text-gray hover:bg-border/40 hover:text-text'
                      }`}
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-xl">
                        {item.icon}
                      </span>
                      <span>{t(item.label)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
