import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import useLogout from '../../hooks/useLogout';
import UserAccount from '../auth/UserAccount';
import ThemeToggle from './ThemeToggle';
import LanguageSelect from './LanguageSelect';
import ShellNavigation from './ShellNavigation';
import { useLanguage } from '../../i18n/useLanguage';
import { t } from '../../i18n';

export default function ExpertShell() {
  useLanguage();
  const { user } = useAuth();
  const logout = useLogout();
  if (!user) return null;
  return (
    <div className="min-h-screen bg-bg text-text">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col justify-between border-r border-border bg-surface">
        <div>
          <div className="h-20 flex items-center gap-3 px-6 border-b border-border">
            <span aria-hidden="true" className="text-2xl">🌳</span>
            <div>
              <p className="text-xl font-extrabold text-navy">DuriCare</p>
              <p className="text-xs text-gray">{t('Không gian chuyên gia')}</p>
            </div>
          </div>
          <ShellNavigation role={user.role} totalAlerts={0} />
        </div>
        <div className="p-4">
          <UserAccount user={user} pending={logout.pending} error={logout.error} onLogout={logout.submit} />
        </div>
      </aside>
      <header className="border-b border-border bg-surface px-4 md:px-8 lg:ml-64">
        <div className="h-20 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-navy lg:hidden">🌳 DuriCare</p>
            <p className="text-xs lg:text-sm text-gray">{t('Không gian chuyên gia')}</p>
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
      <main className="lg:ml-64 px-4 py-6 md:p-8 lg:p-12 pb-28">
        <div className="max-w-4xl mx-auto"><Outlet /></div>
      </main>
      <ShellNavigation mobile role={user.role} totalAlerts={0} />
    </div>
  );
}
