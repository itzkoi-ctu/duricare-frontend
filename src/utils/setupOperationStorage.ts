import type { SetupOperationKind, StoredSetupOperation } from '../types/setupOperation';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function generateOperationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().toLowerCase();
  }
  // Fallback UUID v4 generator
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC4122
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`.toLowerCase();
}

export function isValidOperationId(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_V4_REGEX.test(id.toLowerCase());
}

function getStorageKey(actorId: number, kind: SetupOperationKind): string {
  return `duricare_setup_op_${actorId}_${kind}`;
}

export function saveStoredOperation(op: StoredSetupOperation): boolean {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    // CRITICAL: Ensure password or sensitive credential is NEVER stored
    const sanitizedDraft = { ...op.draft };
    delete (sanitizedDraft as Record<string, unknown>).initialPassword;
    delete (sanitizedDraft as Record<string, unknown>).password;
    delete (sanitizedDraft as Record<string, unknown>).retryPassword;

    const sanitizedOp: StoredSetupOperation = {
      ...op,
      draft: sanitizedDraft,
      updatedAt: new Date().toISOString(),
    };
    const key = getStorageKey(op.actorId, op.kind);
    sessionStorage.setItem(key, JSON.stringify(sanitizedOp));
    return true;
  } catch {
    // SessionStorage may be restricted, disabled or quota exceeded; do NOT swallow silently
    return false;
  }
}

export function getStoredOperation(actorId: number, kind: SetupOperationKind): StoredSetupOperation | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const key = getStorageKey(actorId, kind);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSetupOperation;
    if (parsed.version === 1 && parsed.actorId === actorId && parsed.kind === kind && isValidOperationId(parsed.operationId)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearStoredOperation(actorId: number, kind: SetupOperationKind): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    const key = getStorageKey(actorId, kind);
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage errors on clear
  }
}

export function clearAllStoredOperationsForActor(actorId: number): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    clearStoredOperation(actorId, 'FARM_CREATE');
    clearStoredOperation(actorId, 'FARM_CREATE_INLINE');
    clearStoredOperation(actorId, 'OWNER_CREATE');
  } catch {
    // Ignore storage errors
  }
}
