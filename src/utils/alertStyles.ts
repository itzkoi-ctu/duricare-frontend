import type { AlertSource } from '../types/alert';

export function alertSourceClasses(source: AlertSource): string {
  return source === 'AGENTIC'
    ? 'bg-gradient-to-r from-coral to-amber text-white ring-1 ring-amber/50'
    : 'bg-coral text-white';
}

export function alertSeverityClasses(severity: string): string {
  if (severity === 'CRITICAL') return 'bg-coral/15 text-coral border-coral/30';
  if (severity === 'WARNING') return 'bg-amber/15 text-amber border-amber/30';
  return 'bg-gray/15 text-gray border-gray/30';
}
