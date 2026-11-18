import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import useLogout from '../../hooks/useLogout';
import UserAccount from '../auth/UserAccount';
import ThemeToggle from './ThemeToggle';
import LanguageSelect from './LanguageSelect';
import ShellNavigation from './ShellNavigation';
import { useLanguage } from '../../i18n/useLanguage';
import { t } from '../../i18n';
import { BrandMark } from '../BrandLogo';

export default function ExpertShell() {
  useLanguage();
  const { user } = useAuth();
  const logout = useLogout();
  if (!user) return null;
  return (
    <div className="min-h-screen bg-bg text-text">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-56 flex-col justify-between border-r border-border bg-surface">
        <div>
          <div className="h-16 flex items-center gap-3 px-5 border-b border-border">
            <BrandMark sizeClass="w-8 h-8" />
            <div>
              <p className="text-base font-extrabold text-[#1F5CA9] dark:text-[#60A5FA]">DuriCare</p>
              <p className="text-[11px] text-gray">{t('Không gian chuyên gia')}</p>
            </div>
          </div>
          <div className="pt-2">
            <ShellNavigation role={user.role} totalAlerts={0} />
          </div>
        </div>
        <div className="p-3 border-t border-border">
          <UserAccount user={user} pending={logout.pending} error={logout.error} onLogout={logout.submit} />
        </div>
      </aside>
      <header className="border-b border-border bg-surface px-4 md:px-8 lg:ml-56">
        <div className="h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BrandMark sizeClass="w-7 h-7 lg:hidden" />
            <div>
              <p className="text-sm font-bold text-[#1F5CA9] dark:text-[#60A5FA] lg:hidden">DuriCare</p>
              <p className="text-xs lg:text-sm text-gray">{t('Không gian chuyên gia')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelect />
            <div className="pl-1 border-l border-border">
              <ThemeToggle />
            </div>
          </div>
        </div>
        <div className="lg:hidden pb-4">
          <UserAccount compact user={user} pending={logout.pending} error={logout.error} onLogout={logout.submit} />
        </div>
      </header>
      <main className="lg:ml-56 px-4 py-6 md:p-8 lg:p-8 pb-28">
        <div className="max-w-[1216px] mx-auto"><Outlet /></div>
      </main>
      <ShellNavigation mobile role={user.role} totalAlerts={0} />
    </div>
  );
}
