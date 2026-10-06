import type { AgentAskResponse } from '../types/agent';

export function parseAgentAnswer(response: AgentAskResponse): AgentAskResponse {
  const prefix = response.answer.match(/^\[modelUsed=([^\]]+)\]\s*/);
  return { ...response, answer: prefix ? response.answer.slice(prefix[0].length) : response.answer,
    modelUsed: prefix?.[1] ?? response.modelUsed };
}

export function modelProviderLabel(modelUsed: string): string {
  const name = modelUsed.toLowerCase();
  if (name.includes('gemini')) return 'Gemini';
  if (name.includes('deepseek')) return 'DeepSeek';
  return modelUsed;
}
