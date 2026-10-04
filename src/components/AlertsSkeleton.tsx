import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
export default function AlertsSkeleton() {
  useLanguage();
  return (
    <div aria-label={t("Đang tải cảnh báo")} role="status" className="animate-pulse space-y-4">
      <span className="sr-only">{t("Đang tải cảnh báo")}</span>
      <div className="h-8 w-48 bg-border rounded-lg" />
      <div className="h-24 bg-surface border border-border rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(id => <div key={id} className="h-64 rounded-2xl border border-border bg-surface p-4 space-y-4"><div className="h-5 w-40 bg-border rounded" /><div className="h-24 bg-border/60 rounded" /><div className="h-8 w-full bg-border rounded" /></div>)}
      </div>
    </div>
  );
}
