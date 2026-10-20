import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { useAuth } from '../hooks/useAuth';
import useExpertProfile from '../hooks/useExpertProfile';
import { useKnowledgeSources } from '../hooks/useKnowledgeSources';
import KnowledgeStatusBadge from '../components/knowledge/KnowledgeStatusBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import type { RevisionStatus } from '../types/governance';

const STATUS_FILTERS: { value: RevisionStatus | undefined; label: string }[] = [
  { value: undefined, label: 'Tất cả' },
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'SUBMITTED', label: 'Đã gửi' },
  { value: 'IN_REVIEW', label: 'Đang thẩm định' },
  { value: 'CHANGES_REQUESTED', label: 'Yêu cầu sửa đổi' },
  { value: 'APPROVED', label: 'Đã phê duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'WITHDRAWN', label: 'Đã rút' },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
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
    setActiveTab(status);
    setStatusFilter(status);
  };

  const totalPages = data?.totalPages ?? 1;
  const totalElements = data?.totalElements ?? 0;
  const sources = data?.content ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-teal text-2xl">
              menu_book
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-text">{t('Nguồn tri thức nông nghiệp')}</h1>
          </div>
          <p className="mt-1 text-xs md:text-sm text-gray">
            {t('Quản lý hồ sơ tài liệu, trích đoạn kỹ thuật canh tác và quy trình thẩm định chuyên môn.')}
          </p>
        </div>

        {canCreate && (
          <Link
            to="/knowledge/sources/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs md:text-sm font-semibold text-surface dark:text-bg hover:opacity-95 transition-opacity shadow-xs"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">
              add
            </span>
            <span>{t('Tạo nguồn tri thức mới')}</span>
          </Link>
        )}
      </div>

      {/* Restricted Expert Notice */}
      {isRestrictedExpert && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-amber/30 bg-amber/10 p-4 text-xs text-text"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-amber text-lg shrink-0 mt-0.5">
            info
          </span>
          <div className="space-y-1">
            <p className="font-semibold text-text">
              {profile.verificationStatus === 'PENDING'
                ? t('Tài khoản của bạn đang chờ quản trị viên xác minh.')
                : t('Quyền chuyên môn của tài khoản đang tạm đình chỉ.')}
            </p>
            <p className="text-gray leading-relaxed">
              {t(
                'Bạn có thể xem các nguồn tri thức đã đóng góp trước đây ở chế độ chỉ đọc. Chức năng tạo nguồn mới và sửa bản nháp sẽ mở lại khi hồ sơ ở trạng thái Đã xác minh.'
              )}
            </p>
          </div>
        </div>
      )}

      {/* Schema Not Ready (503) Banner */}
      {errorCode === 'schema_not_ready' && (
        <div
          role="alert"
          className="rounded-2xl border border-amber/40 bg-amber/10 p-5 text-sm text-text space-y-2"
        >
          <div className="flex items-center gap-2 font-bold text-amber">
            <span className="material-symbols-outlined">construction</span>
            <span>{t('Chức năng tri thức tạm thời chưa sẵn sàng (503)')}</span>
          </div>
          <p className="text-xs text-gray leading-relaxed">
            {t('Hệ thống cơ sở dữ liệu quản trị tri thức đang trong quá trình nâng cấp. Vui lòng quay lại sau.')}
          </p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border/80 text-xs no-scrollbar">
        {STATUS_FILTERS.map(filter => {
          const isActive = activeTab === filter.value;
          return (
            <button
              key={filter.label}
              type="button"
              onClick={() => handleTabChange(filter.value)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-navy text-surface dark:bg-blue dark:text-bg font-semibold shadow-2xs'
                  : 'text-gray hover:text-text hover:bg-bg'
              }`}
            >
              {t(filter.label)}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : sources.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-border bg-surface p-6 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-teal/10 text-teal flex items-center justify-center mx-auto mb-3">
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              menu_book
            </span>
          </div>
          <h2 className="text-base font-bold text-text">{t('Không có nguồn tri thức nào')}</h2>
          <p className="mt-1.5 text-xs text-gray max-w-md mx-auto">
            {activeTab
              ? t('Không tìm thấy nguồn tri thức nào ở trạng thái này.')
              : t('Chưa có hồ sơ nguồn tri thức nào trong hệ thống.')}
          </p>
          {canCreate && !activeTab && (
            <Link
              to="/knowledge/sources/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2 text-xs font-semibold text-surface dark:text-bg hover:opacity-95"
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
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-bg/80 text-gray font-semibold">
                <tr>
                  <th className="px-4 py-3.5">{t('Tiêu đề tài liệu nguồn')}</th>
                  <th className="px-4 py-3.5">{t('Trạng thái')}</th>
                  <th className="px-4 py-3.5">{t('Người tạo')}</th>
                  <th className="px-4 py-3.5">{t('Phiên bản')}</th>
                  <th className="px-4 py-3.5">{t('Cập nhật')}</th>
                  <th className="px-4 py-3.5 text-right">{t('Thao tác')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sources.map(src => {
                  const rev = src.latestRevision;
                  const title = rev?.title || t('Chưa có tiêu đề');
                  const status = rev?.status || 'DRAFT';
                  return (
                    <tr key={src.id} className="hover:bg-bg/40 transition-colors">
                      <td className="px-4 py-3.5 max-w-sm">
                        <Link
                          to={`/knowledge/sources/${src.id}`}
                          className="font-semibold text-text hover:text-navy dark:hover:text-blue block truncate"
                          title={title}
                        >
                          {title}
                        </Link>
                        <span className="text-[10px] font-mono text-gray block mt-0.5">
                          ID: {src.id.substring(0, 8)}...
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <KnowledgeStatusBadge status={status} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-text font-medium">
                        {src.ownerDisplayName || `User #${src.ownerUserId}`}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-gray">
                        {rev ? `v${rev.version} (Rev ${rev.revisionNumber})` : `v${src.version}`}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-gray">
                        {formatDate(src.updatedAt || src.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <Link
                          to={`/knowledge/sources/${src.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-bg text-text hover:bg-surface font-semibold text-[11px] cursor-pointer"
                        >
                          <span>{t('Chi tiết')}</span>
                          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                            chevron_right
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-gray">
              <div>
                <span>{t('Tổng số')}: </span>
                <span className="font-semibold text-text">{totalElements}</span>{' '}
                <span>{t('nguồn tri thức')}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-bg disabled:opacity-40 cursor-pointer"
                >
                  {t('Trang trước')}
                </button>
                <span className="font-medium text-text px-2">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-bg disabled:opacity-40 cursor-pointer"
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
