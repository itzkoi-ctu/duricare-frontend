// References to AuthProvider's state operations only; this module never stores a token/user.
export interface AuthSessionBridge {
  getAccessToken: () => string | null;
  replaceAccessToken: (token: string, expectedToken: string) => boolean;
  invalidate: (expectedToken: string) => void;
}

let current: AuthSessionBridge | null = null;
export function bindAuthSession(bridge: AuthSessionBridge): () => void {
  current = bridge;
  return () => { if (current === bridge) current = null; };
}
export function getAuthSessionBridge(): AuthSessionBridge | null { return current; }
export function getAccessToken(): string | null { return current?.getAccessToken() ?? null; }
