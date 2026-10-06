import { useState } from 'react';
import type { AgentConversation } from '../types/agent';
import { formatRelativeTime } from '../utils/formatTime';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';

export default function AgentConversationList({ conversations, activeId, loading, error, deleteError, deletingId,
  disabled, onSelect, onDelete, onRetry }: {
  conversations: AgentConversation[]; activeId?: string; loading: boolean; error: string | null;
  deleteError: string | null; deletingId: string | null; disabled: boolean;
  onSelect: (conversation: AgentConversation) => void; onDelete: (id: string) => Promise<boolean>; onRetry: () => void;
}) {
  useLanguage();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const busy = disabled || deletingId !== null;
  return <section aria-label={t('Danh sách hội thoại')} className="flex h-full min-h-0 flex-col">
    <header className="shrink-0 border-b border-border px-4 py-5"><h2 className="text-sm font-bold text-text">{t('Lịch sử hội thoại')}</h2>
      <p className="mt-1 text-xs text-gray">{t('Các cuộc trò chuyện của bạn')}</p></header>
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
      {loading && <p role="status" className="animate-pulse p-3 text-xs text-gray">{t('Đang tải danh sách hội thoại...')}</p>}
      {error && <div role="alert" className="p-2 text-xs text-coral"><p>{t(error)}</p>
        <button disabled={busy} onClick={onRetry} className="mt-2 min-h-11 rounded-lg border border-border px-3 disabled:opacity-50 cursor-pointer">{t('Thử lại')}</button></div>}
      {deleteError && <p role="alert" className="p-2 text-xs text-coral">{t(deleteError)}</p>}
      {!loading && !error && conversations.length === 0 && <p className="p-3 text-xs text-gray">{t('Chưa có cuộc trò chuyện nào. Hãy gửi câu hỏi đầu tiên.')}</p>}
      {conversations.map(conversation => <div key={conversation.id} data-conversation-id={conversation.id}
        className={`rounded-xl border ${activeId === conversation.id ? 'border-navy/40 bg-navy/10' : 'border-border bg-bg'}`}>
        <div className="flex items-start gap-1 p-2">
          <button type="button" disabled={busy} onClick={() => onSelect(conversation)} aria-current={activeId === conversation.id ? 'true' : undefined}
            className="min-h-11 min-w-0 flex-1 rounded-lg p-1 text-left disabled:opacity-50 cursor-pointer">
            <span className="line-clamp-2 break-words text-xs font-semibold text-text">{conversation.title}</span>
            <span className="mt-1 block text-[10px] text-gray">{formatRelativeTime(conversation.updatedAt)}</span>
            {conversation.zoneCode && <span className="mt-1 block break-all text-[10px] text-gray">{conversation.zoneCode}</span>}
          </button>
          <button type="button" disabled={busy} onClick={() => setConfirmId(conversation.id)} aria-label={t('Xoá hội thoại: {0}', [conversation.title])}
            className="size-11 shrink-0 rounded-lg text-gray hover:text-coral disabled:opacity-50 cursor-pointer"><span aria-hidden="true" className="material-symbols-outlined text-lg">delete</span></button>
        </div>
        {confirmId === conversation.id && <div className="border-t border-border p-2 text-xs text-text">
          <p>{t('Xoá cuộc trò chuyện này? Không thể khôi phục.')}</p>
          <div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={async () => { if (await onDelete(conversation.id)) setConfirmId(null); }}
            className="min-h-11 rounded-lg border border-coral/30 px-3 text-coral disabled:opacity-50 cursor-pointer">{t(deletingId === conversation.id ? 'Đang xoá...' : 'Xác nhận xoá')}</button>
            <button type="button" disabled={busy} onClick={() => setConfirmId(null)} className="min-h-11 rounded-lg border border-border px-3 disabled:opacity-50 cursor-pointer">{t('Huỷ')}</button></div>
        </div>}
      </div>)}
    </div>
  </section>;
}
