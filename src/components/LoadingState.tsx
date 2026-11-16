import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
export default function LoadingState() {
  useLanguage();
  return (
    <div className="flex items-center justify-center min-h-[50vh]" role="status" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10" aria-hidden="true">
          <div className="w-10 h-10 border-3 border-navy/30 border-t-navy rounded-full animate-spin motion-reduce:hidden" />
          <span className="hidden motion-reduce:inline-flex text-navy">
            <span className="material-symbols-outlined text-[28px]">
              hourglass_top
            </span>
          </span>
        </div>
        <span className="text-sm text-gray">{t("Đang tải dữ liệu...")}</span>
      </div>
    </div>
  );
}
