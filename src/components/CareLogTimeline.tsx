import { useState } from 'react';
import { useLanguage } from '../i18n/useLanguage';
import { t, getLocale } from '../i18n';
import useCareLogs from '../hooks/useCareLogs';
import { useAuth } from '../hooks/useAuth';
import { ACTION_TYPE_LABELS, type CareLogTimelineProps } from '../types/careLog';
import { formatRelativeTime } from '../utils/formatTime';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import CareLogForm from './CareLogForm';

export default function CareLogTimeline({ zoneCode, zoneId }: CareLogTimelineProps) {
  useLanguage();
  const { user } = useAuth();
  const { logs, loading, error, retry, create, isSaving, saveError, clearSaveError } = useCareLogs(zoneCode);
  const [formOpen, setFormOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-base font-bold text-text">{t('Lịch sử chăm sóc khu vực')}</h2>
        <p className="mt-1 text-xs text-gray">{t('{0} bản ghi', [logs.length])}</p></div>
      <button type="button" onClick={() => { clearSaveError(); setSaved(false); setFormOpen(true); }}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-surface dark:text-bg cursor-pointer">
        <span aria-hidden="true" className="material-symbols-outlined text-lg">add</span>{t('Ghi nhật ký mới')}
      </button>
    </div>
    {saved && <p role="status" className="rounded-xl bg-teal/10 p-3 text-sm text-teal">{t('Đã lưu nhật ký chăm sóc.')}</p>}
    <div className={formOpen ? 'grid grid-cols-1 lg:grid-cols-12 gap-5 items-start' : ''}>
      {formOpen && <div className="lg:col-span-5 lg:order-2"><CareLogForm isSaving={isSaving} error={saveError}
        onClose={() => setFormOpen(false)} onSubmit={async values => {
          const success = await create({ zoneId, actionType: values.actionType, note: values.note.trim() || null, performBy: user?.email ?? null });
          if (success) setSaved(true);
          return success;
        }} /></div>}
      <div className={formOpen ? 'lg:col-span-7 lg:order-1' : ''}>
        {loading ? <LoadingState /> : error ? <ErrorState message={t('Không thể tải nhật ký chăm sóc. Vui lòng thử lại.')} onRetry={retry} />
          : logs.length === 0 ? <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <span aria-hidden="true" className="material-symbols-outlined mb-3 text-3xl text-navy">menu_book</span>
            <h3 className="text-sm font-semibold text-text">{t('Chưa có nhật ký chăm sóc')}</h3>
            <p className="mt-2 text-xs text-gray">{t('Ghi lại hoạt động đầu tiên bằng nút Ghi nhật ký mới.')}</p>
          </div> : <ol aria-label={t('Dòng thời gian chăm sóc')} className="relative space-y-4 before:absolute before:left-4 before:top-4 before:bottom-4 before:w-px before:bg-border">
            {logs.map(log => {
              const action = ACTION_TYPE_LABELS[log.actionType] ?? { label: 'Hoạt động chăm sóc', icon: 'menu_book' };
              const fertilizer = log.actionType === 'FERTILIZING';
              return <li key={log.id} data-care-log={log.id} className="relative flex items-start gap-3">
                <span aria-hidden="true" className={`material-symbols-outlined z-10 mt-4 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-lg ${fertilizer ? 'text-teal' : 'text-blue'}`}>{action.icon}</span>
                <article className="min-w-0 flex-1 rounded-2xl border border-border bg-surface p-4 md:p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-text">{t(action.label)}</h3>
                    {log.performedAt && <time dateTime={log.performedAt} title={new Date(log.performedAt).toLocaleString(getLocale())} className="text-[11px] text-gray">{formatRelativeTime(log.performedAt)}</time>}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-text/90">{log.note || t('Không có ghi chú.')}</p>
                  <div className="mt-4 flex items-start gap-1.5 text-xs text-gray">
                    <span aria-hidden="true" className="material-symbols-outlined text-base text-navy">person</span>
                    <span className="break-all">{t('Người thực hiện:')} {log.performBy || t('Chưa ghi nhận')}</span>
                  </div>
                </article>
              </li>;
            })}
          </ol>}
      </div>
    </div>
  </div>;
}
