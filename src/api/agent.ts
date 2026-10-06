import client from './client';
import type { AgentAskRequest, AgentAskResponse } from '../types/agent';
import { parseAgentAnswer } from '../utils/agentAnswer';

/**
 * POST /api/agent/ask
 * Sends a question to the backend Spring AI agent.
 * Tool selection can require several sequential LLM calls. Give this request
 * 90 seconds without changing the shared client's timeout for other APIs.
 */
export async function askAgent(question: string, signal?: AbortSignal): Promise<AgentAskResponse> {
  const response = await client.post<AgentAskResponse>(
    '/agent/ask',
    { question } satisfies AgentAskRequest,
    { timeout: 90000, signal },
  );
  return parseAgentAnswer(response.data);
}
