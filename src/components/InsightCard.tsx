import { useState, type FormEvent } from 'react';
import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import type { LatestInsight } from '../types/overview';
import { formatTimeHHmm } from '../utils/metricLabels';

interface InsightCardProps {
  insight?: LatestInsight | null;
}

const DEFAULT_SUGGESTIONS = [
  'Khu C có cần tưới không?',
  'Độ ẩm đất so với ngưỡng?',
  'Lần tưới gần nhất?',
];

function sanitizeInsightText(raw: string): string {
  if (!raw) return '';
  // Strip raw debug metadata tags like [modelUsed=gemini-1.5-flash]
  let cleaned = raw.replace(/\[modelUsed=[^\]]*\]/gi, '');
  cleaned = cleaned.replace(/\[debug:[^\]]*\]/gi, '');
  // Strip citations markdown block if appended to message
  cleaned = cleaned.replace(/\n*Citations:[\s\S]*$/gi, '');
  cleaned = cleaned.replace(/\n*Nguồn trích dẫn:[\s\S]*$/gi, '');
  return cleaned.trim();
}

export default function InsightCard({ insight }: InsightCardProps) {
  useLanguage();
  const navigate = useNavigate();
  const { search } = useLocation();
  const farmId = new URLSearchParams(search).get('farmId');
  const [question, setQuestion] = useState('');

  const buildAgentUrl = (paramsObj: { zoneCode?: string | null; q?: string }) => {
    const qParams = new URLSearchParams();
    if (paramsObj.zoneCode) {
      qParams.set('zoneCode', paramsObj.zoneCode);
    }
    if (paramsObj.q) {
      qParams.set('q', paramsObj.q);
    }
    if (farmId) {
      qParams.set('farmId', farmId);
    }
    const qStr = qParams.toString();
    return qStr ? `/agent?${qStr}` : '/agent';
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    navigate(buildAgentUrl({ zoneCode: insight?.zoneCode, q: trimmed }));
  };

  const handleSuggestionClick = (prompt: string) => {
    setQuestion(prompt);
  };

  const cleanMessage = insight ? sanitizeInsightText(insight.message) : '';
  const timeDisplay = insight?.createdAt ? formatTimeHHmm(insight.createdAt) : '--:--';
  const targetAgentUrl = buildAgentUrl({ zoneCode: insight?.zoneCode });

  return (
    <section
      data-testid="ai-assistant-rail-card"
      className="bg-surface border border-border rounded-xl p-4 shadow-xs space-y-3.5"
    >
      {/* Header: Title & Subtitle */}
      <div className="flex items-center justify-between pb-2.5 border-b border-border/70">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#1F5CA9]/10 text-[#1F5CA9] dark:bg-[#60A5FA]/15 dark:text-[#60A5FA] flex items-center justify-center shrink-0">
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              psychology
            </span>
          </div>
          <h2 className="text-base font-semibold text-text">{t('Trợ lý AI')}</h2>
        </div>
        <span className="text-[11px] text-gray">{t('Gợi ý xem xét')}</span>
      </div>

      {/* Active Insight vs Empty Variant (Bounded Preview) */}
      {insight && cleanMessage ? (
        <div data-testid="ai-active-insight" className="space-y-2.5 my-1">
          <div className="p-3 rounded-lg bg-bg border border-border/80 text-sm text-text leading-relaxed">
            <div className="line-clamp-4">{cleanMessage}</div>
            <span className="text-[11px] text-gray block mt-2 pt-1 border-t border-border/60">
              {t('Căn cứ: cảm biến · thời tiết · ngưỡng giai đoạn')}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray pt-1">
            <span>{t('Cập nhật lúc')} {timeDisplay}</span>
            <Link
              to={targetAgentUrl}
              className="px-3 py-1.5 rounded-lg bg-[#0072A8] hover:bg-[#005F8C] text-white font-medium text-xs transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                forum
              </span>
              <span>{t('Mở trợ lý')}</span>
            </Link>
          </div>
        </div>
      ) : (
        <div
          data-testid="ai-empty-insight"
          className="py-5 px-3 rounded-lg bg-bg border border-dashed border-border flex flex-col items-center justify-center text-center gap-1.5"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-2xl text-gray">
            check_circle
          </span>
          <span className="text-xs text-gray font-medium">
            {t('Chưa có nhận định mới')}
          </span>
          <Link
            to="/agent"
            className="text-xs font-semibold text-[#0072A8] hover:underline mt-1"
          >
            {t('Trao đổi với Trợ lý AI')} →
          </Link>
        </div>
      )}

      {/* Suggestion Chips */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[11px] font-semibold text-gray uppercase tracking-wider block">
          {t('Gợi ý câu hỏi')}
        </span>
        <div className="flex flex-col gap-1.5">
          {DEFAULT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(t(suggestion))}
              className="w-full text-left px-3 py-2 rounded-lg bg-bg hover:bg-surface border border-border text-text text-xs font-medium transition-colors cursor-pointer"
            >
              {t(suggestion)}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Input Form */}
      <form onSubmit={handleSubmit} className="relative flex items-center pt-1">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('Hỏi trợ lý về vườn sầu riêng...')}
          className="w-full pl-3.5 pr-10 py-2 rounded-lg border border-border bg-bg focus:bg-surface text-text placeholder:text-gray text-xs focus:outline-hidden focus:ring-2 focus:ring-[#1F5CA9] transition-all"
        />
        <button
          type="submit"
          aria-label={t('Gửi câu hỏi')}
          className="absolute right-1.5 w-7 h-7 rounded-md bg-[#0072A8] hover:bg-[#005F8C] text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">send</span>
        </button>
      </form>
    </section>
  );
}
