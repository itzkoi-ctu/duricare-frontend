import { useLanguage } from '../../i18n/useLanguage';
import { t } from '../../i18n';
export default function SessionLoading() {
  useLanguage();
  return (
    <main className="min-h-dvh flex items-center justify-center bg-bg text-text px-6" aria-busy="true">
      <div role="status" className="flex flex-col items-center gap-4 text-center">
        <div className="relative flex items-center justify-center size-10" aria-hidden="true">
          {/* Motion-safe: active spinning arc */}
          <div className="size-10 rounded-full border-4 border-border border-t-navy animate-spin motion-reduce:hidden" />
          {/* Motion-reduce: clear static pending icon instead of broken-looking frozen arc */}
          <span className="hidden motion-reduce:inline-flex text-navy">
            <span className="material-symbols-outlined text-[32px]">
              hourglass_top
            </span>
          </span>
        </div>
        <p className="font-semibold">{t("Đang kiểm tra phiên đăng nhập...")}</p>
      </div>
    </main>
  );
}
