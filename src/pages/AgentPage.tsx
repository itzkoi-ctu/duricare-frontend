import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import ReactMarkdown from 'react-markdown';
import { askAgent } from '../api/agent';
import type { ChatMessage } from '../types/agent';

interface FormValues {
  question: string;
}

const SUGGESTED_QUESTIONS = [
  'Độ ẩm đất của ZONE-02 hiện tại là bao nhiêu?',
  'Tổng quan các vùng đang có cảnh báo?',
  'Tình trạng nhiệt độ tại Khu A như thế nào?',
];

export default function AgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'agent',
      content:
        'Xin chào! Tôi là trợ lý thông minh **DuriCare AI**. Bạn có thể hỏi tôi về thông số cảm biến, tình trạng đất, nhiệt độ, hoặc gợi ý chăm sóc sầu riêng theo từng vùng.',
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { question: '' },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const onSubmit = async (values: FormValues) => {
    const q = values.question.trim();
    if (!q || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      content: q,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    reset();
    setLoading(true);

    try {
      const res = await askAgent(q);
      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        content: res.answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      let errorText = 'Có lỗi xảy ra khi kết nối với DuriCare Agent.';
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorText =
          '⏱️ Yêu cầu phản hồi từ AI vượt quá thời gian cho phép (timeout 30s). Vui lòng kiểm tra kết nối hoặc thử lại.';
      } else if (err.response?.data?.message) {
        errorText = `Lỗi hệ thống: ${err.response.data.message}`;
      }

      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'agent',
        content: errorText,
        timestamp: new Date(),
        status: 'error',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (q: string) => {
    setValue('question', q);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-navy/10 border border-navy/20 flex items-center justify-center text-xl">
            🤖
          </div>
          <div>
            <h1 className="text-xl font-bold text-text">DuriCare AI Assistant</h1>
            <p className="text-xs text-gray">
              Trợ lý ảo phân tích dữ liệu cảm biến & cảnh báo nông nghiệp
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal/10 text-teal border border-teal/20">
          <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
          Sẵn sàng
        </span>
      </div>

      {/* Chat Messages List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                isUser ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${
                  isUser
                    ? 'bg-navy text-white'
                    : 'bg-surface border border-border text-navy'
                }`}
              >
                {isUser ? '👤' : '🤖'}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-navy text-white rounded-tr-none'
                    : msg.status === 'error'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-tl-none'
                    : 'bg-surface text-text border border-border rounded-tl-none'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}

                <div
                  className={`text-[10px] mt-2 text-right ${
                    isUser ? 'text-white/70' : 'text-gray'
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-surface border border-border flex items-center justify-center text-sm">
              🤖
            </div>
            <div className="bg-surface border border-border rounded-2xl rounded-tl-none p-4 text-sm text-gray flex items-center gap-3 shadow-sm">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-navy/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-navy/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-navy/60 rounded-full animate-bounce" />
              </div>
              <span className="text-xs italic">Agent đang suy nghĩ & truy vấn dữ liệu...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions */}
      {messages.length <= 2 && !loading && (
        <div className="py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs text-gray font-medium whitespace-nowrap">
            💡 Gợi ý:
          </span>
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(q)}
              className="px-3 py-1.5 rounded-full text-xs bg-surface border border-border
                         text-text hover:border-navy/40 hover:bg-navy/5 transition-all
                         whitespace-nowrap cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="pt-3 border-t border-border flex items-center gap-2"
      >
        <input
          {...register('question', { required: true })}
          disabled={loading || isSubmitting}
          type="text"
          placeholder="Hỏi DuriCare Agent về nhiệt độ, độ ẩm, đất, hoặc rủi ro..."
          className="flex-1 px-4 py-3 text-sm rounded-2xl border border-border bg-surface text-text
                     placeholder:text-gray/70 focus:outline-none focus:ring-2 focus:ring-navy/30
                     disabled:opacity-60 transition-all"
        />

        <button
          type="submit"
          disabled={loading || isSubmitting}
          className="px-5 py-3 rounded-2xl bg-navy text-white font-medium text-sm
                     hover:bg-blue transition-colors disabled:opacity-50
                     flex items-center gap-1.5 cursor-pointer shadow-sm flex-shrink-0"
        >
          <span>Gửi</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}
