import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatPanelView } from '../components/ChatPanel';
import AgentConversationList from '../components/AgentConversationList';
import AgentConversationSheet from '../components/AgentConversationSheet';
import AgentIoTContextRail from '../components/agent/AgentIoTContextRail';
import AgentIoTContextSheet from '../components/agent/AgentIoTContextSheet';
import useAgentChat from '../hooks/useAgentChat';
import useAgentConversations from '../hooks/useAgentConversations';
import type { AgentConversation } from '../types/agent';

export default function AgentPage() {
  const [params] = useSearchParams();
  const zoneCode = params.get('zoneCode') || params.get('zone') || undefined;
  const conversationId = params.get('conversationId') || undefined;
  return <AgentPageContent key={`${zoneCode ?? ''}:${conversationId ?? ''}`} zoneCode={zoneCode} initialId={conversationId} />;
}

function AgentPageContent({ zoneCode, initialId }: { zoneCode?: string; initialId?: string }) {
  const chat = useAgentChat({ zoneCode, conversationId: initialId });
  const history = useAgentConversations(chat.savedVersion);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('duricare_agent_context_open') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleContextRail = () => {
    setIsContextOpen(prev => {
      const next = !prev;
      try {
        localStorage.setItem('duricare_agent_context_open', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

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

  const handleSelectZone = (newZoneCode: string) => {
    if (busy) return;
    if (chat.conversationId) {
      void chat.openConversation(chat.conversationId, newZoneCode);
    } else {
      void chat.openConversation('', newZoneCode);
    }
  };

  const list = (
    <AgentConversationList
      conversations={history.conversations}
      activeId={chat.conversationId}
      loading={history.loading}
      error={history.error}
      deleteError={history.deleteError}
      deletingId={history.deletingId}
      disabled={chat.isLoading || chat.isHistoryLoading}
      onSelect={select}
      onDelete={remove}
      onRetry={() => void history.refresh()}
      onNew={chat.newConversation}
    />
  );

  return (
    <div
      className={`mx-auto grid max-w-[1600px] min-h-72 h-[calc(100dvh-14.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-[calc(100dvh-15.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-10rem)] ${
        isContextOpen
          ? 'lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_21rem]'
          : 'lg:grid-cols-[15rem_minmax(0,1fr)]'
      } lg:gap-4`}
    >
      {/* Column 1: Conversation History */}
      <aside className="hidden min-h-0 overflow-hidden rounded-2xl border border-[#e2e8f0] dark:border-border bg-white dark:bg-surface shadow-xs lg:block">
        {list}
      </aside>

      {/* Column 2: Central Chat Stream */}
      <div className="min-h-0 min-w-0 overflow-hidden rounded-2xl border border-[#e2e8f0] dark:border-border bg-white dark:bg-surface shadow-xs">
        <ChatPanelView
          key={chat.conversationId ?? 'new'}
          variant="full"
          chat={chat}
          disabled={history.deletingId !== null}
          onOpenHistory={() => setSheetOpen(true)}
          onToggleContext={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 1280) {
              setMobileContextOpen(true);
            } else {
              toggleContextRail();
            }
          }}
          isContextOpen={isContextOpen}
        />
      </div>

      {/* Column 3: Realtime IoT Live Context Rail (Desktop xl+) */}
      {isContextOpen && (
        <aside
          data-testid="desktop-agent-iot-context-aside"
          className="hidden min-h-0 overflow-hidden rounded-2xl border border-[#e2e8f0] dark:border-border bg-[#f8f9ff] dark:bg-bg shadow-xs xl:flex xl:flex-col"
        >
          <AgentIoTContextRail zoneCode={chat.zoneCode} onSelectZone={handleSelectZone} />
        </aside>
      )}

      {/* Mobile / Tablet History Drawer */}
      <AgentConversationSheet open={sheetOpen} onClose={closeSheet}>
        {list}
      </AgentConversationSheet>

      {/* Mobile / Tablet IoT Context Drawer */}
      {mobileContextOpen && (
        <AgentIoTContextSheet open={mobileContextOpen} onClose={() => setMobileContextOpen(false)}>
          <AgentIoTContextRail
            zoneCode={chat.zoneCode}
            onSelectZone={handleSelectZone}
            onClose={() => setMobileContextOpen(false)}
            isDrawer
          />
        </AgentIoTContextSheet>
      )}
    </div>
  );
}
