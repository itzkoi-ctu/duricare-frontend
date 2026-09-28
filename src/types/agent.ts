export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  errorMessage?: string;
}

export interface AgentAskRequest {
  question: string;
}

export interface AgentAskResponse {
  answer: string;
}
