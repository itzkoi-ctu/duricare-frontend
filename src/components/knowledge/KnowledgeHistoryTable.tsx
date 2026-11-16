import { useState } from 'react';
import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import type { AuditResponse } from '../../types/governance';
import KnowledgeStatusBadge from './KnowledgeStatusBadge';

interface KnowledgeHistoryTableProps {
  events: AuditResponse[];
  loading?: boolean;
}

function formatDate(iso: string): string {
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

const ACTION_LABELS: Record<string, string> = {
  SOURCE_CREATED: 'Tạo nguồn tri thức',
  DRAFT_SAVED: 'Lưu bản nháp',
  REVISION_CREATED: 'Tạo phiên bản mới',
  SUBMITTED: 'Gửi thẩm định',
  WITHDRAWN: 'Rút hồ sơ',
  ASSIGNED: 'Phân công thẩm định',
  REASSIGNED: 'Phân công lại',
  DECIDED: 'Có quyết định thẩm định',
};

interface AuditReasonDisplayProps {
  reason: string | null | undefined;
  id: string | number;
  variant?: 'table' | 'card';
}

function AuditReasonDisplay({ reason, id, variant = 'table' }: AuditReasonDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!reason || reason.trim() === '') {
    return (
      <span
        className="text-gray/70 italic text-[11px] select-none"
        data-testid={`${variant}-empty-reason-${id}`}
      >
        {t('Không có ghi chú')}
      </span>
    );
  }

  // Reason is considered long if > 120 characters or has 2+ newlines
  const isLong = reason.length > 120 || (reason.match(/\n/g) || []).length >= 2;

  return (
    <div className="space-y-1">
      <div
        className={`whitespace-pre-line break-words [overflow-wrap:break-word] [word-break:normal] text-text text-xs leading-[18px] ${
          !isExpanded && isLong ? 'line-clamp-3' : ''
        }`}
        data-testid={`${variant}-reason-text-${id}`}
      >
        {reason}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          aria-expanded={isExpanded}
          data-testid={`${variant}-toggle-reason-${id}`}
          className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:text-primary-hover hover:underline cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 py-0.5 -ml-1 transition-colors"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[13px]">
            {isExpanded ? 'expand_less' : 'expand_more'}
          </span>
          <span>{isExpanded ? t('Thu gọn') : t('Xem đầy đủ')}</span>
        </button>
      )}
    </div>
  );
}

export default function KnowledgeHistoryTable({ events, loading = false }: KnowledgeHistoryTableProps) {
  useLanguage();

  if (loading) {
    return (
      <div className="py-8 text-center text-xs text-gray" data-testid="history-loading">
        <div className="w-5 h-5 border-2 border-navy/30 border-t-navy rounded-full animate-spin mx-auto mb-2" />
        <span>{t('Đang tải lịch sử kiểm toán...')}</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div
        className="py-6 text-center text-xs text-gray rounded-xl border border-border bg-bg/40"
        data-testid="history-empty"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-2xl text-gray">
          history
        </span>
        <p className="mt-1">{t('Chưa có bản ghi kiểm toán nào.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="knowledge-history-container">
      {/* 1. Mobile & Narrow Viewport: Event Card List */}
      <div className="block md:hidden space-y-3" data-testid="history-cards-container">
        {events.map(ev => {
          const actionText = ACTION_LABELS[ev.action] || ev.action;
          return (
            <div
              key={ev.id}
              className="p-3.5 rounded-xl border border-border bg-surface shadow-xs space-y-2.5"
              data-testid={`history-card-${ev.id}`}
            >
              {/* Card Header: Action + Version Tag + Status Badges */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-xs sm:text-sm text-text truncate">
                    {t(actionText)}
                  </span>
                  {ev.newVersion !== null && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-bg text-gray border border-border/80 shrink-0">
                      v{ev.newVersion}
                    </span>
                  )}
                </div>
                {ev.newStatus && (
                  <div className="flex items-center gap-1 shrink-0">
                    {ev.previousStatus && (
                      <>
                        <KnowledgeStatusBadge status={ev.previousStatus} size="sm" showIcon={false} />
                        <span className="text-gray text-[10px]">→</span>
                      </>
                    )}
                    <KnowledgeStatusBadge status={ev.newStatus} size="sm" showIcon={false} />
                  </div>
                )}
              </div>

              {/* Metadata Row: Timestamp + Actor */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray">
                <div className="flex items-center gap-1 font-mono">
                  <span aria-hidden="true" className="material-symbols-outlined text-[13px] text-gray">
                    schedule
                  </span>
                  <span>{formatDate(ev.occurredAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span aria-hidden="true" className="material-symbols-outlined text-[13px] text-gray">
                    person
                  </span>
                  <span className="font-medium text-text">
                    {ev.actorDisplayName || `User #${ev.actorUserId}`}
                  </span>
                </div>
              </div>

              {/* Reason / Note Row: Dedicated Full-Width Container */}
              <div className="pt-2 border-t border-border/60">
                <span className="text-[11px] font-semibold text-gray block mb-1">
                  {t('Lý do / Ghi chú')}:
                </span>
                <AuditReasonDisplay reason={ev.reason} id={ev.id} variant="card" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Desktop & Tablet Viewport: Responsive Table with Local Horizontal Scroll */}
      <div
        className="hidden md:block overflow-x-auto rounded-xl border border-border bg-surface"
        data-testid="history-table-container"
      >
        <table className="w-full text-left text-xs min-w-[820px]">
          <thead className="border-b border-border bg-bg/75 text-gray font-semibold">
            <tr>
              <th className="px-4 py-3 w-[140px] min-w-[130px] whitespace-nowrap">{t('Thời gian')}</th>
              <th className="px-4 py-3 w-[140px] min-w-[130px] whitespace-nowrap">{t('Người thực hiện')}</th>
              <th className="px-4 py-3 w-[160px] min-w-[140px] whitespace-nowrap">{t('Hành động')}</th>
              <th className="px-4 py-3 w-[180px] min-w-[160px] whitespace-nowrap">{t('Chuyển trạng thái')}</th>
              <th className="px-4 py-3 w-[80px] min-w-[70px] whitespace-nowrap">{t('Phiên bản')}</th>
              <th className="px-4 py-3 min-w-[260px] max-w-[340px]">{t('Lý do / Ghi chú')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {events.map(ev => {
              const actionText = ACTION_LABELS[ev.action] || ev.action;
              return (
                <tr
                  key={ev.id}
                  className="hover:bg-bg/40 transition-colors"
                  data-testid={`history-row-${ev.id}`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-gray font-mono">
                    {formatDate(ev.occurredAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-text">
                    {ev.actorDisplayName || `User #${ev.actorUserId}`}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-semibold text-text">{t(actionText)}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {ev.newStatus ? (
                      <div className="flex items-center gap-1.5">
                        {ev.previousStatus && (
                          <>
                            <KnowledgeStatusBadge status={ev.previousStatus} size="sm" showIcon={false} />
                            <span className="text-gray text-[10px]">→</span>
                          </>
                        )}
                        <KnowledgeStatusBadge status={ev.newStatus} size="sm" showIcon={false} />
                      </div>
                    ) : (
                      <span className="text-gray">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-gray">
                    {ev.newVersion !== null ? `v${ev.newVersion}` : '—'}
                  </td>
                  <td className="px-4 py-3 min-w-[260px] max-w-[340px]" data-testid={`history-reason-col-${ev.id}`}>
                    <AuditReasonDisplay reason={ev.reason} id={ev.id} variant="table" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
