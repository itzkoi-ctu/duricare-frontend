import { useState } from 'react';
import { useLanguage } from '../i18n/useLanguage';
import { t, getLocale } from '../i18n';
import useCareLogs from '../hooks/useCareLogs';
import { useAuth } from '../hooks/useAuth';
import { ACTION_TYPE_LABELS, type CareLogTimelineProps } from '../types/careLog';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import CareLogForm from './CareLogForm';

interface ExtendedCareLogTimelineProps extends CareLogTimelineProps {
  zoneName?: string;
}

export default function CareLogTimeline({ zoneCode, zoneId, zoneName }: ExtendedCareLogTimelineProps) {
  useLanguage();
  const { user } = useAuth();
  const { logs, loading, error, retry, create, isSaving, saveError, clearSaveError } = useCareLogs(zoneCode);
  const [formOpen, setFormOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const formatExactDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(getLocale(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <section className="space-y-4">
      {/* Section header matching Stitch */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 id="heading-care-history" className="text-base font-bold text-text">{t('Lịch sử chăm sóc khu vực')}</h2>
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#eff4ff] dark:bg-[#1F5CA9]/15 text-[#1F5CA9] dark:text-[#60A5FA] border border-[#bfdbfe] dark:border-[#1F5CA9]/30">
            {t('{0} bản ghi', [logs.length])}
          </span>
        </div>
        {!formOpen && (
          <button
            id="btn-new-care-log"
            type="button"
            onClick={() => {
              clearSaveError();
              setSaved(false);
              setFormOpen(true);
            }}
            className="h-11 px-4 rounded-lg bg-[#1F5CA9] hover:bg-[#1a4e90] text-white text-sm font-medium flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>{t('Ghi nhật ký mới')}</span>
          </button>
        )}
      </div>

      {saved && (
        <div role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 p-3 text-sm font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg">check_circle</span>
          <span>{t('Đã lưu nhật ký chăm sóc.')}</span>
        </div>
      )}

      {/* Two-column split layout (7 cols timeline, 5 cols form) */}
      <div className={formOpen ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start' : ''}>
        {/* LEFT COLUMN: Timeline entries */}
        <div className={formOpen ? 'lg:col-span-7 flex flex-col gap-4' : 'flex flex-col gap-4'}>
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={t('Không thể tải nhật ký chăm sóc. Vui lòng thử lại.')} onRetry={retry} />
          ) : logs.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-3">
              <span aria-hidden="true" className="material-symbols-outlined text-4xl text-[#1F5CA9]">menu_book</span>
              <h3 className="text-sm font-semibold text-text">{t('Chưa có nhật ký chăm sóc')}</h3>
              <p className="text-xs text-gray">{t('Ghi lại hoạt động đầu tiên bằng nút Ghi nhật ký mới.')}</p>
            </div>
          ) : (
            <div aria-label={t('Dòng thời gian chăm sóc')} className="space-y-4">
              {logs.map((log) => {
                const action = ACTION_TYPE_LABELS[log.actionType] ?? { label: 'Hoạt động chăm sóc', icon: 'menu_book' };
                const formattedTime = formatExactDate(log.performedAt);

                return (
                  <article
                    key={log.id}
                    data-care-log={log.id}
                    className="bg-surface rounded-xl border border-border p-5 shadow-sm flex flex-col gap-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#eff4ff] dark:bg-[#1F5CA9]/15 text-[#1F5CA9] dark:text-[#60A5FA] border border-[#bfdbfe] dark:border-[#1F5CA9]/30">
                          {t(action.label)}
                        </span>
                        <span className="text-gray text-xs">•</span>
                        {log.performedAt && (
                          <time dateTime={log.performedAt} className="text-xs font-medium text-text tabular-nums">
                            {formattedTime}
                          </time>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-text leading-relaxed whitespace-pre-wrap break-words">
                      {log.note || <span className="text-gray italic">{t('Không có ghi chú.')}</span>}
                    </p>

                    <div className="pt-2 border-t border-border/80 text-[12px] text-gray flex items-center gap-1.5">
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-gray">person</span>
                      <span>
                        {t('Người thực hiện:')}{' '}
                        <strong className="font-medium text-text">{log.performBy || t('Chưa ghi nhận')}</strong>
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Inline form card (5 cols) */}
        {formOpen && (
          <div className="lg:col-span-5">
            <CareLogForm
              zoneName={zoneName}
              isSaving={isSaving}
              error={saveError}
              onClose={() => setFormOpen(false)}
              onSubmit={async (values) => {
                const success = await create({
                  zoneId,
                  actionType: values.actionType,
                  note: values.note.trim() || null,
                  performBy: user?.email ?? null,
                });
                if (success) {
                  setSaved(true);
                  setFormOpen(false);
                }
                return success;
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
