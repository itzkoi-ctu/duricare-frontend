import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { listAssignedReviews, parseGovernanceError } from '../api/governance';
import type { AssignmentSummary, AssignmentStatus } from '../types/governance';
import AssignmentStatusBadge from '../components/knowledge/AssignmentStatusBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ExpertAssignedReviewsPage() {
  useLanguage();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [reviews, setReviews] = useState<AssignmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const activeRequestRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setLoading(true);
    setError(null);

    const statusParam: AssignmentStatus = activeTab;

    try {
      const res = await listAssignedReviews(page, 15, statusParam, controller.signal);
      if (!controller.signal.aborted) {
        setReviews(res.content);
        setTotalPages(res.totalPages);
        setTotalElements(res.totalElements);
        setLoading(false);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const parsed = parseGovernanceError(err, t('Không thể tải danh sách nhiệm vụ thẩm định.'));
        setError(parsed.message);
        setLoading(false);
      }
    }
  }, [page, activeTab]);

  useEffect(() => {
    loadData();
    return () => {
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
    };
  }, [loadData]);

  const handleTabChange = (tab: 'ACTIVE' | 'COMPLETED') => {
    setActiveTab(tab);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-teal mb-1">
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              rate_review
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-text">
              {t('Hàng đợi thẩm định chuyên môn')}
            </h1>
          </div>
          <p className="text-xs text-gray">
            {t('Không gian thẩm định độc lập dành cho chuyên gia được phân công đánh giá hồ sơ nguồn tri thức.')}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          title={t('Tải lại dữ liệu')}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-surface text-gray hover:text-text hover:bg-bg cursor-pointer transition-colors shadow-2xs self-start sm:self-auto shrink-0"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-lg">
            refresh
          </span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          data-testid="tab-active-reviews"
          onClick={() => handleTabChange('ACTIVE')}
          className={`pb-2.5 px-3 text-xs md:text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'ACTIVE'
              ? 'border-teal text-teal'
              : 'border-transparent text-gray hover:text-text'
          }`}
        >
          {t('Cần thẩm định')}
        </button>

        <button
          type="button"
          data-testid="tab-completed-reviews"
          onClick={() => handleTabChange('COMPLETED')}
          className={`pb-2.5 px-3 text-xs md:text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'COMPLETED'
              ? 'border-teal text-teal'
              : 'border-transparent text-gray hover:text-text'
          }`}
        >
          {t('Đã hoàn thành')}
        </button>
      </div>

      {/* Main Content */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : reviews.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-surface p-6 shadow-2xs space-y-2">
          <span aria-hidden="true" className="material-symbols-outlined text-gray text-4xl">
            task
          </span>
          <h2 className="text-base font-bold text-text">{t('Không có nhiệm vụ nào')}</h2>
          <p className="text-xs text-gray max-w-md mx-auto">
            {activeTab === 'ACTIVE'
              ? t('Hiện bạn không có hồ sơ nào được phân công cần thẩm định.')
              : t('Bạn chưa có kết quả thẩm định nào đã hoàn thành.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {reviews.map(item => (
              <div
                key={item.id}
                data-testid={`review-card-${item.id}`}
                className="p-5 rounded-2xl border border-border bg-surface shadow-2xs space-y-3.5 hover:border-border/80 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border-b border-border/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <AssignmentStatusBadge status={item.status} size="sm" />
                      <span className="text-[11px] font-mono text-gray">
                        v{item.version}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm md:text-base text-text [overflow-wrap:anywhere]">
                      {t('Nhiệm vụ thẩm định hồ sơ')} #{item.revisionId.slice(0, 8)}
                    </h3>
                  </div>

                  <span className="text-xs text-gray font-mono self-start sm:self-auto">
                    {formatDate(item.assignedAt)}
                  </span>
                </div>

                <div className="text-xs space-y-1 bg-bg/50 p-3 rounded-xl border border-border/70">
                  <span className="text-gray block font-semibold">{t('Lý do phân công')}:</span>
                  <p className="text-text leading-relaxed [overflow-wrap:anywhere]">
                    {item.assignmentReason}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-mono text-gray">
                    ID: {item.id.slice(0, 8)}...
                  </span>

                  <Link
                    to={`/knowledge/reviews/${item.id}`}
                    data-testid={`start-review-link-${item.id}`}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xs ${
                      item.status === 'ACTIVE'
                        ? 'bg-teal text-surface dark:text-bg hover:opacity-95'
                        : 'border border-border bg-surface text-gray hover:text-text hover:bg-bg'
                    }`}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-base">
                      {item.status === 'ACTIVE' ? 'edit_document' : 'visibility'}
                    </span>
                    <span>{item.status === 'ACTIVE' ? t('Tiến hành thẩm định') : t('Xem lại kết quả')}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-gray pt-2">
              <span>
                {t('Tổng số')}: {totalElements} {t('nhiệm vụ')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 rounded-lg border border-border bg-surface text-text hover:bg-bg disabled:opacity-40 cursor-pointer"
                >
                  {t('Trước')}
                </button>
                <span className="font-medium text-text px-1">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 rounded-lg border border-border bg-surface text-text hover:bg-bg disabled:opacity-40 cursor-pointer"
                >
                  {t('Sau')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
