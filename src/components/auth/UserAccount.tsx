import { useLanguage } from '../../i18n/useLanguage';
import { t } from '../../i18n';
import type { User } from '../../types/auth';

const ROLE_LABEL: Record<User['role'], string> = { ADMIN: 'ADMIN', OWNER: 'Chủ vườn' };

export default function UserAccount({ user, pending, error, onLogout, compact = false }: {
  user: User;
  pending: boolean;
  error: string | null;
  onLogout: () => void;
  compact?: boolean;
}) {
  useLanguage();
  const emailBreak = user.email.indexOf('@') + 1;
  return (
    <section aria-label={t("Tài khoản đăng nhập")} className={compact ? 'min-w-0 w-full' : 'rounded-xl border border-border bg-bg p-3'}>
      <div className={compact ? 'flex items-center gap-3' : 'space-y-3'}>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] font-medium text-text [overflow-wrap:anywhere] leading-relaxed" title={user.email}>
            {user.email.slice(0, emailBreak)}<wbr />{user.email.slice(emailBreak)}
          </p>
          <span className={`inline-flex w-fit whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${user.role === 'ADMIN' ? 'bg-navy/10 text-navy dark:text-blue' : 'bg-teal/15 text-teal'}`}>
            {t(ROLE_LABEL[user.role])}
          </span>
        </div>
        <button type="button" onClick={onLogout} disabled={pending}
          className={`min-h-11 shrink-0 flex items-center justify-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold text-text hover:bg-surface disabled:opacity-60 disabled:cursor-wait cursor-pointer ${compact ? '' : 'w-full'}`}>
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
          {pending ? t("Đang thoát...") : t("Đăng xuất")}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-coral">{t(error)}</p>}
    </section>
  );
}
