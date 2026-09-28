import client from './client';
import type { AgentAskRequest, AgentAskResponse } from '../types/agent';

/**
 * POST /api/agent/ask
 * Sends a question to the backend Spring AI agent.
 * Timeout set to 30,000ms (30s) to handle LLM processing times.
 */
export async function askAgent(question: string): Promise<AgentAskResponse> {
  const response = await client.post<AgentAskResponse>(
    '/agent/ask',
    { question } satisfies AgentAskRequest,
    { timeout: 30000 },
  );
  return response.data;
}
