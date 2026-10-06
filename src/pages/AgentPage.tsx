import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatPanelView } from '../components/ChatPanel';
import AgentConversationList from '../components/AgentConversationList';
import AgentConversationSheet from '../components/AgentConversationSheet';
import useAgentChat from '../hooks/useAgentChat';
import useAgentConversations from '../hooks/useAgentConversations';
import type { AgentConversation } from '../types/agent';

export default function AgentPage() {
  const [params] = useSearchParams();
  const zoneCode = params.get('zoneCode') || undefined;
  const conversationId = params.get('conversationId') || undefined;
  return <AgentPageContent key={`${zoneCode ?? ''}:${conversationId ?? ''}`} zoneCode={zoneCode} initialId={conversationId} />;
}

function AgentPageContent({ zoneCode, initialId }: { zoneCode?: string; initialId?: string }) {
  const chat = useAgentChat({ zoneCode, conversationId: initialId });
  const history = useAgentConversations(chat.savedVersion);
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const busy = chat.isLoading || chat.isHistoryLoading || history.deletingId !== null;
  const select = (conversation: AgentConversation) => {
    if (busy) return;
    void chat.openConversation(conversation.id, conversation.zoneCode);
    closeSheet();
  };
  const remove = async (id: string) => {
    if (chat.isLoading || chat.isHistoryLoading) return false;
    const success = await history.remove(id);
    if (success && chat.conversationId === id) chat.newConversation();
    return success;
  };
  const list = <AgentConversationList conversations={history.conversations} activeId={chat.conversationId}
    loading={history.loading} error={history.error} deleteError={history.deleteError} deletingId={history.deletingId}
    disabled={chat.isLoading || chat.isHistoryLoading} onSelect={select} onDelete={remove} onRetry={() => void history.refresh()} />;
  return <div className="mx-auto grid max-w-6xl min-h-72 h-[calc(100dvh-14.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-[calc(100dvh-15.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-10rem)] lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-4">
    <aside className="hidden min-h-0 overflow-hidden rounded-2xl border border-border bg-surface lg:block">{list}</aside>
    <div className="min-h-0 min-w-0"><ChatPanelView key={chat.conversationId ?? 'new'} variant="full" chat={chat} disabled={history.deletingId !== null} onOpenHistory={() => setSheetOpen(true)} /></div>
    <AgentConversationSheet open={sheetOpen} onClose={closeSheet}>{list}</AgentConversationSheet>
  </div>;
}
