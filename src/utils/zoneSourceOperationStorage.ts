import {
  isValidPositiveDecimalId,
  type DecimalId,
  type RetainedNodeMetadata,
  type StoredPendingZoneSourceOperation,
} from '../types/zoneSource';
import { isValidUuidV4 } from './zoneSourceValidation';

const STORAGE_PREFIX = 'duricare_zs_op_v1_';
const RETAINED_NODE_PREFIX = 'duricare_zs_node_v1_';

const SENSITIVE_KEYS = new Set([
  'password',
  'initialPassword',
  'retryPassword',
  'accessToken',
  'refreshToken',
  'token',
  'secret',
  'credential',
  'configRef',
  'authorization',
]);

function stripSensitiveDeep<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(item => stripSensitiveDeep(item)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) continue;
    out[k] = stripSensitiveDeep(v);
  }
  return out as T;
}

function getPendingKey(actorId: DecimalId, zoneCode: string): string {
  return `${STORAGE_PREFIX}${actorId}_${zoneCode}`;
}

function getRetainedNodeKey(actorId: DecimalId, zoneCode: string): string {
  return `${RETAINED_NODE_PREFIX}${actorId}_${zoneCode}`;
}

export function generateZoneSourceOperationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().toLowerCase();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`.toLowerCase();
}

export function savePendingZoneSourceOperation(
  record: StoredPendingZoneSourceOperation
): { ok: boolean; error?: 'STORAGE_UNAVAILABLE' } {
  try {
    if (typeof sessionStorage === 'undefined') {
      return { ok: false, error: 'STORAGE_UNAVAILABLE' };
    }
    const sanitized = stripSensitiveDeep({
      ...record,
      updatedAt: new Date().toISOString(),
    });
    sessionStorage.setItem(getPendingKey(record.actorId, record.zoneCode), JSON.stringify(sanitized));
    return { ok: true };
  } catch {
    return { ok: false, error: 'STORAGE_UNAVAILABLE' };
  }
}

export function getPendingZoneSourceOperation(
  actorId: DecimalId,
  zoneCode: string
): StoredPendingZoneSourceOperation | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    if (!isValidPositiveDecimalId(actorId) || !zoneCode) return null;
    const raw = sessionStorage.getItem(getPendingKey(actorId, zoneCode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPendingZoneSourceOperation;
    if (
      parsed &&
      parsed.version === 1 &&
      parsed.actorId === actorId &&
      parsed.zoneCode === zoneCode &&
      isValidUuidV4(parsed.operationId) &&
      parsed.command &&
      parsed.command.operationId === parsed.operationId
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearPendingZoneSourceOperation(actorId: DecimalId, zoneCode: string): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(getPendingKey(actorId, zoneCode));
  } catch {
    // ignore storage errors on clear
  }
}

export function saveRetainedNodeMetadata(
  actorId: DecimalId,
  zoneCode: string,
  node: RetainedNodeMetadata
): boolean {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    const sanitized = stripSensitiveDeep(node);
    sessionStorage.setItem(getRetainedNodeKey(actorId, zoneCode), JSON.stringify(sanitized));
    return true;
  } catch {
    return false;
  }
}

export function getRetainedNodeMetadata(
  actorId: DecimalId,
  zoneCode: string
): RetainedNodeMetadata | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    if (!isValidPositiveDecimalId(actorId) || !zoneCode) return null;
    const raw = sessionStorage.getItem(getRetainedNodeKey(actorId, zoneCode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RetainedNodeMetadata;
    if (
      parsed &&
      parsed.actorId === actorId &&
      isValidPositiveDecimalId(parsed.nodeId) &&
      isValidPositiveDecimalId(parsed.providerId)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearRetainedNodeMetadata(actorId: DecimalId, zoneCode: string): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(getRetainedNodeKey(actorId, zoneCode));
  } catch {
    // ignore storage errors
  }
}

export function clearAllZoneSourceStorageForActor(actorId?: DecimalId | number | null): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    const prefixOp = actorId ? `${STORAGE_PREFIX}${String(actorId)}_` : STORAGE_PREFIX;
    const prefixNode = actorId ? `${RETAINED_NODE_PREFIX}${String(actorId)}_` : RETAINED_NODE_PREFIX;
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && (k.startsWith(prefixOp) || k.startsWith(prefixNode))) {
        toRemove.push(k);
      }
    }
    for (const k of toRemove) {
      sessionStorage.removeItem(k);
    }
  } catch {
    // ignore cleanup failures
  }
}
