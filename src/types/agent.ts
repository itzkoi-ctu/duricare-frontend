export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  modelUsed?: string;
  isError?: boolean;
  retryQuestion?: string;
  toolsUsed?: ToolInvocation[];
}

export interface AgentAskRequest {
  question: string;
  conversationId?: string;
  zoneCode?: string;
}

export interface AgentAskResponse {
  answer: string;
  modelUsed?: string;
  conversationId?: string;
  toolsUsed?: ToolInvocation[];
}

export interface ToolInvocation {
  name: string;
  arguments: Record<string, string | number | null>;
  outcome: 'OK' | 'DENIED' | 'EMPTY';
}

export interface AgentConversation {
  id: string;
  zoneCode: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentStoredMessage {
  id: number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  modelUsed: string | null;
  toolsUsed: ToolInvocation[];
  latencyMs: number | null;
  createdAt: string;
}

export interface ChatFormValues { question: string }
