export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  modelUsed?: string;
  isError?: boolean;
  retryQuestion?: string;
}

export interface AgentAskRequest {
  question: string;
}

export interface AgentAskResponse {
  answer: string;
  modelUsed?: string;
}

export interface ChatFormValues { question: string }
