import { useCallback, useEffect, useRef, useState } from 'react';
import { askAgent } from '../api/agent';
import type { ChatMessage } from '../types/agent';

const ERROR_MESSAGE = 'Xin lỗi, không thể lấy câu trả lời lúc này. Vui lòng thử lại.';

export default function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); }, []);
  const sendQuestion = useCallback(async (question: string): Promise<void> => {
    const content = question.trim();
    if (!content || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'user', content, createdAt: new Date() }]);
    setError(null);
    setIsLoading(true);
    try {
      const reply = await askAgent(content, controller.signal);
      if (!controller.signal.aborted) setMessages(previous => [...previous, {
        id: crypto.randomUUID(), role: 'assistant', content: reply.answer,
        modelUsed: reply.modelUsed, createdAt: new Date(),
      }]);
    } catch {
      if (!controller.signal.aborted) {
        setError(ERROR_MESSAGE);
        setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', content: ERROR_MESSAGE,
          createdAt: new Date(), isError: true, retryQuestion: content }]);
      }
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);
  return { messages, sendQuestion, isLoading, error };
}
