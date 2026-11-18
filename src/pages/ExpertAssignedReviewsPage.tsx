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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-[24px] font-bold text-text tracking-tight">
            {t('Nhiệm vụ thẩm định')}
          </h1>
          <p className="text-sm text-gray mt-1">
            {t('Đọc, đối chiếu và đánh giá các hồ sơ được phân công bởi hội đồng điều phối.')}
          </p>
        </div>

        <button
          type="button"
          data-testid="refresh-assigned-reviews-button"
          onClick={loadData}
          title={t('Tải lại dữ liệu')}
          className="h-11 px-4 rounded-lg border border-border bg-surface text-text hover:bg-bg font-medium text-[13px] flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer self-start sm:self-auto shrink-0"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-gray">
            refresh
          </span>
          <span>{t('Làm mới danh sách')}</span>
        </button>
      </div>

      {/* Tabs & Pagination Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border">
        <div className="flex items-center gap-8 -mb-px">
          <button
            type="button"
            data-testid="tab-active-reviews"
            onClick={() => handleTabChange('ACTIVE')}
            className={`flex items-center gap-2 pb-3.5 border-b-2 text-[14px] cursor-pointer transition-colors ${
              activeTab === 'ACTIVE'
                ? 'border-[#1f5ca9] text-[#1f5ca9] dark:text-[#60a5fa] font-semibold'
                : 'border-transparent text-gray hover:text-text font-medium'
            }`}
          >
            <span>{t('Cần thẩm định')}</span>
            {activeTab === 'ACTIVE' && (
              <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium rounded-[6px] bg-[#eff4ff] text-[#1f5ca9] border border-[#bae6fd] dark:bg-[#172c49] dark:text-[#60a5fa] dark:border-[#1e40af]">
                {totalElements} {t('nhiệm vụ')}
              </span>
            )}
          </button>

          <button
            type="button"
            data-testid="tab-completed-reviews"
            onClick={() => handleTabChange('COMPLETED')}
            className={`flex items-center gap-2 pb-3.5 border-b-2 text-[14px] cursor-pointer transition-colors ${
              activeTab === 'COMPLETED'
                ? 'border-[#1f5ca9] text-[#1f5ca9] dark:text-[#60a5fa] font-semibold'
                : 'border-transparent text-gray hover:text-text font-medium'
            }`}
          >
            <span>{t('Đã hoàn thành')}</span>
            {activeTab === 'COMPLETED' && (
              <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium rounded-[6px] bg-[#eff4ff] text-[#1f5ca9] border border-[#bae6fd] dark:bg-[#172c49] dark:text-[#60a5fa] dark:border-[#1e40af]">
                {totalElements} {t('nhiệm vụ')}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray pb-2 sm:pb-0">
          <span className="font-medium text-[13px]">
            {t('Trang')} {page + 1} / {totalPages || 1}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage(p => p - 1)}
              title={t('Trang trước')}
              aria-label={t('Trang trước')}
              className="w-8 h-8 rounded-lg border border-border bg-surface text-text hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              title={t('Trang sau')}
              aria-label={t('Trang sau')}
              className="w-8 h-8 rounded-lg border border-border bg-surface text-text hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>
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
          <div className="grid grid-cols-1 gap-4" role="region" aria-label={t('Danh sách hồ sơ cần thẩm định')}>
            {reviews.map(item => (
              <article
                key={item.id}
                data-testid={`review-card-${item.id}`}
                className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:border-border/80 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 font-semibold text-[14px] text-text">
                        <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#1f5ca9] dark:text-[#60a5fa]">
                          description
                        </span>
                        <span>{t('Hồ sơ thẩm định')}</span>
                        <span className="text-gray/60">·</span>
                        <span className="font-mono text-[13px] text-[#1f5ca9] dark:text-[#60a5fa] bg-[#f0f7fa] dark:bg-[#172c49] px-1.5 py-0.5 rounded border border-[#bae6fd] dark:border-[#1e40af]">
                          #{item.revisionId ? item.revisionId.slice(0, 8) : '—'}
                        </span>
                      </div>
                      <AssignmentStatusBadge status={item.status} size="sm" />
                      <span className="text-[11px] font-mono text-gray">
                        v{item.version}
                      </span>
                      <div className="flex items-center gap-1 text-[12px] text-gray">
                        <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-gray/70">
                          schedule
                        </span>
                        <span>{t('Được giao')}: {formatDate(item.assignedAt)}</span>
                      </div>
                    </div>

                    <div className="bg-bg/60 border border-border rounded-lg p-3.5">
                      <span className="block text-[13px] font-semibold text-text mb-1">{t('Lý do phân công')}:</span>
                      <p className="text-[14px] leading-[22px] text-text [overflow-wrap:anywhere]">
                        {item.assignmentReason || t('Không có ghi chú phân công.')}
                      </p>
                    </div>

                    <details className="group text-[12px]">
                      <summary className="inline-flex items-center gap-1.5 text-[#0072a8] dark:text-[#38bdf8] hover:underline font-medium cursor-pointer select-none py-1 transition-colors">
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px] group-open:rotate-90 transition-transform">
                          chevron_right
                        </span>
                        <span>{t('Chi tiết kỹ thuật')}</span>
                      </summary>
                      <div className="mt-2 pl-4 py-1 border-l-2 border-[#bae6fd] dark:border-[#1e40af] space-y-1 font-mono text-[12px] text-gray">
                        <div><span className="text-gray/70">assignment_id:</span> <span className="text-text">{item.id}</span></div>
                        <div><span className="text-gray/70">revision_id:</span> <span className="text-text">{item.revisionId}</span></div>
                      </div>
                    </details>
                  </div>

                  <div className="lg:self-center shrink-0 w-full sm:w-auto">
                    <Link
                      to={`/knowledge/reviews/${item.id}`}
                      data-testid={`start-review-link-${item.id}`}
                      data-task-action="true"
                      className={`w-full sm:w-auto h-11 px-6 rounded-lg text-white font-medium text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00afef] focus:ring-offset-2 ${
                        item.status === 'ACTIVE'
                          ? 'bg-[#1f5ca9] hover:bg-[#184988]'
                          : 'bg-[#64748b] hover:bg-[#475569]'
                      }`}
                    >
                      <span>{item.status === 'ACTIVE' ? t('Tiến hành thẩm định') : t('Xem lại kết quả')}</span>
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                        arrow_forward
                      </span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Bottom Pagination */}
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
