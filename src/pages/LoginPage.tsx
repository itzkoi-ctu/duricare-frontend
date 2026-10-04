import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/layout/ThemeToggle';
import LanguageSelect from '../components/layout/LanguageSelect';
import useLoginForm from '../hooks/useLoginForm';

export default function LoginPage() {
  useLanguage();
  const { register, submit, formState: { errors, isSubmitting }, user, logout, logoutError, loggingOut } = useLoginForm();
  const fieldClass = 'w-full min-h-12 rounded-xl border border-border bg-bg px-4 text-text placeholder:text-gray focus:outline-none focus:ring-2 focus:ring-navy/40 focus:border-navy';
  return (
    <div className="min-h-dvh bg-bg text-text">
      <header className="flex items-center justify-between max-w-7xl mx-auto px-5 md:px-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link to="/" className="inline-flex items-center gap-2.5 font-bold text-xl text-navy" aria-label={t("DuriCare — Trang chủ")}>
          <span className="material-symbols-outlined text-[28px]" aria-hidden="true">potted_plant</span>DuriCare
        </Link>
        <div className="flex items-center gap-2"><LanguageSelect /><ThemeToggle /></div>
      </header>
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20 items-center px-5 md:px-8 py-9 md:py-16 lg:py-24 pb-[max(2.25rem,env(safe-area-inset-bottom))]">
        <section className="text-center lg:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal mb-4">{t("Chăm vườn từ dữ liệu")}</p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">{t("Hiểu khu vườn.")}<br /><span className="text-navy">{t("Chăm cây đúng lúc.")}</span></h1>
          <p className="text-gray text-sm md:text-base leading-relaxed max-w-md mx-auto lg:mx-0 mt-5">{t("Theo dõi cảm biến, nhận cảnh báo và chăm sóc vườn sầu riêng của bạn cùng DuriCare.")}</p>
          <div className="hidden lg:flex items-center gap-4 mt-10 rounded-2xl border border-teal/20 bg-teal/5 p-5 max-w-md">
            <span className="material-symbols-outlined text-teal text-3xl" aria-hidden="true">eco</span>
            <p className="text-sm leading-relaxed">{t("Thông tin khu vườn luôn sẵn sàng, từ ngoài đồng đến khi bạn trở về nhà.")}</p>
          </div>
        </section>
        <section className="w-full max-w-md mx-auto rounded-3xl border border-border bg-surface p-6 md:p-8 shadow-sm" aria-labelledby="login-heading">
          {user ? (
            <div className="space-y-5">
              <span className="material-symbols-outlined text-teal text-4xl" aria-hidden="true">verified_user</span>
              <h2 id="login-heading" className="text-2xl font-bold">{t("Bạn đã đăng nhập")}</h2>
              <p className="text-gray text-sm">{t("Phiên đăng nhập của bạn đang hoạt động.")}</p>
              <p className="text-sm font-medium break-all" data-testid="session-email">{user.email}</p>
              <Link to="/" className="flex min-h-12 items-center justify-center rounded-xl bg-navy text-surface dark:text-bg font-semibold">{t("Về trang tổng quan")}</Link>
              {logoutError && <p role="alert" className="text-sm text-coral">{t(logoutError)}</p>}
              <button onClick={() => { void logout(); }} disabled={loggingOut} className="w-full min-h-11 text-sm font-semibold text-gray hover:text-text cursor-pointer disabled:opacity-60">{loggingOut ? t("Đang đăng xuất...") : t("Đăng xuất")}</button>
            </div>
          ) : (
            <>
              <h2 id="login-heading" className="text-2xl font-bold">{t("Đăng nhập")}</h2>
              <p className="text-sm text-gray mt-2 mb-7">{t("Chào bạn, hãy đăng nhập để tiếp tục.")}</p>
              <form onSubmit={submit} noValidate className="space-y-5" aria-busy={isSubmitting}>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold mb-2">Email</label>
                  <input id="email" type="email" autoComplete="username" inputMode="email" placeholder={t("Email của bạn")} className={fieldClass} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} {...register('email', { required: t("Vui lòng nhập email."), pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t("Vui lòng nhập email hợp lệ.") } })} />
                  {errors.email && <p id="email-error" className="text-xs text-coral mt-2">{t(errors.email.type === 'required' ? 'Vui lòng nhập email.' : 'Vui lòng nhập email hợp lệ.')}</p>}
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold mb-2">{t("Mật khẩu")}</label>
                  <input id="password" type="password" autoComplete="current-password" placeholder={t("Mật khẩu của bạn")} className={fieldClass} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} {...register('password', { required: t("Vui lòng nhập mật khẩu.") })} />
                  {errors.password && <p id="password-error" className="text-xs text-coral mt-2">{t('Vui lòng nhập mật khẩu.')}</p>}
                </div>
                {errors.root && <p role="alert" className="rounded-xl border border-coral/20 bg-coral/5 p-3 text-sm text-coral">{t(errors.root.message || '')}</p>}
                <button type="submit" disabled={isSubmitting} className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-navy text-surface dark:text-bg font-semibold hover:bg-blue cursor-pointer disabled:opacity-60 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy">
                  {isSubmitting && <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />}
                  {isSubmitting ? t("Đang đăng nhập...") : t("Đăng nhập")}
                </button>
              </form>
              <p className="text-xs text-gray text-center mt-6 leading-relaxed">{t("Tài khoản được cấp bởi quản trị viên.")}<br />{t("Liên hệ quản trị viên nếu bạn cần hỗ trợ.")}</p>
            </>
          )}
        </section>
      </main>
      <footer className="px-5 pb-6 text-center text-xs text-gray">{t("DuriCare · Đồng hành cùng vườn sầu riêng")}</footer>
    </div>
  );
}
