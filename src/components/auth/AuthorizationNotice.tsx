import { useLanguage } from '../../i18n/useLanguage';
import { t } from '../../i18n';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { hasForbiddenNotice } from '../../utils/authNavigation';

export default function AuthorizationNotice() {
  useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const visible = hasForbiddenNotice(location.state);
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => navigate(location.pathname + location.search + location.hash,
      { replace: true, state: null }), 8000);
    return () => clearTimeout(timer);
  }, [visible, location.pathname, location.search, location.hash, navigate]);
  if (!visible) return null;
  return (
    <div role="alert" className="fixed z-50 top-[max(1rem,env(safe-area-inset-top))] left-4 right-4 sm:left-auto sm:max-w-md rounded-xl border border-amber/40 bg-surface px-4 py-3 shadow-lg text-text flex items-center gap-3">
      <p className="text-sm font-medium">{t("Bạn không có quyền truy cập trang này")}</p>
      <button aria-label={t("Đóng thông báo")} className="min-h-11 min-w-11 rounded-lg text-gray hover:bg-bg cursor-pointer"
        onClick={() => navigate(location.pathname + location.search + location.hash, { replace: true, state: null })}>{t("×")}</button>
    </div>
  );
}
