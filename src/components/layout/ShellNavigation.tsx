import { useLanguage } from '../../i18n/useLanguage';
import { t } from '../../i18n';
import { Link, useLocation } from 'react-router-dom';
import type { User } from '../../types/auth';
import { navigationForRole } from '../../utils/navigation';

const DESKTOP_ACTIVE = {
  navy: 'bg-navy/10 text-navy dark:bg-blue/15 dark:text-blue shadow-2xs',
  coral: 'bg-coral/10 text-coral shadow-2xs',
  teal: 'bg-teal/10 text-teal shadow-2xs',
};
const MOBILE_ACTIVE = { navy: 'text-navy dark:text-blue font-bold', coral: 'text-coral font-bold', teal: 'text-teal font-bold' };

export default function ShellNavigation({ role, totalAlerts, mobile = false }: {
  role: User['role']; totalAlerts: number; mobile?: boolean;
}) {
  useLanguage();
  const { pathname, search } = useLocation();
  const farmId = Number(new URLSearchParams(search).get('farmId'));
  return (
    <nav aria-label={mobile ? t("Điều hướng di động") : t("Điều hướng chính")} className={mobile
      ? 'lg:hidden fixed bottom-0 left-0 right-0 z-40 h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-surface/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 shadow-lg'
      : 'px-3 py-4 space-y-1.5'}>
      {navigationForRole(role).map(item => {
        const active = item.path === '/' ? pathname === '/' || pathname.startsWith('/zones') : pathname.startsWith(item.path);
        const target = role === 'ADMIN' && Number.isSafeInteger(farmId) && farmId > 0
          ? `${item.path}?farmId=${farmId}` : item.path;
        return <Link key={item.path} to={target} className={mobile
          ? `flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 px-1 rounded-xl text-[11px] font-medium transition-colors ${active ? MOBILE_ACTIVE[item.tone] : 'text-gray hover:text-text'}`
          : `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? DESKTOP_ACTIVE[item.tone] : 'text-gray hover:bg-border/40 hover:text-text'}`}>
          <div className={mobile ? 'relative' : 'flex items-center gap-3'}>
            <span aria-hidden="true" className={`material-symbols-outlined ${mobile ? 'text-[22px]' : 'text-[20px]'}`}>{mobile ? item.mobileIcon ?? item.icon : item.icon}</span>
            {!mobile && <span>{t(item.label)}</span>}
            {mobile && item.path === '/alerts' && totalAlerts > 0 && <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-coral text-white text-[9px] font-bold flex items-center justify-center">{totalAlerts > 99 ? '99+' : totalAlerts}</span>}
          </div>
          {mobile && <span className="whitespace-nowrap">{t(item.mobileLabel ?? item.label)}</span>}
          {!mobile && item.path === '/alerts' && totalAlerts > 0 && <span className="px-2 py-0.5 rounded-full bg-coral text-white text-[11px] font-bold leading-none">{totalAlerts > 99 ? '99+' : totalAlerts}</span>}
          {!mobile && item.path === '/agent' && <span className="px-1.5 py-0.5 rounded bg-teal/15 text-teal text-[10px] font-bold uppercase tracking-wider">AI Agent</span>}
        </Link>;
      })}
    </nav>
  );
}
