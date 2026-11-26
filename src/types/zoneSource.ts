import type { SensorType } from './sensor';

/** Canonical positive signed 64-bit decimal ID string (1..9223372036854775807). */
export type DecimalId = string;

/** Canonical non-negative signed 64-bit decimal version string (0..9223372036854775807). */
export type DecimalVersion = string;

export const MAX_INT64 = 9223372036854775807n;

export type ZoneSourceOperationKind =
  | 'REGISTER_NODE'
  | 'REGISTER_STREAM'
  | 'ASSIGN'
  | 'REPLACE'
  | 'DISABLE';

export type NodeKind = 'STATION' | 'DEVICE';

export type AdapterKind = 'MQTT' | 'IOTLAB_HTTP' | string;

export type AcquisitionSupport =
  | 'REGISTRY_ONLY'
  | 'LEGACY_MQTT_COMPATIBLE'
  | 'IOTLAB_BOUND_MAPPING';

export type RegistryState = 'ACTIVE' | 'RETIRED';

export type AssignmentState = 'OPEN' | 'CLOSED';

export type ExpectedCurrentState = 'OPEN' | 'NONE' | 'CLOSED';

export type RecordingEvidenceState =
  | 'NEVER_RECORDED'
  | 'RECORDED_RECENTLY'
  | 'RECORDED_OLD'
  | 'TIME_INCONSISTENT';

export type MappingHealthState = 'BLOCKED' | 'READY' | 'DISABLED';

export type CloseAuditStatus = 'NOT_CLOSED' | 'UNAVAILABLE' | 'RECORDED';

export interface ZoneSourceRecordingEvidence {
  assignmentId: DecimalId;
  streamId: DecimalId;
  state: RecordingEvidenceState;
  readingId: DecimalId | null;
  recordAt: string | null;
  receivedAt: string | null;
  acceptedAt: string | null;
  latestMeasurementAt: string | null;
  receiptTimestampBasis: 'SERVER_METRIC_PROCESSING' | 'INGEST_ROW_PROCESSING' | string;
  ageSeconds: number | null;
  thresholdSeconds: number;
  algorithmVersion: string;
}

export interface ZoneSourceMappingSummary {
  id: DecimalId;
  version: DecimalVersion;
  enabled: boolean;
  globallyEnabled: boolean;
  pendingFrom: string | null;
  pendingTo: string | null;
  pendingEnd: string | null;
  blockedSince: string | null;
  state: MappingHealthState;
}

export interface ZoneSourceCloseAudit {
  status: CloseAuditStatus;
  actorId?: DecimalId;
  operationId?: string;
  reason?: string;
  appliedAt?: string;
}

export interface ZoneSourceAssignmentItem {
  assignmentId: DecimalId;
  streamId: DecimalId;
  version: DecimalVersion;
  sensorId: DecimalId;
  sensorType: SensorType;
  effectiveFrom: string;
  effectiveTo: string | null;
  publicProviderLabel: string;
  publicStreamLabel: string;
  registryState: RegistryState;
  assignmentState: AssignmentState;
  acquisitionSupport: AcquisitionSupport;
  recordingEvidence: ZoneSourceRecordingEvidence;
  // ADMIN-only fields (strictly omitted for OWNER responses)
  createdBy?: DecimalId;
  reason?: string;
  expectedUnit?: string | null;
  expectedExternalSensorId?: string | null;
  mqttTopic?: string | null;
  latestAssignmentVersion?: DecimalVersion;
  mapping?: ZoneSourceMappingSummary | null;
  closeAudit?: ZoneSourceCloseAudit;
}

export interface ZoneSourceStatusSensorItem {
  sensorId: DecimalId;
  sensorType: SensorType;
  unit: string;
  currentAssignments: ZoneSourceAssignmentItem[];
  recordingEvidence: ZoneSourceRecordingEvidence[];
}

export interface ZoneSourceStatusResponse {
  zoneCode: string;
  farmId: DecimalId;
  observedAt: string;
  items: ZoneSourceStatusSensorItem[];
  page: {
    limit: number;
    nextAfterSensorId: DecimalId | null;
  };
  view: 'LIVE_OPERATIONAL';
}

export interface ZoneSourceHistoryResponse {
  items: ZoneSourceAssignmentItem[];
  page: {
    limit: number;
    nextAfterAssignmentId: DecimalId | null;
  };
  view: 'LIVE_OPERATIONAL';
}

export interface ZoneSourceNodeItem {
  id: DecimalId;
  providerId: DecimalId;
  kind: NodeKind;
  externalId: string;
  displayName: string | null;
  retiredAt: string | null;
}

export interface ZoneSourceNodePage {
  items: ZoneSourceNodeItem[];
  page: {
    limit: number;
    nextAfterId: DecimalId | null;
  };
}

export interface IotLabMappingAdminItem {
  id: number | DecimalId;
  streamId: number | DecimalId;
  stationId: number | DecimalId;
  zoneId: number | DecimalId;
  sensorType: SensorType;
  expectedSensorId: number | DecimalId | null;
  expectedUnit: string | null;
  lastObservedUnit: string | null;
  enabled: boolean;
  lastResultTime: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  pendingFrom: string | null;
  pendingTo: string | null;
  pendingEnd: string | null;
  consecutiveFailures: number;
  emptyRuns: number;
  stale: boolean;
  state: MappingHealthState;
  blockedSince: string | null;
  restartFrom: string | null;
  observedCadenceMillis: number | null;
  /** Server DTO (MappingResponse) omits version; populated only if future server read contract exposes @Version. */
  version?: number | DecimalVersion | null;
}

export interface RegisterNodeOperationRequest {
  contractVersion: 'ZS-1';
  kind: 'REGISTER_NODE';
  operationId: string;
  providerId: DecimalId;
  nodeKind: NodeKind;
  externalId: string;
  displayName: string | null;
  reason: string;
}

export interface RegisterStreamOperationRequest {
  contractVersion: 'ZS-1';
  kind: 'REGISTER_STREAM';
  operationId: string;
  providerId: DecimalId;
  nodeId: DecimalId | null;
  mqttTopic: string | null;
  externalId: string;
  sensorType: SensorType;
  reason: string;
}

export interface AssignMqttOperationRequest {
  contractVersion: 'ZS-1';
  kind: 'ASSIGN';
  operationId: string;
  zoneCode: string;
  sensorId: DecimalId;
  newStreamId: DecimalId;
  newExpectedVersion: DecimalVersion;
  expectedCurrentAssignmentId: DecimalId | null;
  expectedCurrentState: ExpectedCurrentState;
  expectedUnit: string | null;
  expectedExternalSensorId: null;
  mqttTopic: string;
  reason: string;
  reactivatePolling: false;
}

export interface AssignIotLabOperationRequest {
  contractVersion: 'ZS-1';
  kind: 'ASSIGN';
  operationId: string;
  zoneCode: string;
  sensorId: DecimalId;
  newStreamId: DecimalId;
  newExpectedVersion: DecimalVersion;
  expectedCurrentAssignmentId: DecimalId | null;
  expectedCurrentState: ExpectedCurrentState;
  expectedUnit: string | null;
  expectedExternalSensorId: string | null;
  mqttTopic: null;
  mappingId: DecimalId;
  expectedMappingVersion: DecimalVersion;
  bindIfUnbound: boolean;
  reason: string;
  reactivatePolling: boolean;
}

export interface ReplaceMqttOperationRequest {
  contractVersion: 'ZS-1';
  kind: 'REPLACE';
  operationId: string;
  zoneCode: string;
  sensorId: DecimalId;
  oldStreamId: DecimalId;
  oldAssignmentId: DecimalId;
  oldExpectedVersion: DecimalVersion;
  newStreamId: DecimalId;
  newExpectedVersion: DecimalVersion;
  expectedCurrentAssignmentId: DecimalId | null;
  expectedCurrentState: ExpectedCurrentState;
  expectedUnit: string | null;
  expectedExternalSensorId: null;
  mqttTopic: string;
  reason: string;
  reactivatePolling: false;
}

export interface ReplaceIotLabOperationRequest {
  contractVersion: 'ZS-1';
  kind: 'REPLACE';
  operationId: string;
  zoneCode: string;
  sensorId: DecimalId;
  oldStreamId: DecimalId;
  oldAssignmentId: DecimalId;
  oldExpectedVersion: DecimalVersion;
  newStreamId: DecimalId;
  newExpectedVersion: DecimalVersion;
  expectedCurrentAssignmentId: DecimalId | null;
  expectedCurrentState: ExpectedCurrentState;
  expectedUnit: string | null;
  expectedExternalSensorId: string | null;
  mqttTopic: null;
  mappingId: DecimalId;
  expectedMappingVersion: DecimalVersion;
  bindIfUnbound: boolean;
  reason: string;
  reactivatePolling: boolean;
}

export interface DisableOperationRequest {
  contractVersion: 'ZS-1';
  kind: 'DISABLE';
  operationId: string;
  zoneCode: string;
  sensorId: DecimalId;
  oldStreamId: DecimalId;
  oldAssignmentId: DecimalId;
  oldExpectedVersion: DecimalVersion;
  reason: string;
}

export type ZoneSourceOperationRequest =
  | RegisterNodeOperationRequest
  | RegisterStreamOperationRequest
  | AssignMqttOperationRequest
  | AssignIotLabOperationRequest
  | ReplaceMqttOperationRequest
  | ReplaceIotLabOperationRequest
  | DisableOperationRequest;

export interface ReceiptStreamSnapshot {
  streamId: DecimalId;
  assignment: {
    assignmentId: DecimalId;
    version: DecimalVersion;
    sensorId: DecimalId;
    zoneId: DecimalId;
    farmId: DecimalId;
    effectiveFrom: string;
    effectiveTo: string | null;
    expectedUnit: string | null;
    expectedExternalSensorId: string | null;
    mqttTopic: string | null;
  } | null;
  mapping: {
    id: DecimalId;
    version: DecimalVersion;
    enabled: boolean;
    providerId: DecimalId | null;
    sourceStreamId: DecimalId | null;
  } | null;
}

export interface ReceiptNodeSnapshot {
  id: DecimalId;
  providerId: DecimalId;
  kind: NodeKind;
  externalId: string;
  displayName: string | null;
  retiredAt: string | null;
}

export interface ReceiptRegistryStreamSnapshot {
  id: DecimalId;
  providerId: DecimalId;
  nodeId: DecimalId | null;
  externalNamespace: string;
  externalId: string;
  sensorType: SensorType;
  retiredAt: string | null;
}

export type ReceiptAfterSnapshot =
  | (ReceiptNodeSnapshot & { streams?: undefined; stream?: undefined; node?: undefined })
  | (ReceiptRegistryStreamSnapshot & { streams?: undefined; stream?: undefined; node?: undefined })
  | {
      streams?: ReceiptStreamSnapshot[];
      node?: ReceiptNodeSnapshot | null;
      stream?: ReceiptRegistryStreamSnapshot | null;
      selectedMapping?: {
        id: DecimalId;
        version: DecimalVersion;
        enabled: boolean;
        providerId: DecimalId | null;
        sourceStreamId: DecimalId | null;
      } | null;
      [key: string]: unknown;
    };

export interface ZoneSourceReceipt {
  operationId: string;
  kind: ZoneSourceOperationKind;
  appliedAt: string;
  reason: string;
  resultSemantics: 'HISTORICAL_APPLIED';
  zoneId?: DecimalId;
  sensorId?: DecimalId;
  before: {
    streams?: ReceiptStreamSnapshot[];
    node?: ReceiptNodeSnapshot | null;
    stream?: ReceiptRegistryStreamSnapshot | null;
    selectedMapping?: {
      id: DecimalId;
      version: DecimalVersion;
      enabled: boolean;
      providerId: DecimalId | null;
      sourceStreamId: DecimalId | null;
    } | null;
    [key: string]: unknown;
  };
  after: ReceiptAfterSnapshot;
  effects: {
    assignmentClosed: boolean;
    assignmentOpened: boolean;
    pollingStateChanged: boolean;
    legacyMqttMayContinue: boolean;
    deviceOrBrokerStopped: boolean;
  };
  replayed: boolean;
}

/**
 * Safely extracts node metadata from a receipt's after-payload.
 * Handles both pinned backend flat shape: { id, providerId, kind, externalId, displayName }
 * and legacy/synthetic wrapped shape: { node: { id, ... } }.
 */
export function extractReceiptNode(after: unknown): ReceiptNodeSnapshot | null {
  if (!after || typeof after !== 'object') return null;
  const obj = after as Record<string, unknown>;
  if (obj.node && typeof obj.node === 'object') {
    const n = obj.node as Record<string, unknown>;
    if (n.id && n.kind) {
      return {
        id: String(n.id),
        providerId: String(n.providerId),
        kind: n.kind as NodeKind,
        externalId: String(n.externalId),
        displayName: n.displayName ? String(n.displayName) : null,
        retiredAt: n.retiredAt ? String(n.retiredAt) : null,
      };
    }
  }
  if (obj.id && obj.kind && obj.externalId) {
    return {
      id: String(obj.id),
      providerId: String(obj.providerId),
      kind: obj.kind as NodeKind,
      externalId: String(obj.externalId),
      displayName: obj.displayName ? String(obj.displayName) : null,
      retiredAt: obj.retiredAt ? String(obj.retiredAt) : null,
    };
  }
  return null;
}

/**
 * Safely extracts stream metadata from a receipt's after-payload.
 * Handles both pinned backend flat shape: { id, providerId, nodeId, externalNamespace, externalId, sensorType }
 * and legacy/synthetic wrapped shape: { stream: { id, ... } }.
 */
export function extractReceiptStream(after: unknown): ReceiptRegistryStreamSnapshot | null {
  if (!after || typeof after !== 'object') return null;
  const obj = after as Record<string, unknown>;
  if (obj.stream && typeof obj.stream === 'object') {
    const s = obj.stream as Record<string, unknown>;
    if (s.id && s.externalNamespace && s.sensorType) {
      return {
        id: String(s.id),
        providerId: String(s.providerId),
        nodeId: s.nodeId ? String(s.nodeId) : null,
        externalNamespace: String(s.externalNamespace),
        externalId: String(s.externalId),
        sensorType: s.sensorType as SensorType,
        retiredAt: s.retiredAt ? String(s.retiredAt) : null,
      };
    }
  }
  if (obj.id && obj.externalNamespace && obj.sensorType) {
    return {
      id: String(obj.id),
      providerId: String(obj.providerId),
      nodeId: obj.nodeId ? String(obj.nodeId) : null,
      externalNamespace: String(obj.externalNamespace),
      externalId: String(obj.externalId),
      sensorType: obj.sensorType as SensorType,
      retiredAt: obj.retiredAt ? String(obj.retiredAt) : null,
    };
  }
  return null;
}

export type ZoneSourceErrorCode =
  | 'ZS_DISABLED'
  | 'ZS_SCHEMA_NOT_READY'
  | 'ZS_STORE_UNAVAILABLE'
  | 'ZS_OPERATION_NOT_FOUND'
  | 'ZS_ZONE_NOT_FOUND'
  | 'ZS_SOURCE_NOT_FOUND'
  | 'ZS_OPERATION_BODY_CONFLICT'
  | 'ZS_HANDOFF_REVIEW_REQUIRED'
  | 'ZS_STATUS_OVERFLOW'
  | 'ZS_REQUEST_INVALID'
  | 'ZS_ASSIGNMENT_CONFLICT'
  | 'ZS_SOURCE_RETIRED'
  | 'ZS_TARGET_MISMATCH'
  | 'ZS_UNIT_MISMATCH'
  | 'ZS_TRANSPORT_MISMATCH'
  | 'ZS_MQTT_CHANNEL_AMBIGUOUS'
  | 'ZS_MAPPING_CONFLICT'
  | 'ZS_IDENTITY_CONFLICT'
  | 'ZS_ASSIGNMENT_TIME'
  | 'ZS_VERSION_EXHAUSTED'
  | 'SOURCE_METADATA_DISABLED'
  | 'FV_DISABLED'
  | 'UNSAFE_NUMERIC_ID';

export interface ZoneSourceFieldError {
  field: string;
  code: string;
}

export interface ParsedZoneSourceError {
  status: number;
  code: ZoneSourceErrorCode | string;
  message: string;
  fieldErrors: ZoneSourceFieldError[];
  isNetworkOrTimeout: boolean;
  isDisabledFeature: boolean;
  isConflict: boolean;
  isNotFound: boolean;
  isUnauthorized: boolean;
  isForbidden: boolean;
}

export interface TargetAssignmentSnapshot {
  streamId: DecimalId;
  streamLabel: string;
  providerLabel: string;
  sensorId: DecimalId;
  sensorLabel: string;
  assignmentId: DecimalId | null;
  version: DecimalVersion;
  assignmentState: ExpectedCurrentState;
  adapterKind: AdapterKind;
  mqttTopic: string | null;
  mappingId: DecimalId | null;
  mappingVersion: DecimalVersion | null;
  oldStreamLabel?: string | null;
  oldAssignmentId?: DecimalId | null;
}

export interface RetainedNodeMetadata {
  actorId: DecimalId;
  providerId: DecimalId;
  providerLabel: string;
  nodeId: DecimalId;
  nodeKind: NodeKind;
  externalId: string;
  displayName: string | null;
  operationId: string;
  savedAt: string;
}

export interface StoredPendingZoneSourceOperation {
  version: 1;
  actorId: DecimalId;
  zoneCode: string;
  sensorId: DecimalId | null;
  operationId: string;
  kind: ZoneSourceOperationKind;
  command: ZoneSourceOperationRequest;
  canonicalBody: string;
  targetSnapshot: TargetAssignmentSnapshot | null;
  phase: 'IN_FLIGHT' | 'UNKNOWN_OUTCOME' | 'RECEIPT_404' | 'CONFLICT_REVIEW';
  lastReceipt?: ZoneSourceReceipt | null;
  createdAt: string;
  updatedAt: string;
}

const POSITIVE_DECIMAL_REGEX = /^[1-9][0-9]{0,18}$/;
const VERSION_DECIMAL_REGEX = /^(0|[1-9][0-9]{0,18})$/;

export function isValidPositiveDecimalId(value: string | null | undefined): value is DecimalId {
  if (typeof value !== 'string' || !POSITIVE_DECIMAL_REGEX.test(value)) return false;
  try {
    const parsed = BigInt(value);
    return parsed >= 1n && parsed <= MAX_INT64;
  } catch {
    return false;
  }
}

export function isValidDecimalVersion(value: string | null | undefined): value is DecimalVersion {
  if (typeof value !== 'string' || !VERSION_DECIMAL_REGEX.test(value)) return false;
  try {
    const parsed = BigInt(value);
    return parsed >= 0n && parsed <= MAX_INT64;
  } catch {
    return false;
  }
}

export function assertSafeIntegerId(value: unknown, fieldName: string): number {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`UNSAFE_NUMERIC_ID:${fieldName}`);
    }
    return value;
  }
  if (typeof value === 'string' && POSITIVE_DECIMAL_REGEX.test(value)) {
    const asNumber = Number(value);
    if (!Number.isSafeInteger(asNumber) || asNumber <= 0) {
      throw new Error(`UNSAFE_NUMERIC_ID:${fieldName}`);
    }
    return asNumber;
  }
  throw new Error(`UNSAFE_NUMERIC_ID:${fieldName}`);
}

export function toDecimalId(value: number | string, fieldName: string): DecimalId {
  if (typeof value === 'string') {
    if (!isValidPositiveDecimalId(value)) {
      throw new Error(`INVALID_DECIMAL_ID:${fieldName}`);
    }
    return value;
  }
  const safe = assertSafeIntegerId(value, fieldName);
  return String(safe);
}

export function toDecimalVersion(value: number | string, fieldName: string): DecimalVersion {
  if (typeof value === 'string') {
    if (!isValidDecimalVersion(value)) {
      throw new Error(`INVALID_DECIMAL_VERSION:${fieldName}`);
    }
    return value;
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`UNSAFE_NUMERIC_ID:${fieldName}`);
  }
  return String(value);
}
