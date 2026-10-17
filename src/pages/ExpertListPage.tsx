import { Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { useExpertList } from '../hooks/useExpertList';
import ExpertStatusBadge from '../components/ExpertStatusBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export default function ExpertListPage() {
  useLanguage();
  const { data, page, loading, pageChanging, error, setPage, retry } = useExpertList(0, 20);

  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const experts = data?.content ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text">{t('Quản lý chuyên gia')}</h1>
          <p className="mt-1 text-xs md:text-sm text-gray">
            {t('Danh sách tài khoản chuyên gia nông nghiệp trong hệ thống.')}
          </p>
        </div>
        <Link
          to="/settings/experts/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-surface dark:text-bg hover:opacity-95 transition-opacity"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-lg">
            add
          </span>
          {t('Thêm chuyên gia')}
        </Link>
      </div>

      {/* Content states */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-gray">
            <span>{t('{0} chuyên gia', [totalElements])}</span>
            {pageChanging && (
              <span className="flex items-center gap-1.5 text-navy dark:text-blue font-medium">
                <span className="w-3.5 h-3.5 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                {t('Đang chuyển trang...')}
              </span>
            )}
          </div>

          {experts.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center space-y-3">
              <span aria-hidden="true" className="material-symbols-outlined text-4xl text-gray">
                school
              </span>
              <h2 className="text-base font-bold text-text">{t('Chưa có chuyên gia nào')}</h2>
              <p className="text-sm text-gray max-w-sm mx-auto">
                {t('Tạo tài khoản chuyên gia đầu tiên để bắt đầu xét duyệt và quản lý chuyên môn.')}
              </p>
              <div className="pt-2">
                <Link
                  to="/settings/experts/new"
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-navy px-4 text-xs font-semibold text-surface dark:text-bg hover:opacity-95"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    add
                  </span>
                  {t('Thêm chuyên gia')}
                </Link>
              </div>
            </div>
          ) : (
            <div className="relative">
              {pageChanging && (
                <div className="absolute inset-0 bg-surface/50 backdrop-blur-[1px] z-10 rounded-2xl flex items-center justify-center" />
              )}

              {/* Desktop Table (md+) */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
                <div
                  aria-hidden="true"
                  className="grid grid-cols-[1.5fr_1.2fr_1.8fr_1fr_0.9fr_6rem] gap-4 border-b border-border bg-bg px-5 py-3 text-xs font-semibold text-gray"
                >
                  <span>{t('Chuyên gia / Email')}</span>
                  <span>{t('Đơn vị công tác')}</span>
                  <span>{t('Chuyên môn')}</span>
                  <span>{t('Trạng thái')}</span>
                  <span>{t('Ngày tạo')}</span>
                  <span className="text-right">{t('Thao tác')}</span>
                </div>
                <ul className="divide-y divide-border">
                  {experts.map(expert => (
                    <li
                      key={expert.id}
                      className="grid grid-cols-[1.5fr_1.2fr_1.8fr_1fr_0.9fr_6rem] items-center gap-4 p-4 px-5 hover:bg-border/10 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-text [overflow-wrap:anywhere]">
                          {expert.fullName}
                        </p>
                        <p className="mt-0.5 text-xs text-gray font-mono [overflow-wrap:anywhere]">
                          {expert.email}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-text [overflow-wrap:anywhere]">
                          {expert.affiliation || t('Chưa cập nhật')}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-xs text-gray line-clamp-2 leading-relaxed [overflow-wrap:anywhere]"
                          title={expert.specialties}
                        >
                          {expert.specialties}
                        </p>
                      </div>
                      <div>
                        <ExpertStatusBadge status={expert.verificationStatus} />
                      </div>
                      <div className="text-xs text-gray">{formatDate(expert.createdAt)}</div>
                      <div className="text-right">
                        <Link
                          to={`/settings/experts/${expert.id}`}
                          aria-label={t('Xem hồ sơ {0}', [expert.fullName])}
                          className="inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border border-border bg-bg px-3 text-xs font-semibold text-navy dark:text-blue hover:border-navy/50 transition-colors"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-base">
                            visibility
                          </span>
                          {t('Xem')}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mobile Cards (<md) */}
              <div className="md:hidden space-y-3">
                {experts.map(expert => (
                  <div
                    key={expert.id}
                    className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h2 className="font-bold text-sm text-text [overflow-wrap:anywhere]">
                          {expert.fullName}
                        </h2>
                        <p className="mt-0.5 text-xs text-gray font-mono [overflow-wrap:anywhere]">
                          {expert.email}
                        </p>
                      </div>
                      <ExpertStatusBadge status={expert.verificationStatus} />
                    </div>

                    <div className="text-xs space-y-1.5 pt-1 border-t border-border/60">
                      <div>
                        <span className="text-gray">{t('Đơn vị')}: </span>
                        <span className="text-text [overflow-wrap:anywhere]">
                          {expert.affiliation || t('Chưa cập nhật')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray">{t('Chuyên môn')}: </span>
                        <p className="text-text mt-0.5 line-clamp-2 [overflow-wrap:anywhere]">
                          {expert.specialties}
                        </p>
                      </div>
                      <div className="text-gray pt-0.5">
                        <span>{t('Ngày tạo')}: </span>
                        <span>{formatDate(expert.createdAt)}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Link
                        to={`/settings/experts/${expert.id}`}
                        aria-label={t('Xem hồ sơ {0}', [expert.fullName])}
                        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-bg text-xs font-semibold text-navy dark:text-blue hover:border-navy/50 transition-colors"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-base">
                          visibility
                        </span>
                        {t('Xem hồ sơ chi tiết')}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
              <span className="text-xs text-gray">
                {t('Trang {0} / {1}', [page + 1, totalPages])}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 0 || pageChanging}
                  onClick={() => setPage(page - 1)}
                  className="min-h-10 px-3.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {t('Trang trước')}
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1 || pageChanging}
                  onClick={() => setPage(page + 1)}
                  className="min-h-10 px-3.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {t('Trang sau')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
