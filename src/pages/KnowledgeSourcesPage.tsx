import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { useAuth } from '../hooks/useAuth';
import useExpertProfile from '../hooks/useExpertProfile';
import { useKnowledgeSources } from '../hooks/useKnowledgeSources';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import type { RevisionStatus } from '../types/governance';

export const STATUS_FILTERS: { value: RevisionStatus | undefined; label: string; key: string }[] = [
  { value: undefined, label: 'Tất cả', key: 'all' },
  { value: 'DRAFT', label: 'Bản nháp', key: 'draft' },
  { value: 'SUBMITTED', label: 'Đã gửi', key: 'submitted' },
  { value: 'IN_REVIEW', label: 'Đang thẩm định', key: 'reviewing' },
  { value: 'CHANGES_REQUESTED', label: 'Yêu cầu sửa đổi', key: 'revision_requested' },
  { value: 'APPROVED', label: 'Đã phê duyệt', key: 'approved' },
  { value: 'REJECTED', label: 'Từ chối', key: 'rejected' },
  { value: 'WITHDRAWN', label: 'Đã rút', key: 'withdrawn' },
];

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return iso;
  }
}

const STITCH_STATUS_STYLES: Record<
  RevisionStatus,
  {
    label: string;
    desktopClass: string;
    mobileBadgeClass: string;
    dotClass: string;
  }
> = {
  APPROVED: {
    label: 'Đã phê duyệt',
    desktopClass: 'bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    mobileBadgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  IN_REVIEW: {
    label: 'Đang thẩm định',
    desktopClass: 'bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    mobileBadgeClass: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    dotClass: 'bg-blue-500',
  },
  CHANGES_REQUESTED: {
    label: 'Yêu cầu sửa đổi',
    desktopClass: 'bg-[#fffbeb] text-[#b45309] border border-[#fde68a] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    mobileBadgeClass: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    dotClass: 'bg-amber-500',
  },
  DRAFT: {
    label: 'Bản nháp',
    desktopClass: 'bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    mobileBadgeClass: 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-500',
  },
  SUBMITTED: {
    label: 'Đã gửi',
    desktopClass: 'bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd] dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    mobileBadgeClass: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    dotClass: 'bg-sky-500',
  },
  WITHDRAWN: {
    label: 'Đã rút',
    desktopClass: 'bg-[#f4f4f5] text-[#52525b] border border-[#d4d4d8] dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
    mobileBadgeClass: 'bg-zinc-50 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
    dotClass: 'bg-zinc-500',
  },
  REJECTED: {
    label: 'Từ chối',
    desktopClass: 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    mobileBadgeClass: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    dotClass: 'bg-rose-500',
  },
};

function SourceStatusBadge({ status, isMobile = false }: { status?: RevisionStatus | null; isMobile?: boolean }) {
  if (!status) {
    if (isMobile) {
      return (
        <span
          data-testid="status-badge-none"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-slate-400" />
          <span>{t('Chưa có bản sửa đổi')}</span>
        </span>
      );
    }
    return (
      <span
        data-testid="status-badge-none"
        className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
      >
        <span>{t('Chưa có bản sửa đổi')}</span>
      </span>
    );
  }
  const conf = STITCH_STATUS_STYLES[status] || STITCH_STATUS_STYLES.DRAFT;
  if (isMobile) {
    return (
      <span
        data-testid={`status-badge-${status}`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 ${conf.mobileBadgeClass}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dotClass}`} />
        <span>{t(conf.label)}</span>
      </span>
    );
  }
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${conf.desktopClass}`}
    >
      <span>{t(conf.label)}</span>
    </span>
  );
}

export default function KnowledgeSourcesPage() {
  useLanguage();
  const { user } = useAuth();
  const { profile } = useExpertProfile();

  const [activeTab, setActiveTab] = useState<RevisionStatus | undefined>(undefined);
  const { data, loading, error, errorCode, page, setPage, setStatusFilter, reload } =
    useKnowledgeSources(0, 20, activeTab);

  const canCreate =
    user?.role === 'ADMIN' || (user?.role === 'EXPERT' && profile?.verificationStatus === 'VERIFIED');

  const isRestrictedExpert =
    user?.role === 'EXPERT' &&
    profile &&
    profile.verificationStatus !== 'VERIFIED';

  const handleTabChange = (status: RevisionStatus | undefined) => {
    if (activeTab === status && page === 0) return;
    setActiveTab(status);
    setStatusFilter(status);
  };

  const totalPages = data?.totalPages ?? 1;
  const totalElements = data?.totalElements ?? 0;
  const sources = data?.content ?? [];

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-text tracking-tight">
            {t('Nguồn tri thức')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t('Tài liệu và trích đoạn đã lưu trong hệ thống.')}
          </p>
        </div>

        {canCreate && (
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 mt-1 sm:mt-0">
            {/* Outlined Action: Nhập tài liệu */}
            <Link
              to="/knowledge/import"
              aria-label={t('Nhập tài liệu')}
              className="h-11 sm:h-10 px-3 sm:px-4 rounded-lg border border-[#0072a8] sm:border-[#e2e8f0] dark:border-border text-[#0072a8] sm:text-slate-700 sm:dark:text-slate-200 bg-white dark:bg-surface hover:bg-[#eff8fc] sm:hover:bg-[#f8fafc] dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold sm:font-medium transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              <span>{t('Nhập tài liệu')}</span>
            </Link>

            {/* Primary Action: Tạo nguồn mới */}
            <Link
              to="/knowledge/sources/new"
              aria-label={t('Tạo nguồn mới')}
              className="h-11 sm:h-10 px-3 sm:px-4 rounded-lg bg-[#0072a8] text-white hover:bg-[#1f5ca9] flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold sm:font-medium shadow-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>{t('Tạo nguồn mới')}</span>
            </Link>
          </div>
        )}
      </div>

      {/* ─── Restricted Expert Notice ─── */}
      {isRestrictedExpert && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg shrink-0 mt-0.5">
            info
          </span>
          <div className="space-y-1">
            <p className="font-semibold text-slate-900 dark:text-text">
              {profile.verificationStatus === 'PENDING'
                ? t('Tài khoản của bạn đang chờ quản trị viên xác minh.')
                : t('Quyền chuyên môn của tài khoản đang tạm đình chỉ.')}
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {t(
                'Bạn có thể xem các nguồn tri thức đã đóng góp trước đây ở chế độ chỉ đọc. Chức năng tạo nguồn mới và sửa bản nháp sẽ mở lại khi hồ sơ ở trạng thái Đã xác minh.'
              )}
            </p>
          </div>
        </div>
      )}

      {/* ─── Schema Not Ready (503) Banner ─── */}
      {errorCode === 'schema_not_ready' && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-200 space-y-2"
        >
          <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
            <span className="material-symbols-outlined">construction</span>
            <span>{t('Chức năng tri thức tạm thời chưa sẵn sàng (503)')}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {t('Hệ thống cơ sở dữ liệu quản trị tri thức đang trong quá trình nâng cấp. Vui lòng quay lại sau.')}
          </p>
        </div>
      )}

      {/* ─── Revision-Status Filter ─── */}
      {/* Desktop Filter Pills (>= sm) */}
      <div className="hidden sm:flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map(filter => {
          const isActive = activeTab === filter.value;
          return (
            <button
              key={filter.label}
              type="button"
              onClick={() => handleTabChange(filter.value)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#1f5ca9] text-white shadow-xs dark:bg-sky-600'
                  : 'bg-white dark:bg-surface text-slate-600 dark:text-slate-300 border border-[#e2e8f0] dark:border-border hover:bg-[#f8fafc] dark:hover:bg-slate-800'
              }`}
            >
              {t(filter.label)}
            </button>
          );
        })}
      </div>

      {/* Mobile Filter Dropdown (< sm) */}
      <section className="sm:hidden bg-white dark:bg-surface p-2.5 rounded-xl border border-[#e2e8f0] dark:border-border shadow-xs">
        <div className="flex items-center gap-2">
          <label
            htmlFor="revision-status-filter"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-400">tune</span>
            <span>{t('Trạng thái:')}</span>
          </label>
          <div className="relative flex-1">
            <select
              id="revision-status-filter"
              value={STATUS_FILTERS.find(f => f.value === activeTab)?.key ?? 'all'}
              onChange={e => {
                const match = STATUS_FILTERS.find(f => f.key === e.target.value);
                handleTabChange(match?.value);
              }}
              className="w-full h-10 pl-3 pr-8 rounded-lg border border-[#e2e8f0] dark:border-border bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-text text-xs focus:border-[#0072a8] focus:ring-2 focus:ring-[#00afef]/25 transition-colors cursor-pointer appearance-none"
            >
              {STATUS_FILTERS.map(f => (
                <option key={f.key} value={f.key}>
                  {t(f.label)}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-[18px] text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              unfold_more
            </span>
          </div>
        </div>
      </section>

      {/* ─── Content Area ─── */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : sources.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-[#e2e8f0] dark:border-border bg-white dark:bg-surface p-6 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0072a8] dark:text-sky-400 flex items-center justify-center mx-auto mb-3">
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              menu_book
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-text">{t('Không có nguồn tri thức nào')}</h2>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {activeTab
              ? t('Không tìm thấy nguồn tri thức nào ở trạng thái này.')
              : t('Chưa có hồ sơ nguồn tri thức nào trong hệ thống.')}
          </p>
          {canCreate && !activeTab && (
            <Link
              to="/knowledge/sources/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0072a8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f5ca9] transition-colors shadow-xs"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                add
              </span>
              <span>{t('Tạo nguồn tri thức đầu tiên')}</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View (>= sm) */}
          <div className="hidden sm:block bg-white dark:bg-surface border border-[#e2e8f0] dark:border-border rounded-xl shadow-[0_1px_2px_0_rgba(30,41,59,0.05)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" data-testid="knowledge-sources-table">
                <thead>
                  <tr className="bg-[#f8fafc] dark:bg-slate-800/60 border-b border-[#e2e8f0] dark:border-border">
                    <th scope="col" className="py-3 px-6 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('Tiêu đề tài liệu')}
                    </th>
                    <th scope="col" className="py-3 px-6 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-44">
                      {t('Trạng thái')}
                    </th>
                    <th scope="col" className="py-3 px-6 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36">
                      {t('Người tạo')}
                    </th>
                    <th scope="col" className="py-3 px-6 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-28">
                      {t('Phiên bản')}
                    </th>
                    <th scope="col" className="py-3 px-6 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36">
                      {t('Cập nhật')}
                    </th>
                    <th scope="col" className="py-3 px-6 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right w-28">
                      {t('Thao tác')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9] dark:divide-slate-800">
                  {sources.map(src => {
                    const rev = src.latestRevision;
                    const title = rev?.title || t('Chưa có tiêu đề');
                    const status = rev?.status;
                    return (
                      <tr
                        key={src.id}
                        data-source-id={src.id}
                        className="hover:bg-[#f8fafc] dark:hover:bg-slate-800/40 transition-colors duration-150"
                      >
                        <td className="py-3.5 px-6 text-sm font-medium text-slate-900 dark:text-text leading-snug">
                          <Link
                            to={`/knowledge/sources/${src.id}`}
                            className="hover:text-[#0072a8] dark:hover:text-sky-400 transition-colors block truncate max-w-md"
                            title={title}
                          >
                            {title}
                          </Link>
                        </td>
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          <SourceStatusBadge status={status} />
                        </td>
                        <td className="py-3.5 px-6 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {src.ownerDisplayName || (src.ownerUserId ? `User #${src.ownerUserId}` : '--')}
                        </td>
                        <td className="py-3.5 px-6 text-sm text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                          {rev?.revisionNumber != null ? t('Bản {0}', [rev.revisionNumber]) : '--'}
                        </td>
                        <td className="py-3.5 px-6 text-sm text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                          {formatDate(src.updatedAt || src.createdAt)}
                        </td>
                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          <Link
                            to={`/knowledge/sources/${src.id}`}
                            aria-label={`${t('Chi tiết')} ${title}`}
                            className="inline-flex items-center justify-end text-sm font-medium text-[#0072a8] dark:text-sky-400 hover:underline min-h-[44px]"
                          >
                            {t('Chi tiết')}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-6 py-4 border-t border-[#e2e8f0] dark:border-border bg-[#f8fafc] dark:bg-slate-800/40">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400" data-testid="table-total-count">
                {t('Tổng số: {0} nguồn tri thức', [totalElements])}
              </span>
            </div>
          </div>

          {/* Mobile Card List (< sm) */}
          <section
            aria-label={t('Danh sách tài liệu tri thức')}
            className="sm:hidden flex flex-col gap-3"
            data-testid="knowledge-sources-mobile-list"
          >
            {sources.map(src => {
              const rev = src.latestRevision;
              const title = rev?.title || t('Chưa có tiêu đề');
              const status = rev?.status;
              return (
                <article
                  key={src.id}
                  data-source-id={src.id}
                  className="bg-white dark:bg-surface rounded-xl border border-[#e2e8f0] dark:border-border p-4 shadow-xs flex flex-col gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/knowledge/sources/${src.id}`}
                      className="text-[15px] font-semibold text-slate-900 dark:text-text hover:text-[#0072a8] dark:hover:text-sky-400 leading-snug break-words flex-1"
                    >
                      {title}
                    </Link>
                    <SourceStatusBadge status={status} isMobile />
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {src.ownerDisplayName || (src.ownerUserId ? `User #${src.ownerUserId}` : '--')}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="tabular-nums">
                      {rev?.revisionNumber != null ? t('Bản {0}', [rev.revisionNumber]) : '--'}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="tabular-nums">{formatDate(src.updatedAt || src.createdAt)}</span>
                  </div>

                  {/* Card Action */}
                  <div className="flex items-center justify-end pt-1">
                    <Link
                      to={`/knowledge/sources/${src.id}`}
                      aria-label={`${t('Chi tiết')} ${title}`}
                      className="min-h-[44px] inline-flex items-center gap-1 text-[13px] font-semibold text-[#0072a8] dark:text-sky-400 hover:text-[#005780] active:text-[#004489] px-2 rounded-lg cursor-pointer"
                    >
                      <span>{t('Chi tiết')}</span>
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </Link>
                  </div>
                </article>
              );
            })}

            {/* Mobile Total Microcopy */}
            <div className="text-center py-2 text-xs text-slate-500 dark:text-slate-400" data-testid="mobile-total-count">
              {t('Tổng số: {0} nguồn tri thức', [totalElements])}
            </div>
          </section>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <div>
                <span>{t('Tổng số')}: </span>
                <span className="font-semibold text-slate-900 dark:text-text">{totalElements}</span>{' '}
                <span>{t('nguồn tri thức')}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage(page - 1)}
                  className="min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 rounded-lg border border-[#e2e8f0] dark:border-border bg-white dark:bg-surface text-slate-700 dark:text-slate-300 hover:bg-[#f8fafc] dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  {t('Trang trước')}
                </button>
                <span className="font-medium text-slate-900 dark:text-text px-2">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 rounded-lg border border-[#e2e8f0] dark:border-border bg-white dark:bg-surface text-slate-700 dark:text-slate-300 hover:bg-[#f8fafc] dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  {t('Trang sau')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
