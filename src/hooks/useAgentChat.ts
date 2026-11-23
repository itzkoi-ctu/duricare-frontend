import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { askAgent, getConversationMessages } from '../api/agent';
import { parseAgentAnswer } from '../utils/agentAnswer';
import type { ChatMessage } from '../types/agent';

export const ERROR_MESSAGE = 'Xin lỗi, không thể lấy câu trả lời lúc này. Vui lòng thử lại.';
export const TIMEOUT_MESSAGE = 'Câu hỏi vượt quá thời gian chờ. Vui lòng đợi một lúc rồi thử lại.';
export const RATE_MESSAGE = 'Bạn đã gửi quá nhiều câu hỏi. Vui lòng chờ một phút rồi thử lại.';
export const SERVICE_UNAVAILABLE_MESSAGE = 'Dịch vụ đang quá tải hoặc bảo trì. Vui lòng thử lại sau giây lát.';
export const NETWORK_ERROR_MESSAGE = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.';

export default function useAgentChat({
  zoneCode: initialZone,
  conversationId: initialId,
}: {
  zoneCode?: string;
  conversationId?: string;
} = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(initialId);
  const [zoneCode, setZoneCode] = useState<string | undefined>(initialZone);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(!!initialId);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedVersion, setSavedVersion] = useState(0);

  const request = useRef<AbortController | null>(null);
  const isSubmittingRef = useRef(false);

  // Live refs to track active conversation and zone across async turns
  const currentConversationIdRef = useRef(conversationId);
  const currentZoneCodeRef = useRef(zoneCode);
  useEffect(() => {
    currentConversationIdRef.current = conversationId;
    currentZoneCodeRef.current = zoneCode;
  }, [conversationId, zoneCode]);

  const openConversation = useCallback(async (id: string, zone?: string | null) => {
    // Abort any existing in-flight question before loading a new conversation
    if (request.current) {
      request.current.abort();
      request.current = null;
    }
    isSubmittingRef.current = false;
    setIsLoading(false);

    const controller = new AbortController();
    request.current = controller;
    setConversationId(id);
    setZoneCode(zone ?? undefined);
    setMessages([]);
    setError(null);
    setHistoryError(null);
    setIsHistoryLoading(true);

    try {
      const stored = await getConversationMessages(id, controller.signal);
      if (controller.signal.aborted) return;
      setMessages(
        stored.map(message => {
          const answer = parseAgentAnswer({
            answer: message.content,
            modelUsed: message.modelUsed ?? undefined,
            status: message.status,
            insufficientDataInfo: message.insufficientDataInfo,
            citations: message.citations,
          });
          return {
            id: String(message.id),
            role: message.role === 'USER' ? 'user' : 'assistant',
            content: message.role === 'USER' ? message.content : answer.answer,
            modelUsed: answer.modelUsed,
            toolsUsed: message.toolsUsed,
            createdAt: new Date(message.createdAt),
            status: message.status,
            insufficientDataInfo: message.insufficientDataInfo,
            citations: message.citations,
          };
        }),
      );
    } catch {
      if (!controller.signal.aborted) {
        setHistoryError('Không thể tải cuộc trò chuyện. Vui lòng thử lại.');
      }
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active && initialId) void openConversation(initialId, initialZone);
    });
    return () => {
      active = false;
      request.current?.abort();
      request.current = null;
      isSubmittingRef.current = false;
      setIsLoading(false);
    };
  }, [initialId, initialZone, openConversation]);

  const newConversation = useCallback(() => {
    if (request.current) {
      request.current.abort();
      request.current = null;
    }
    isSubmittingRef.current = false;
    setIsLoading(false);
    setConversationId(undefined);
    setZoneCode(initialZone);
    setMessages([]);
    setError(null);
    setHistoryError(null);
  }, [initialZone]);

  const sendQuestion = useCallback(
    async (
      question: string,
      overrideContext?: { conversationId?: string; zoneCode?: string },
    ): Promise<void> => {
      const content = question.trim();
      // Guard against blank input, concurrent/double submissions, or blocked history error
      if (!content || isSubmittingRef.current || request.current || historyError) return;

      isSubmittingRef.current = true;
      const controller = new AbortController();
      request.current = controller;

      const targetConversationId =
        overrideContext && overrideContext.conversationId !== undefined
          ? overrideContext.conversationId
          : currentConversationIdRef.current;
      const targetZoneCode =
        overrideContext && overrideContext.zoneCode !== undefined
          ? overrideContext.zoneCode
          : currentZoneCodeRef.current;

      setMessages(previous => [
        ...previous,
        { id: crypto.randomUUID(), role: 'user', content, createdAt: new Date() },
      ]);
      setError(null);
      setIsLoading(true);

      try {
        const reply = await askAgent(content, controller.signal, {
          conversationId: targetConversationId,
          zoneCode: targetZoneCode,
        });

        // Guard: Discard late response if request was aborted or conversation switched in-flight
        if (
          !controller.signal.aborted &&
          currentConversationIdRef.current === targetConversationId
        ) {
          if (reply.conversationId) {
            setConversationId(reply.conversationId);
          }
          setMessages(previous => [
            ...previous,
            {
              id: reply.messageId ? String(reply.messageId) : crypto.randomUUID(),
              role: 'assistant',
              content: reply.answer,
              modelUsed: reply.modelUsed,
              toolsUsed: reply.toolsUsed ?? [],
              createdAt: new Date(),
              status: reply.status,
              insufficientDataInfo: reply.insufficientDataInfo,
              citations: reply.citations,
            },
          ]);
          setSavedVersion(previous => previous + 1);
        }
      } catch (cause: unknown) {
        if (
          !controller.signal.aborted &&
          currentConversationIdRef.current === targetConversationId
        ) {
          let errorType: '503' | 'timeout' | 'network' | 'rate' | 'general' = 'general';
          let message = ERROR_MESSAGE;

          if (axios.isAxiosError(cause)) {
            const status = cause.response?.status;
            const code = cause.code ?? '';
            const msg = (cause.message || '').toLowerCase();

            if (status === 503) {
              errorType = '503';
              message = SERVICE_UNAVAILABLE_MESSAGE;
            } else if (status === 429) {
              errorType = 'rate';
              message = RATE_MESSAGE;
            } else if (
              ['ECONNABORTED', 'ETIMEDOUT'].includes(code) ||
              msg.includes('timeout')
            ) {
              errorType = 'timeout';
              message = TIMEOUT_MESSAGE;
            } else if (!cause.response && (cause.message === 'Network Error' || code === 'ERR_NETWORK')) {
              errorType = 'network';
              message = NETWORK_ERROR_MESSAGE;
            }
          }

          setError(message);
          setMessages(previous => [
            ...previous,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: message,
              createdAt: new Date(),
              isError: true,
              errorType,
              retryQuestion: content,
              retryContext: {
                conversationId: targetConversationId,
                zoneCode: targetZoneCode,
              },
            },
          ]);
        }
      } finally {
        if (request.current === controller) {
          request.current = null;
          isSubmittingRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [historyError],
  );

  return {
    messages,
    conversationId,
    zoneCode,
    sendQuestion,
    newConversation,
    openConversation,
    isLoading,
    isHistoryLoading,
    historyError,
    error,
    savedVersion,
  };
}

export type AgentChatState = ReturnType<typeof useAgentChat>;
