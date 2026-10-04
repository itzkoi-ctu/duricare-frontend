// Only accept app-relative destinations, including the original query and fragment.
export function loginDestination(state: unknown): string {
  if (!state || typeof state !== 'object' || !('from' in state)) return '/';
  const from = state.from;
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')
      || from.includes('\\') || [...from].some(char => char.charCodeAt(0) < 32)) return '/';
  if (from.split(/[?#]/)[0] === '/login') return '/';
  return from;
}

export function hasForbiddenNotice(state: unknown): boolean {
  return !!state && typeof state === 'object' && 'authNotice' in state
    && state.authNotice === 'forbidden';
}
