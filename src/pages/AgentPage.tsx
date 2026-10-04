import ChatPanel from '../components/ChatPanel';

export default function AgentPage() {
  return <div className="mx-auto max-w-4xl min-h-72 h-[calc(100dvh-14.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-[calc(100dvh-15.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-10rem)]">
    <ChatPanel variant="full" />
  </div>;
}
