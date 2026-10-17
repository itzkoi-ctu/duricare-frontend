import type { User } from '../types/auth';

export function roleLanding(role: User['role']): string {
  return role === 'EXPERT' ? '/knowledge' : '/';
}

// Only accept app-relative destinations, including original query and fragment.
function intendedDestination(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('from' in state)) return null;
  const from = state.from;
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')
      || from.includes('\\') || [...from].some(char => char.charCodeAt(0) < 32)) return null;
  if (from.split(/[?#]/)[0] === '/login') return null;
  return from;
}

export function routeAllowed(path: string, role: User['role']): boolean {
  const pathname = path.split(/[?#]/)[0];
  if (role === 'EXPERT') return pathname === '/knowledge' || pathname === '/knowledge/';
  if (pathname === '/knowledge' || pathname.startsWith('/knowledge/')) return false;
  if (pathname.startsWith('/settings/')) return role === 'ADMIN';
  return true;
}

export function loginRedirect(state: unknown, role: User['role']) {
  const intended = intendedDestination(state);
  const denied = intended !== null && !routeAllowed(intended, role);
  return {
    to: intended && !denied ? intended : roleLanding(role),
    state: denied ? { authNotice: 'forbidden' } : null,
  };
}

export function loginDestination(state: unknown, role: User['role'] = 'ADMIN'): string {
  return loginRedirect(state, role).to;
}

export function hasForbiddenNotice(state: unknown): boolean {
  return !!state && typeof state === 'object' && 'authNotice' in state
    && state.authNotice === 'forbidden';
}
