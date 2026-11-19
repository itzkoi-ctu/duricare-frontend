import { useState, useEffect } from 'react';
import { t } from '../../i18n';
import { listOwnerEvents } from '../../api/owner';
import type { EventResponse } from '../../types/owner';
import OwnerStatusBadge from './OwnerStatusBadge';

interface OwnerEventsTableProps {
  ownerId: number;
  refreshTrigger?: number;
}

function formatEventTimestamp(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return isoString;
  }
}

export default function OwnerEventsTable({ ownerId, refreshTrigger }: OwnerEventsTableProps) {
  const [page, setPage] = useState(0);
  const size = 10;
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    listOwnerEvents(ownerId, page, size, controller.signal)
      .then(res => {
        if (!cancelled && !controller.signal.aborted) {
          setEvents(res.content ?? []);
          setTotalElements(res.totalElements ?? 0);
          setTotalPages(res.totalPages ?? 1);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled && !controller.signal.aborted) {
          const e = err as { name?: string };
          if (e.name === 'CanceledError' || e.name === 'AbortError') return;
          setError(t("Không thể tải lịch sử thao tác."));
        }
      })
      .finally(() => {
        if (!cancelled && !controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [ownerId, page, refreshTrigger, reloadToken]);

  const renderActionHeading = (action: string) => {
    switch (action) {
      case 'CREATE':
        return {
          title: t("Khởi tạo tài khoản"),
          icon: 'person_add',
          iconBg: 'bg-[#eff4ff] dark:bg-blue-950/40 text-[#1f5ca9] border-blue-400',
        };
      case 'LOCK':
        return {
          title: t("Tạm khóa tài khoản"),
          icon: 'lock',
          iconBg: 'bg-red-100 dark:bg-red-950/40 text-red-600 border-red-500',
        };
      case 'UNLOCK':
        return {
          title: t("Mở khóa tài khoản"),
          icon: 'lock_open',
          iconBg: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 border-emerald-500',
        };
      default:
        return {
          title: action,
          icon: 'history',
          iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-400',
        };
    }
  };

  const startRecord = totalElements === 0 ? 0 : page * size + 1;
  const endRecord = Math.min((page + 1) * size, totalElements);

  return (
    <div className="bg-surface rounded-xl border border-border p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[#1f5ca9]">
              history
            </span>
            <h3 className="text-sm font-bold text-text uppercase tracking-wider">
              {t("Lịch sử thao tác & Chuyển trạng thái")}
            </h3>
          </div>
          <span className="text-xs text-gray bg-bg px-2.5 py-1 rounded-full font-medium border border-border">
            {t("{0} sự kiện ghi nhận", [totalElements])}
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-6 pl-6 py-2">
            {[1, 2].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-36 bg-border/60 rounded animate-pulse" />
                <div className="h-14 w-full bg-border/40 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setReloadToken(t => t + 1)}
              className="px-2.5 py-1 rounded bg-white dark:bg-surface border border-red-300 text-red-700 dark:text-red-300 font-semibold cursor-pointer hover:bg-red-50"
            >
              {t("Thử lại")}
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray">
            <span aria-hidden="true" className="material-symbols-outlined text-3xl mb-1 text-gray/60">
              history_toggle_off
            </span>
            <p>{t("Chưa có sự kiện nào được ghi nhận.")}</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {events.map(ev => {
              const heading = renderActionHeading(ev.action);
              const eventKey = ev.eventId ?? ev.id ?? `${ev.action}-${ev.occurredAt ?? ev.timestamp}`;
              const eventDateStr = ev.occurredAt ?? ev.timestamp ?? '';

              // Resolve boolean states from contract fields (fromEnabled, toEnabled) with fallback
              const isNewEnabled = ev.toEnabled !== undefined
                ? Boolean(ev.toEnabled)
                : (ev.newState?.toUpperCase() === 'ACTIVE' || ev.newState?.toUpperCase() === 'ENABLED');
              const isPrevEnabled = ev.fromEnabled !== undefined
                ? Boolean(ev.fromEnabled)
                : (ev.previousState?.toUpperCase() === 'ACTIVE' || ev.previousState?.toUpperCase() === 'ENABLED');

              return (
                <div key={eventKey} className="relative">
                  {/* Timeline Node Icon */}
                  <div
                    aria-hidden="true"
                    className={`absolute -left-[27px] top-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${heading.iconBg}`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {heading.icon}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-text">
                        {heading.title}
                      </span>
                      <span className="text-xs text-gray font-mono">
                        {formatEventTimestamp(eventDateStr)}
                      </span>
                    </div>

                    {/* State Transitions */}
                    {ev.action === 'CREATE' ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray">{t("Trạng thái khởi tạo:")}</span>
                        <OwnerStatusBadge enabled={isNewEnabled} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="text-gray">{t("Chuyển đổi trạng thái:")}</span>
                        <OwnerStatusBadge enabled={isPrevEnabled} />
                        <span aria-hidden="true" className="material-symbols-outlined text-xs text-gray">
                          arrow_forward
                        </span>
                        <OwnerStatusBadge enabled={isNewEnabled} />
                      </div>
                    )}

                    {/* Reason Box */}
                    {ev.reason && (
                      <div className="p-3 bg-bg rounded-lg border border-border text-xs text-text leading-relaxed break-words whitespace-pre-wrap">
                        <span className="font-semibold">{t("Lý do thực hiện:")}</span> {ev.reason}
                      </div>
                    )}

                    {/* Actor ID */}
                    <div className="text-[11px] text-gray">
                      {t("Người thực hiện: #{0}", [ev.actorUserId])}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="pt-6 border-t border-border flex items-center justify-between text-xs text-gray mt-6">
          <span>
            {t("Hiển thị {0} - {1} trong tổng số {2} sự kiện", [startRecord, endRecord, totalElements])}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              aria-label={t("Trang trước")}
              className="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center text-text hover:bg-border/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                chevron_left
              </span>
            </button>
            <span className="h-8 px-2.5 rounded-lg bg-[#1f5ca9] text-white font-semibold flex items-center justify-center text-xs">
              {page + 1}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              aria-label={t("Trang tiếp")}
              className="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center text-text hover:bg-border/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
