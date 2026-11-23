import type { StructuredCitationsEnvelope } from './citation';

export interface InsufficientDataInfo {
  reason?: string;
  dataPoints?: number;
  windowStart?: string;
  windowEnd?: string;
  timeWindow?: string;
  zoneCode?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  modelUsed?: string;
  isError?: boolean;
  errorType?: '503' | 'timeout' | 'network' | 'rate' | 'general';
  retryQuestion?: string;
  retryContext?: { conversationId?: string; zoneCode?: string };
  toolsUsed?: ToolInvocation[];
  status?: string;
  insufficientDataInfo?: InsufficientDataInfo;
  citations?: StructuredCitationsEnvelope;
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
  messageId?: number | null;
  status?: string;
  insufficientDataInfo?: InsufficientDataInfo;
  toolsUsed?: ToolInvocation[];
  citations?: StructuredCitationsEnvelope;
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
  status?: string;
  insufficientDataInfo?: InsufficientDataInfo;
  citations?: StructuredCitationsEnvelope;
}

export interface ChatFormValues {
  question: string;
}
