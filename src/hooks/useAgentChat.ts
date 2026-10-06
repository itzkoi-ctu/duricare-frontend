import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { askAgent, getConversationMessages } from '../api/agent';
import { parseAgentAnswer } from '../utils/agentAnswer';
import type { ChatMessage } from '../types/agent';

const ERROR_MESSAGE = 'Xin lỗi, không thể lấy câu trả lời lúc này. Vui lòng thử lại.';
const TIMEOUT_MESSAGE = 'Câu hỏi vượt quá thời gian chờ. Vui lòng đợi một lúc rồi thử lại.';
const RATE_MESSAGE = 'Bạn đã gửi quá nhiều câu hỏi. Vui lòng chờ một phút rồi thử lại.';

export default function useAgentChat({ zoneCode: initialZone, conversationId: initialId }: {
  zoneCode?: string; conversationId?: string;
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

  const openConversation = useCallback(async (id: string, zone?: string | null) => {
    if (request.current) return;
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
      setMessages(stored.map(message => {
        const answer = parseAgentAnswer({ answer: message.content, modelUsed: message.modelUsed ?? undefined });
        return { id: String(message.id), role: message.role === 'USER' ? 'user' : 'assistant',
          content: message.role === 'USER' ? message.content : answer.answer, modelUsed: answer.modelUsed,
          toolsUsed: message.toolsUsed, createdAt: new Date(message.createdAt) };
      }));
    } catch {
      if (!controller.signal.aborted) setHistoryError('Không thể tải cuộc trò chuyện. Vui lòng thử lại.');
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    // Skip the discarded StrictMode mount before starting a history request.
    queueMicrotask(() => { if (active && initialId) void openConversation(initialId, initialZone); });
    return () => { active = false; request.current?.abort(); request.current = null; };
  }, [initialId, initialZone, openConversation]);

  const newConversation = useCallback(() => {
    if (request.current) return;
    setConversationId(undefined);
    setZoneCode(initialZone);
    setMessages([]);
    setError(null);
    setHistoryError(null);
  }, [initialZone]);

  const sendQuestion = useCallback(async (question: string): Promise<void> => {
    const content = question.trim();
    if (!content || request.current || historyError) return;
    const controller = new AbortController();
    request.current = controller;
    setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'user', content, createdAt: new Date() }]);
    setError(null);
    setIsLoading(true);
    try {
      const reply = await askAgent(content, controller.signal, { conversationId, zoneCode });
      if (!controller.signal.aborted) {
        setConversationId(reply.conversationId ?? conversationId);
        setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', content: reply.answer,
          modelUsed: reply.modelUsed, toolsUsed: reply.toolsUsed ?? [], createdAt: new Date() }]);
        setSavedVersion(previous => previous + 1);
      }
    } catch (cause: unknown) {
      if (!controller.signal.aborted) {
        const message = axios.isAxiosError(cause) && cause.response?.status === 429 ? RATE_MESSAGE
          : axios.isAxiosError(cause) && ['ECONNABORTED', 'ETIMEDOUT'].includes(cause.code ?? '') ? TIMEOUT_MESSAGE : ERROR_MESSAGE;
        setError(message);
        setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', content: message,
          createdAt: new Date(), isError: true, retryQuestion: content }]);
      }
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [conversationId, zoneCode, historyError]);
  return { messages, conversationId, zoneCode, sendQuestion, newConversation, openConversation,
    isLoading, isHistoryLoading, historyError, error, savedVersion };
}

export type AgentChatState = ReturnType<typeof useAgentChat>;
