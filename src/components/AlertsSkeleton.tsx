import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';

export default function AlertsSkeleton() {
  useLanguage();
  return (
    <div aria-label={t("Đang tải cảnh báo")} role="status" className="animate-pulse space-y-4 max-w-7xl mx-auto">
      <span className="sr-only">{t("Đang tải cảnh báo")}</span>
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-border/60 rounded-lg" />
        <div className="h-10 w-28 bg-border/60 rounded-lg" />
      </div>
      <div className="h-16 bg-surface border border-border rounded-xl" />
      <div className="h-6 w-56 bg-border/40 rounded" />
      <div className="space-y-3.5">
        {[1, 2, 3].map(id => (
          <div key={id} className="h-44 rounded-xl border border-border border-l-4 border-l-border/60 bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-48 bg-border/60 rounded" />
              <div className="h-4 w-28 bg-border/40 rounded" />
            </div>
            <div className="h-4 w-32 bg-border/40 rounded" />
            <div className="h-12 w-full bg-border/30 rounded" />
            <div className="h-11 w-40 bg-border/50 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
