import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import useAgentChat, { type AgentChatState } from '../hooks/useAgentChat';
import type { ChatFormValues } from '../types/agent';
import type { CitationGroup } from '../types/citation';
import {
  adaptWireCitationGroup,
  isValidWireCitationGroup,
  extractCitations,
  stripCitationFooter,
} from '../utils/citationParser';
import CitationChips from './chat/CitationChips';
import CitationDetailModal from './chat/CitationDetailModal';
import MarkdownContent from './chat/MarkdownContent';
import { isSystemRefusal, modelProviderLabel } from '../utils/agentAnswer';
import { useLanguage } from '../i18n/useLanguage';
import { getLocale, t } from '../i18n';
import { useOptionalOverviewContext } from '../context/OverviewContext';

const SUGGESTIONS = [
  'Độ ẩm đất tại zoneA hiện tại là bao nhiêu?',
  'Khu A có cần tưới không?',
  'Những cảnh báo nào tại zoneA cần chú ý?',
];

const TOOL_LABELS: Record<string, string> = {
  getSensorData: 'Cảm biến',
  getWeather: 'Thời tiết',
  searchKnowledge: 'Tri thức',
  getCareHistory: 'Nhật ký',
  getAlerts: 'Cảnh báo',
  getZoneProfile: 'Hồ sơ khu vực',
};

export default function ChatPanel({ variant, zoneCode }: { variant: 'full' | 'compact'; zoneCode?: string }) {
  const chat = useAgentChat({ zoneCode });
  return <ChatPanelView key={chat.conversationId ?? 'new'} variant={variant} chat={chat} />;
}

export function ChatPanelView({
  variant,
  chat,
  onOpenHistory,
  onToggleContext,
  isContextOpen,
  disabled = false,
}: {
  variant: 'full' | 'compact';
  chat: AgentChatState;
  onOpenHistory?: () => void;
  onToggleContext?: () => void;
  isContextOpen?: boolean;
  disabled?: boolean;
}) {
  useLanguage();
  const ov = useOptionalOverviewContext();
  const overviewZones = ov?.data?.zones ?? [];

  const {
    messages,
    sendQuestion,
    isLoading,
    isHistoryLoading,
    historyError,
    conversationId,
    zoneCode,
    newConversation,
    openConversation,
  } = chat;

  const busy = disabled || isLoading || isHistoryLoading;
  const { register, handleSubmit, reset, setValue } = useForm<ChatFormValues>({ defaultValues: { question: '' } });
  const inputId = useId();
  const list = useRef<HTMLDivElement | null>(null);
  const full = variant === 'full';

  const activeZoneObj = zoneCode ? overviewZones.find(z => z.code === zoneCode) : null;
  const zoneDisplay = activeZoneObj
    ? activeZoneObj.name && activeZoneObj.name !== activeZoneObj.code
      ? `${activeZoneObj.name} · ${activeZoneObj.code}`
      : activeZoneObj.code
    : zoneCode || t('Tất cả khu vực');

  // A pending new question must not be paired with an older answer.
  const lastQuestionIndex = messages.map(message => message.role).lastIndexOf('user');
  const visibleMessages = full ? messages : messages.slice(Math.max(0, lastQuestionIndex));

  useEffect(() => {
    if (full && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, isLoading, full]);

  const [citationModal, setCitationModal] = useState<{
    isOpen: boolean;
    messageId?: string;
    initialGroupId?: string;
    groups: CitationGroup[];
  }>({ isOpen: false, groups: [] });

  const isCitationModalOpen =
    citationModal.isOpen &&
    (!citationModal.messageId || messages.some(m => m.id === citationModal.messageId));

  const openCitations = (messageId: string, initialGroupId: string, groups: CitationGroup[]) => {
    setCitationModal({
      isOpen: true,
      messageId,
      initialGroupId,
      groups,
    });
  };

  const closeCitations = () => {
    setCitationModal(prev => ({ ...prev, isOpen: false }));
  };

  const submitQuestion = (
    question: string,
    isRetry = false,
    overrideContext?: { conversationId?: string; zoneCode?: string },
  ) => {
    if (!question.trim() || busy || historyError) return;
    // Retrying an old question preserves what the user is currently typing in the input box
    if (!isRetry) {
      reset();
    }
    void sendQuestion(question, overrideContext);
  };

  return (
    <section
      aria-label={t('Cuộc trò chuyện với trợ lý AI')}
      className={`flex min-h-0 flex-col ${
        full
          ? 'h-full bg-white dark:bg-surface relative'
          : 'gap-3'
      }`}
    >
      {/* ─── Unified Responsive Header ─── */}
      {full && (
        <header
          data-testid="chat-header"
          className="border-b border-[#e2e8f0] dark:border-border bg-white dark:bg-surface px-4 md:px-6 py-2.5 lg:py-0 lg:h-14 flex flex-col lg:flex-row lg:items-center justify-between gap-2 shrink-0"
        >
          <div className="flex items-center justify-between w-full lg:w-auto min-w-0 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1 lg:flex-none">
              <h1 className="font-semibold text-[#0f172a] dark:text-text text-base shrink-0 whitespace-nowrap">
                {t('Trợ lý AI')}
              </h1>
              <span
                data-testid="chat-zone-badge"
                title={zoneDisplay}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-[#e2e8f0] dark:border-border text-slate-700 dark:text-slate-300 text-xs font-medium min-w-0 max-w-[120px] sm:max-w-[220px] shrink truncate ml-0.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#1f5ca9] lg:hidden shrink-0" />
                <span className="truncate">{zoneDisplay}</span>
              </span>
            </div>

            {/* Mobile-only action buttons: Lịch sử & Mới */}
            <div className="flex items-center gap-1 shrink-0 lg:hidden">
              {onOpenHistory && (
                <button
                  type="button"
                  onClick={onOpenHistory}
                  aria-label={t('Lịch sử')}
                  className="h-8 px-2 rounded-lg text-[#475569] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[17px]">history</span>
                  <span>{t('Lịch sử')}</span>
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={newConversation}
                aria-label={t('Mới')}
                className="h-8 px-2 rounded-lg border border-[#cbd5e1] dark:border-border bg-white dark:bg-surface text-[#1f5ca9] dark:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>{t('Mới')}</span>
              </button>
            </div>
          </div>

          {/* Right Side / Mobile Row 2: Actions & Toggle Context */}
          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
            {onToggleContext && (
              <button
                type="button"
                data-testid="toggle-context-rail-btn"
                onClick={onToggleContext}
                aria-label={isContextOpen ? t('Ẩn ngữ cảnh trạm đo') : t('Hiện ngữ cảnh trạm đo')}
                title={isContextOpen ? t('Ẩn ngữ cảnh trạm đo') : t('Hiện ngữ cảnh trạm đo')}
                className={`w-full lg:w-auto h-8 lg:h-auto px-2.5 py-1.5 rounded-lg lg:rounded-md border border-[#e2e8f0] dark:border-border flex items-center justify-between lg:justify-center gap-1.5 transition-colors font-medium text-xs cursor-pointer shrink-0 ${
                  isContextOpen
                    ? 'bg-sky-50 dark:bg-sky-950/40 text-[#1f5ca9] dark:text-sky-300 border-sky-200 dark:border-sky-800'
                    : 'bg-slate-50 lg:bg-transparent dark:bg-slate-800/60 lg:dark:bg-transparent text-[#0072a8] lg:text-[#475569] dark:text-sky-400 lg:dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#0072a8] dark:text-sky-400">dock_to_left</span>
                  <span>{t('Ngữ cảnh khu vực')}</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-slate-400 lg:hidden">chevron_right</span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* ─── Message Canvas ─── */}
      <div
        ref={list}
        role="log"
        aria-live="polite"
        aria-label={t('Tin nhắn')}
        className={`${
          full ? 'flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-5' : 'max-h-96 overflow-y-auto space-y-4'
        } [overflow-wrap:anywhere]`}
      >
        {isHistoryLoading && (
          <p role="status" className="animate-pulse text-sm text-gray text-center p-4">
            {t('Đang tải cuộc trò chuyện...')}
          </p>
        )}

        {historyError && (
          <div role="alert" className="rounded-xl border border-coral/30 bg-coral/10 p-4 text-sm text-coral">
            <p>{t(historyError)}</p>
            <button
              type="button"
              onClick={() => {
                if (conversationId) void openConversation(conversationId, zoneCode);
              }}
              className="mt-2 min-h-9 rounded-lg border border-coral/30 px-3 cursor-pointer font-medium"
            >
              {t('Thử lại')}
            </button>
          </div>
        )}

        {!isHistoryLoading && !historyError && messages.length === 0 && (
          <div className={`${full ? 'flex min-h-full flex-col justify-center' : 'rounded-xl bg-bg p-4'} text-center space-y-4`}>
            <div>
              <p className="text-sm font-semibold text-text">{t('Bạn muốn biết gì về khu vườn?')}</p>
              <p className="mt-1 text-xs text-gray">
                {t('Hỏi về độ ẩm đất, thời tiết hoặc các cảnh báo cần xử lý.')}
              </p>
            </div>
            {full && (
              <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                {SUGGESTIONS.map(question => (
                  <button
                    key={question}
                    type="button"
                    className="min-h-9 rounded-xl border border-[#cbd5e1] dark:border-border bg-slate-50 dark:bg-bg px-3 py-1.5 text-xs text-text hover:border-[#1f5ca9] dark:hover:border-sky-500 cursor-pointer transition-colors shadow-2xs"
                    onClick={() => {
                      setValue('question', t(question));
                      submitQuestion(t(question));
                    }}
                  >
                    {t(question)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {visibleMessages.map(message => {
          const user = message.role === 'user';
          const retryQuestion = message.retryQuestion;
          const isSystem = isSystemRefusal(message.modelUsed);
          const isInsufficientData = message.status === 'INSUFFICIENT_DATA';

          // Extract citations or use structured citations envelope if provided
          let cleanContent = message.content;
          let citations: CitationGroup[] = [];

          if (!user && !message.isError && !isSystem) {
            // Check if structured envelope is provided by backend
            if (message.citations !== undefined && message.citations !== null) {
              // F6: Strip any recognized technical citation footer (e.g. "Căn cứ đã xác minh:\n...")
              // while deriving verified identities exclusively from structured evidence
              cleanContent = stripCitationFooter(message.content);

              const env = message.citations as any;
              // F1: Validate supported envelope schemaVersion and complete groups before adapting:
              // - Must be a non-null object and NOT an array
              // - schemaVersion MUST be exact number 1 (rejects 999, absent, string "1", etc.)
              // - status MUST be VERIFIED_CONTEXT or LEGACY_REFERENCE (rejects NONE, INVALID, etc.)
              // - groups MUST be a non-empty array where EVERY group is a valid wire citation group
              // Fail conservatively on malformed structured evidence (produces citations = [])
              // Under NO circumstances do we fall through to extractCitations from prose when envelope exists!
              if (
                typeof env !== 'object' ||
                Array.isArray(env) ||
                typeof env.schemaVersion !== 'number' ||
                env.schemaVersion !== 1 ||
                (env.status !== 'VERIFIED_CONTEXT' && env.status !== 'LEGACY_REFERENCE') ||
                !Array.isArray(env.groups) ||
                env.groups.length === 0 ||
                !env.groups.every(isValidWireCitationGroup)
              ) {
                citations = [];
              } else {
                // F2: Map wire groups through adaptWireCitationGroup to ensure citationId and unique id
                const adapted = env.groups
                  .map((g: any, idx: number) => adaptWireCitationGroup(g, idx))
                  .filter((g: CitationGroup | null): g is CitationGroup => g !== null);
                citations = adapted;
              }
            } else {
              // Legacy plain-text mode without structured envelope
              const parsed = extractCitations(message.content);
              cleanContent = parsed.cleanContent;
              citations = parsed.citations;
            }
          }

          if (user) {
            return (
              <article
                key={message.id}
                data-chat-role="user"
                className="flex justify-end"
              >
                <div className="max-w-[85%] md:max-w-xl bg-[#eff4ff] dark:bg-sky-950/40 text-[#0f172a] dark:text-sky-100 text-[14px] leading-relaxed p-3.5 md:p-4 rounded-2xl rounded-tr-sm border border-[#dbeafe] dark:border-sky-800 shadow-2xs min-w-0">
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <div className="mt-1 text-right">
                    <time
                      dateTime={message.createdAt.toISOString()}
                      className="text-[10px] text-slate-400 dark:text-slate-500 font-mono"
                    >
                      {message.createdAt.toLocaleTimeString(getLocale(), {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                </div>
              </article>
            );
          }

          return (
            <article
              key={message.id}
              role={message.isError ? 'alert' : undefined}
              data-chat-role="assistant"
              data-chat-error={message.isError || undefined}
              data-chat-system={isSystem || undefined}
              data-chat-status={message.status || undefined}
              className="flex items-start gap-2.5 md:gap-3 max-w-[96%] md:max-w-2xl min-w-0"
            >
              {/* Bot Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm mt-0.5 ${
                  isSystem
                    ? 'bg-amber-600 text-white'
                    : 'bg-[#1f5ca9] text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isSystem ? 'shield' : 'psychology'}
                </span>
              </div>

              {/* Bot Response Card */}
              <div
                className={`border rounded-2xl rounded-tl-sm p-4 md:p-5 shadow-xs space-y-3 flex-1 min-w-0 ${
                  message.isError
                    ? 'border-coral/40 bg-coral/5 text-coral'
                    : isSystem
                    ? 'border-amber-300 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/20 text-text'
                    : 'bg-white dark:bg-surface border-[#e2e8f0] dark:border-border text-text'
                }`}
              >
                {/* Author & Timestamp */}
                <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9] dark:border-border/40">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`font-semibold text-xs ${
                        isSystem
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-[#1f5ca9] dark:text-sky-400'
                      }`}
                    >
                      {isSystem ? t('Hệ thống DuriCare') : 'DuriCare'}
                    </span>
                    {isSystem && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                        {t('Giới hạn xử lý')}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                      · {message.createdAt.toLocaleTimeString(getLocale(), {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* INSUFFICIENT_DATA Notice if returned by BE */}
                {isInsufficientData && (
                  <div
                    data-testid="insufficient-data-card"
                    className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1"
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-amber-600">info</span>
                      <span>{t('Dữ liệu chưa đủ điều kiện phân tích')}</span>
                    </div>
                    {message.insufficientDataInfo && (
                      <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80 space-y-0.5 pt-0.5">
                        {message.insufficientDataInfo.zoneCode && (
                          <div>{t('Khu vực')}: {message.insufficientDataInfo.zoneCode}</div>
                        )}
                        {message.insufficientDataInfo.dataPoints !== undefined && (
                          <div>{t('Số điểm đo hợp lệ')}: {message.insufficientDataInfo.dataPoints}</div>
                        )}
                        {(message.insufficientDataInfo.timeWindow || (message.insufficientDataInfo.windowStart && message.insufficientDataInfo.windowEnd)) && (
                          <div>
                            {t('Cửa sổ thời gian')}: {message.insufficientDataInfo.timeWindow || `${message.insufficientDataInfo.windowStart} - ${message.insufficientDataInfo.windowEnd}`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Content with GFM Markdown Table & Scrolling Wrapper */}
                <div className="text-[14px] leading-relaxed min-w-0">
                  <MarkdownContent content={message.isError ? t(message.content) : cleanContent} />
                </div>

                {/* Scientific Citations (Suppressed on System Refusal) */}
                {!isSystem && citations.length > 0 && (
                  <CitationChips
                    groups={citations}
                    supportLevel={message.citations?.supportLevel}
                    onSelectGroup={group => openCitations(message.id, group.citationId || group.id, citations)}
                  />
                )}

                {/* Footer Metadata */}
                <div className="text-[11px] text-slate-400 dark:text-slate-500 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#f8f9fa] dark:border-border/30">
                  {message.modelUsed && (
                    <span data-testid="agent-model-badge" title={message.modelUsed}>
                      {isSystem
                        ? t('Phản hồi hệ thống ({0})', [message.modelUsed])
                        : t('Trả lời bởi {0}', [modelProviderLabel(message.modelUsed)])}
                    </span>
                  )}
                  {!!message.toolsUsed?.length && (
                    <div aria-label={t('Công cụ đã dùng')} className="flex flex-wrap gap-1.5">
                      {Array.from(new Set(message.toolsUsed.map(tool => tool.name))).map(name => {
                        const calls = message.toolsUsed?.filter(tool => tool.name === name) ?? [];
                        const outcomes = Array.from(
                          new Set(
                            calls.map(tool =>
                              t(
                                tool.outcome === 'OK'
                                  ? 'Có dữ liệu'
                                  : tool.outcome === 'DENIED'
                                  ? 'Bị từ chối'
                                  : 'Không có dữ liệu',
                              ),
                            ),
                          ),
                        ).join(' · ');
                        return (
                          <span
                            key={name}
                            data-tool-name={name}
                            title={outcomes}
                            className="rounded-full border border-[#e2e8f0] dark:border-border bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-400 font-medium"
                          >
                            {t(TOOL_LABELS[name] ?? name)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Error Retry: Retrying preserves input in composer */}
                {message.isError && retryQuestion && (
                  <button
                    type="button"
                    data-testid="btn-retry-question"
                    disabled={busy}
                    onClick={() => submitQuestion(retryQuestion, true, message.retryContext)}
                    className="mt-2 min-h-9 rounded-lg border border-coral/30 px-3 text-xs font-semibold text-coral hover:bg-coral/10 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {t('Thử lại câu hỏi')}
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {isLoading && (
          <div role="status" className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 p-2">
            <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#1f5ca9] animate-pulse" />
            {t('Đang trả lời...')}
          </div>
        )}
      </div>

      {/* ─── Composer Form ─── */}
      <div className={`${full ? 'shrink-0 bg-white dark:bg-surface border-t border-[#e2e8f0] dark:border-border p-3 md:p-4' : ''}`}>
        <form
          onSubmit={handleSubmit(({ question }) => submitQuestion(question, false))}
          className="flex items-center gap-2 max-w-4xl mx-auto"
        >
          <div className="relative flex-1 min-w-0">
            <label htmlFor={inputId} className="sr-only">
              {t('Câu hỏi cho trợ lý AI')}
            </label>
            <input
              id={inputId}
              data-testid="input-chat-question"
              {...register('question', { required: true, validate: value => value.trim().length > 0 })}
              disabled={busy || !!historyError}
              maxLength={4000}
              placeholder={t('Nhập câu hỏi của bạn...')}
              autoComplete="off"
              className="w-full h-11 pl-4 pr-3 text-sm text-[#0f172a] dark:text-text bg-slate-50 dark:bg-bg border border-[#cbd5e1] dark:border-border rounded-xl focus:bg-white dark:focus:bg-surface focus:outline-none focus:ring-2 focus:ring-[#1f5ca9]/20 focus:border-[#1f5ca9] transition-all placeholder:text-slate-400 disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            data-testid="btn-send-question"
            disabled={busy || !!historyError}
            className="h-11 px-5 bg-[#1f5ca9] hover:bg-[#184a87] text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <span>{t('Gửi')}</span>
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </form>
      </div>

      {!full && (
        <Link
          to={`/agent${
            conversationId || zoneCode
              ? '?' +
                new URLSearchParams({
                  ...(conversationId ? { conversationId } : {}),
                  ...(zoneCode ? { zoneCode } : {}),
                }).toString()
              : ''
          }`}
          className="min-h-11 flex items-center justify-center gap-2 text-xs font-semibold text-[#1f5ca9] dark:text-sky-400 hover:underline"
        >
          {t('Mở rộng cuộc trò chuyện')}
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            open_in_full
          </span>
        </Link>
      )}

      <CitationDetailModal
        isOpen={isCitationModalOpen}
        onClose={closeCitations}
        groups={citationModal.groups}
        initialGroupId={citationModal.initialGroupId}
        conversationId={conversationId}
        messageId={citationModal.messageId}
      />
    </section>
  );
}
