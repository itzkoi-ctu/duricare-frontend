import { useSearchParams, Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import useFarmSettings from '../hooks/useFarmSettings';
import FarmSettingsForm from '../components/FarmSettingsForm';
import { useOverviewContext } from '../context/OverviewContext';

export default function FarmSettingsPage() {
  useLanguage();
  const [params, setParams] = useSearchParams();
  const parsedId = Number(params.get('farmId'));
  const farmId = Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const settings = useFarmSettings(farmId);
  const overview = useOverviewContext();

  const isRemoved =
    farmId !== null &&
    !settings.loading &&
    !settings.farm &&
    settings.farms.length > 0 &&
    !settings.farms.some((f) => f.id === farmId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-gray mb-1">
          {t('Quản trị / Cài đặt vườn')}
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-text">
          {t('Cài đặt vườn')}
        </h1>
        <p className="mt-1 text-xs md:text-sm text-gray">
          {t('Quản lý thông tin và cấu hình vườn đang chọn.')}
        </p>
      </div>

      {/* Top Picker & Create CTA Row (A01, A01b) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {settings.farms.length > 0 ? (
          <div className="flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg border border-border bg-surface-soft max-w-md w-full sm:w-auto">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-navy text-lg shrink-0"
            >
              agriculture
            </span>
            <select
              id="settings-farm"
              value={farmId ?? ''}
              disabled={settings.isSaving}
              onChange={(event) => {
                const next = new URLSearchParams(params);
                if (event.target.value) next.set('farmId', event.target.value);
                else next.delete('farmId');
                setParams(next, { replace: true });
              }}
              className="bg-transparent text-sm font-semibold text-text appearance-none cursor-pointer focus:outline-none flex-1 truncate pr-6"
            >
              <option value="">{t('Chọn vườn')}</option>
              {settings.farms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · #{item.id}
                </option>
              ))}
            </select>
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-gray text-base pointer-events-none -ml-5"
            >
              expand_more
            </span>
          </div>
        ) : (
          <div />
        )}

        {/* CTA Tạo vườn */}
        <Link
          to="/settings/farm/new"
          className="inline-flex min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-semibold items-center justify-center gap-2 transition-colors shadow-xs"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-lg">
            add
          </span>
          {t('Tạo vườn')}
        </Link>
      </div>

      {/* Main Body */}
      {settings.loading ? (
        /* Loading skeleton state E08 */
        <section
          role="status"
          aria-label={t('Đang tải...')}
          className="max-w-3xl rounded-xl border border-border bg-surface p-6 space-y-4 animate-pulse"
        >
          <div className="h-4 w-48 rounded bg-border" />
          <div className="h-11 w-full rounded-lg bg-surface-soft" />
          <div className="h-32 w-full rounded-lg bg-surface-soft" />
          <p className="text-xs text-gray">{t('Đang tải thông tin vườn…')}</p>
        </section>
      ) : isRemoved ? (
        /* Removed farm 404 state G03 */
        <section className="max-w-[680px] rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
          <div className="rounded-lg border border-coral/30 bg-coral/10 p-4 flex gap-3 text-coral">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-lg shrink-0 mt-0.5"
            >
              error
            </span>
            <div className="space-y-1">
              <strong className="block text-sm font-semibold">
                {t('Vườn không còn tồn tại')}
              </strong>
              <p className="text-xs leading-relaxed">
                {t(
                  'Vườn có thể đã bị xóa. Chọn vườn khác để tiếp tục. Không tự tạo lại vườn.'
                )}
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(params);
                next.delete('farmId');
                setParams(next, { replace: true });
              }}
              className="min-h-11 px-5 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold transition-colors cursor-pointer"
            >
              {t('Chọn vườn khác')}
            </button>
          </div>
        </section>
      ) : settings.error ? (
        <div
          role="alert"
          className="max-w-[680px] rounded-xl border border-coral/30 bg-surface p-5 space-y-3"
        >
          <p className="text-sm text-coral font-medium">{t(settings.error)}</p>
          <button
            onClick={settings.retry}
            className="min-h-11 rounded-lg bg-navy px-4 text-sm font-semibold text-surface cursor-pointer"
          >
            {t('Thử lại')}
          </button>
        </div>
      ) : settings.farms.length === 0 ? (
        /* Empty state A02 */
        <section className="rounded-xl border border-border bg-surface p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-navy/10 text-navy flex items-center justify-center mx-auto">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-3xl"
            >
              agriculture
            </span>
          </div>
          <h2 className="text-xl font-bold text-text">{t('Chưa có vườn')}</h2>
          <p className="text-xs text-gray max-w-sm mx-auto">
            {t(
              'Tạo vườn đầu tiên để bắt đầu cấu hình khu vực và tài khoản chủ vườn.'
            )}
          </p>
          <Link
            to="/settings/farm/new"
            className="inline-flex min-h-11 px-6 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold items-center justify-center gap-2 shadow-sm"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-lg"
            >
              add
            </span>
            {t('Tạo vườn')}
          </Link>
        </section>
      ) : settings.farm ? (
        /* Selected Farm Settings E01 */
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,680px)_280px] gap-6 items-start">
          <FarmSettingsForm
            farm={settings.farm}
            isSaving={settings.isSaving}
            error={settings.saveError}
            isUncertain={settings.isUncertain}
            onReconcile={async () => {
              const reconciled = await settings.reconcile();
              if (reconciled) void overview.refresh();
            }}
            onSave={async (request) => {
              const success = await settings.save(request);
              if (success) void overview.refresh();
              return success;
            }}
          />

          {/* Right Aside: Next Steps */}
          <aside className="hidden lg:block w-[280px] shrink-0 rounded-xl border border-border bg-surface p-5 shadow-sm space-y-3">
            <h3 className="text-base font-semibold text-text">
              {t('Cấu hình tiếp theo')}
            </h3>
            <p className="text-xs text-gray leading-relaxed">
              {t(
                'Mở khu vực để thêm và bố trí các khu canh tác trong đúng vườn này.'
              )}
            </p>
            <Link
              to={`/settings/zones?farmId=${settings.farm.id}`}
              className="inline-flex min-h-11 w-full rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-xs font-semibold items-center justify-center gap-2 transition-colors"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-base"
              >
                grid_view
              </span>
              {t('Quản lý khu vực')}
            </Link>
          </aside>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-8 text-center max-w-lg mx-auto space-y-3">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-4xl text-gray"
          >
            agriculture
          </span>
          <p className="text-sm text-gray">
            {t('Chọn nông trại để chỉnh sửa cài đặt.')}
          </p>
        </div>
      )}

      {settings.saved && (
        <div
          role="status"
          className="fixed z-50 bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-8 left-4 right-4 md:left-auto md:right-8 flex items-center gap-2 rounded-xl border border-teal/40 bg-surface p-4 text-sm font-semibold text-text shadow-lg"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-teal"
          >
            check_circle
          </span>
          {t('Đã lưu cài đặt nông trại.')}
        </div>
      )}
    </div>
  );
}
