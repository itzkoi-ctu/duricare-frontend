import { useState } from 'react';
import type { AgentConversation } from '../types/agent';
import { formatRelativeTime } from '../utils/formatTime';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';

export default function AgentConversationList({
  conversations,
  activeId,
  loading,
  error,
  deleteError,
  deletingId,
  disabled,
  onSelect,
  onDelete,
  onRetry,
  onNew,
}: {
  conversations: AgentConversation[];
  activeId?: string;
  loading: boolean;
  error: string | null;
  deleteError: string | null;
  deletingId: string | null;
  disabled: boolean;
  onSelect: (conversation: AgentConversation) => void;
  onDelete: (id: string) => Promise<boolean>;
  onRetry: () => void;
  onNew?: () => void;
}) {
  useLanguage();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const busy = disabled || deletingId !== null;

  return (
    <section aria-label={t('Danh sách hội thoại')} className="flex h-full min-h-0 flex-col justify-between p-3 select-none">
      <div className="flex flex-col min-h-0 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 pt-1 px-1">
          <h2 className="font-semibold text-[#0f172a] dark:text-text text-sm">{t('Lịch sử hội thoại')}</h2>
        </div>

        {/* Primary Action Button: Cuộc trò chuyện mới */}
        {onNew && (
          <button
            type="button"
            disabled={busy}
            onClick={onNew}
            className="w-full py-2 mb-3 rounded-lg border border-[#cbd5e1] dark:border-border hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 text-sm font-medium text-[#0f172a] dark:text-text transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-[#1f5ca9] dark:text-sky-400">add</span>
            <span>{t('Cuộc trò chuyện mới')}</span>
          </button>
        )}

        {/* Timeline Category Header */}
        <div className="px-1.5 pb-1 text-[11px] font-semibold text-[#64748b] dark:text-slate-400">
          {t('Hôm nay')}
        </div>

        {/* Conversation List */}
        <div className="space-y-1 overflow-y-auto pr-0.5 flex-1 min-h-0">
          {loading && (
            <p role="status" className="animate-pulse p-3 text-xs text-gray">
              {t('Đang tải danh sách hội thoại...')}
            </p>
          )}
          {error && (
            <div role="alert" className="p-2 text-xs text-coral">
              <p>{t(error)}</p>
              <button
                type="button"
                disabled={busy}
                onClick={onRetry}
                className="mt-2 min-h-9 rounded-lg border border-border px-3 disabled:opacity-50 cursor-pointer font-medium"
              >
                {t('Thử lại')}
              </button>
            </div>
          )}
          {deleteError && <p role="alert" className="p-2 text-xs text-coral">{t(deleteError)}</p>}
          {!loading && !error && conversations.length === 0 && (
            <p className="p-3 text-xs text-gray">
              {t('Chưa có cuộc trò chuyện nào. Hãy gửi câu hỏi đầu tiên.')}
            </p>
          )}

          {conversations.map(conversation => {
            const isActive = activeId === conversation.id;
            return (
              <div
                key={conversation.id}
                data-conversation-id={conversation.id}
                className={`rounded-lg transition-colors group relative ${
                  isActive
                    ? 'bg-[#eff4ff] dark:bg-sky-950/40 border-l-2 border-[#1f5ca9] dark:border-sky-500 rounded-r-lg'
                    : 'text-[#475569] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between p-2.5 gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSelect(conversation)}
                    aria-current={isActive ? 'true' : undefined}
                    className="min-h-9 min-w-0 flex-1 rounded text-left disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f5ca9]/40"
                  >
                    <div
                      className={`text-[13px] leading-tight truncate ${
                        isActive
                          ? 'font-semibold text-[#1f5ca9] dark:text-sky-300'
                          : 'font-medium text-[#334155] dark:text-slate-200'
                      }`}
                    >
                      {conversation.title}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      {conversation.zoneCode ? (
                        <span
                          className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isActive
                              ? 'bg-white dark:bg-slate-800 text-[#1f5ca9] dark:text-sky-300 border border-[#bfdbfe] dark:border-slate-700'
                              : 'bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-400 border border-[#e2e8f0] dark:border-slate-700'
                          }`}
                        >
                          {conversation.zoneCode}
                        </span>
                      ) : (
                        <span className="inline-block bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-400 border border-[#e2e8f0] dark:border-slate-700 text-[10px] font-medium px-1.5 py-0.5 rounded">
                          {t('Tất cả khu vực')}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatRelativeTime(conversation.updatedAt)}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmId(conversation.id);
                    }}
                    aria-label={t('Xoá hội thoại: {0}', [conversation.title])}
                    title={t('Xoá')}
                    className="min-h-[44px] min-w-[44px] h-11 w-11 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-opacity disabled:opacity-50 cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100 lg:focus-visible:opacity-100 focus:outline-none shrink-0"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      delete
                    </span>
                  </button>
                </div>

                {confirmId === conversation.id && (
                  <div className="border-t border-[#e2e8f0] dark:border-border/80 p-2.5 text-xs text-text bg-white dark:bg-surface rounded-b-lg shadow-sm">
                    <p>{t('Xoá cuộc trò chuyện này? Không thể khôi phục.')}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (await onDelete(conversation.id)) setConfirmId(null);
                        }}
                        className="min-h-[44px] px-3.5 py-2 rounded-lg border border-coral/40 text-coral hover:bg-coral/10 disabled:opacity-50 cursor-pointer font-medium"
                      >
                        {t(deletingId === conversation.id ? 'Đang xoá...' : 'Xác nhận xoá')}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmId(null);
                        }}
                        className="min-h-[44px] px-3.5 py-2 rounded-lg border border-border text-gray hover:bg-border/30 disabled:opacity-50 cursor-pointer font-medium"
                      >
                        {t('Huỷ')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Branding Microcopy */}
      <div className="text-[11px] text-center text-[#94a3b8] dark:text-slate-500 pt-2 border-t border-[#e2e8f0] dark:border-border shrink-0">
        {t('Trợ lý AI nông vụ DuriCare')}
      </div>
    </section>
  );
}
