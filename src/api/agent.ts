import client from './client';
import type { AgentAskRequest, AgentAskResponse, AgentConversation, AgentStoredMessage } from '../types/agent';
import { parseAgentAnswer } from '../utils/agentAnswer';

/**
 * POST /api/agent/ask
 * Sends a question to the backend Spring AI agent.
 * Tool selection can require several sequential LLM calls. Give this request
 * 90 seconds without changing the shared client's timeout for other APIs.
 */
export async function askAgent(question: string, signal?: AbortSignal,
  context: Pick<AgentAskRequest, 'conversationId' | 'zoneCode'> = {}): Promise<AgentAskResponse> {
  const response = await client.post<AgentAskResponse>(
    '/agent/ask',
    { question, ...context } satisfies AgentAskRequest,
    { timeout: 90000, signal },
  );
  return parseAgentAnswer(response.data);
}

export async function getConversations(signal?: AbortSignal): Promise<AgentConversation[]> {
  return (await client.get<AgentConversation[]>('/agent/conversations', { signal })).data;
}

export async function getConversationMessages(id: string, signal?: AbortSignal): Promise<AgentStoredMessage[]> {
  return (await client.get<AgentStoredMessage[]>(`/agent/conversations/${encodeURIComponent(id)}/messages`, { signal })).data;
}

export async function deleteConversation(id: string): Promise<void> {
  await client.delete(`/agent/conversations/${encodeURIComponent(id)}`);
}
