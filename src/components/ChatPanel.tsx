import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import ReactMarkdown from 'react-markdown';
import useAgentChat, { type AgentChatState } from '../hooks/useAgentChat';
import type { ChatFormValues } from '../types/agent';
import { modelProviderLabel } from '../utils/agentAnswer';
import { useLanguage } from '../i18n/useLanguage';
import { getLocale, t } from '../i18n';

const SUGGESTIONS = ['Độ ẩm đất tại zoneA hiện tại là bao nhiêu?', 'Khu A có cần tưới không?', 'Những cảnh báo nào tại zoneA cần chú ý?'];
const TOOL_LABELS: Record<string, string> = { getSensorData: 'Cảm biến', getWeather: 'Thời tiết',
  searchKnowledge: 'Tri thức', getCareHistory: 'Nhật ký', getAlerts: 'Cảnh báo', getZoneProfile: 'Hồ sơ khu vực' };

export default function ChatPanel({ variant, zoneCode }: { variant: 'full' | 'compact'; zoneCode?: string }) {
  const chat = useAgentChat({ zoneCode });
  return <ChatPanelView key={chat.conversationId ?? 'new'} variant={variant} chat={chat} />;
}

export function ChatPanelView({ variant, chat, onOpenHistory, disabled = false }: {
  variant: 'full' | 'compact'; chat: AgentChatState; onOpenHistory?: () => void; disabled?: boolean;
}) {
  useLanguage();
  const { messages, sendQuestion, isLoading, isHistoryLoading, historyError, conversationId, zoneCode,
    newConversation, openConversation } = chat;
  const busy = disabled || isLoading || isHistoryLoading;
  const { register, handleSubmit, reset, setValue } = useForm<ChatFormValues>({ defaultValues: { question: '' } });
  const inputId = useId();
  const list = useRef<HTMLDivElement | null>(null);
  const full = variant === 'full';
  // A pending new question must not be paired with an older answer.
  const lastQuestionIndex = messages.map(message => message.role).lastIndexOf('user');
  const visibleMessages = full ? messages : messages.slice(Math.max(0, lastQuestionIndex));
  useEffect(() => {
    if (full && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, isLoading, full]);

  const submitQuestion = (question: string) => {
    if (!question.trim() || busy || historyError) return;
    reset();
    void sendQuestion(question);
  };
  return (
    <section aria-label={t('Cuộc trò chuyện với trợ lý AI')} className={`flex min-h-0 flex-col ${full ? 'h-full rounded-2xl border border-border bg-surface shadow-sm' : 'gap-3'}`}>
      {full && <header className="shrink-0 border-b border-border p-4 md:p-5">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="material-symbols-outlined rounded-xl bg-navy/10 p-2 text-navy dark:text-blue">smart_toy</span>
          <div className="min-w-0"><h1 className="text-lg font-bold text-text">{t('Trợ lý AI DuriCare')}</h1>
            <p className="text-xs text-gray">{t('Hỏi về cảm biến và chăm sóc khu vườn của bạn.')}</p></div>
        </div>
      </header>}
      <div className={`flex shrink-0 flex-wrap items-center gap-2 ${full ? 'border-b border-border px-3 py-2 md:px-5' : ''}`}>
        {onOpenHistory && <button type="button" onClick={onOpenHistory} className="lg:hidden min-h-11 rounded-lg border border-border px-3 text-xs font-semibold text-text cursor-pointer">{t('Lịch sử hội thoại')}</button>}
        <button type="button" disabled={busy} onClick={newConversation} className="min-h-11 rounded-lg border border-border px-3 text-xs font-semibold text-navy dark:text-blue disabled:opacity-50 cursor-pointer">{t('Cuộc trò chuyện mới')}</button>
        {zoneCode && <span className="text-xs text-gray break-all">{t('Khu vực: {0}', [zoneCode])}</span>}
      </div>
      <div ref={list} role="log" aria-live="polite" aria-label={t('Tin nhắn')} className={`${full ? 'flex-1 min-h-0 overflow-y-auto p-4 md:p-5' : 'max-h-96 overflow-y-auto'} space-y-4 [overflow-wrap:anywhere]`}>
        {isHistoryLoading && <p role="status" className="animate-pulse text-sm text-gray">{t('Đang tải cuộc trò chuyện...')}</p>}
        {historyError && <div role="alert" className="rounded-xl border border-coral/30 bg-coral/10 p-3 text-sm text-coral">
          <p>{t(historyError)}</p><button type="button" onClick={() => { if (conversationId) void openConversation(conversationId, zoneCode); }} className="mt-2 min-h-11 rounded-lg border border-coral/30 px-3 cursor-pointer">{t('Thử lại')}</button></div>}
        {!isHistoryLoading && !historyError && messages.length === 0 && <div className={`${full ? 'flex min-h-full flex-col justify-center' : 'rounded-xl bg-bg p-4'} text-center space-y-4`}>
          <div><p className="text-sm font-semibold text-text">{t('Bạn muốn biết gì về khu vườn?')}</p>
            <p className="mt-1 text-xs text-gray">{t('Hỏi về độ ẩm đất, thời tiết hoặc các cảnh báo cần xử lý.')}</p></div>
          {full && <div className="flex flex-wrap justify-center gap-2">{SUGGESTIONS.map(question => <button key={question} type="button"
            className="min-h-11 rounded-xl border border-border bg-bg px-3 py-2 text-xs text-text hover:border-navy cursor-pointer"
            onClick={() => { setValue('question', t(question)); submitQuestion(t(question)); }}>{t(question)}</button>)}</div>}
        </div>}
        {visibleMessages.map(message => {
          const user = message.role === 'user';
          const retryQuestion = message.retryQuestion;
          return <article key={message.id} data-chat-role={message.role} data-chat-error={message.isError || undefined}
            className={`flex ${user ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[94%] sm:max-w-[88%] rounded-2xl p-3 md:p-4 text-sm leading-relaxed ${user
              ? 'bg-navy/10 text-text border border-navy/20 rounded-tr-sm'
              : message.isError ? 'bg-coral/10 text-coral border border-coral/30 rounded-tl-sm' : 'bg-bg text-text border border-border rounded-tl-sm'}`}>
              {user ? <p className="whitespace-pre-wrap">{message.content}</p> : <div className="space-y-2 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_a]:text-navy [&_a]:underline [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface [&_pre]:p-3 [&_code]:break-words">
                <ReactMarkdown>{message.isError ? t(message.content) : message.content}</ReactMarkdown>
              </div>}
              {message.modelUsed && <p className="mt-2 text-[11px] text-gray" title={message.modelUsed}>{t('Trả lời bởi {0}', [modelProviderLabel(message.modelUsed)])}</p>}
              {!user && !!message.toolsUsed?.length && <div aria-label={t('Công cụ đã dùng')} className="mt-2 flex flex-wrap gap-1.5">
                {Array.from(new Set(message.toolsUsed.map(tool => tool.name))).map(name => {
                  const calls = message.toolsUsed?.filter(tool => tool.name === name) ?? [];
                  const outcomes = Array.from(new Set(calls.map(tool => t(tool.outcome === 'OK' ? 'Có dữ liệu' : tool.outcome === 'DENIED' ? 'Bị từ chối' : 'Không có dữ liệu')))).join(' · ');
                  return <span key={name} data-tool-name={name} title={outcomes} className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-gray">{t(TOOL_LABELS[name] ?? name)}</span>;
                })}
              </div>}
              <time dateTime={message.createdAt.toISOString()} className="mt-1 block text-right text-[10px] text-gray">{message.createdAt.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })}</time>
              {message.isError && retryQuestion && <button type="button" disabled={busy}
                onClick={() => submitQuestion(retryQuestion)} className="mt-2 min-h-11 rounded-lg border border-coral/30 px-3 text-xs font-semibold disabled:opacity-50 cursor-pointer">{t('Thử lại câu hỏi')}</button>}
            </div>
          </article>;
        })}
        {isLoading && <div role="status" className="flex items-center gap-2 text-xs text-gray p-3">
          <span aria-hidden="true" className="size-2 rounded-full bg-teal animate-pulse" />{t('Đang trả lời...')}
        </div>}
      </div>
      <form onSubmit={handleSubmit(({ question }) => submitQuestion(question))}
        className={`${full ? 'shrink-0 border-t border-border p-3 md:p-4' : ''} flex items-end gap-2`}>
        <div className="min-w-0 flex-1"><label htmlFor={inputId} className="sr-only">{t('Câu hỏi cho trợ lý AI')}</label>
          <input id={inputId} {...register('question', { required: true, validate: value => value.trim().length > 0 })}
            disabled={busy || !!historyError} maxLength={4000} placeholder={t('Nhập câu hỏi của bạn...')} autoComplete="off"
            className="w-full min-h-11 rounded-xl border border-border bg-bg px-3 py-3 text-sm text-text placeholder:text-gray focus:outline-none focus:ring-2 focus:ring-navy/30 disabled:opacity-60" /></div>
        <button type="submit" disabled={busy || !!historyError} className="min-h-11 shrink-0 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-surface dark:text-bg disabled:opacity-50 cursor-pointer">{t('Gửi')}</button>
      </form>
      {!full && <Link to={`/agent${conversationId || zoneCode ? '?' + new URLSearchParams({ ...(conversationId ? { conversationId } : {}), ...(zoneCode ? { zoneCode } : {}) }).toString() : ''}`} className="min-h-11 flex items-center justify-center gap-2 text-xs font-semibold text-navy dark:text-blue hover:underline">
        {t('Mở rộng cuộc trò chuyện')}<span aria-hidden="true" className="material-symbols-outlined text-base">open_in_full</span>
      </Link>}
    </section>
  );
}
