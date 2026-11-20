import type { Zone } from './zone';
import type { SensorType } from './sensor';

/**
 * Coordinate system for relative layout diagram.
 * Extent is 10,000 integer units.
 */
export interface CoordinateSystem {
  kind: 'RELATIVE_GRID';
  extent: 10000;
  unitPercent: number; // 0.01
}

/**
 * Represents a single zone placement item on the relative grid layout.
 * Constraints:
 * - x, y in [0..9999]
 * - width, height in [1..10000]
 * - x + width <= 10000
 * - y + height <= 10000
 * - zIndex in [0..199]
 */
export interface PlacementItem {
  zoneId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface EditPolicy {
  codeChange: 'COORDINATION_REQUIRED';
  farmTransfer: 'COORDINATION_REQUIRED';
}

export interface LayoutFarmSummary {
  id: number;
  name: string;
}

/**
 * DTO returned by GET /api/v2/farms/{farmId}/layout.
 * Note: version is an exact decimal string "0".."9223372036854775807".
 */
export interface LayoutView {
  contractVersion: 'FARM-VIS-001-v1';
  layoutId: number;
  farm: LayoutFarmSummary;
  exists: boolean;
  version: string;
  updatedAt: string | null;
  updatedBy: number | null;
  lastOperationId: string | null;
  coordinateSystem: CoordinateSystem;
  areaUnit: string | null;
  zoneCatalogHash: string;
  zones: Zone[];
  items: PlacementItem[];
  unplacedZoneIds: number[];
  omittedPlacementCount: number;
  editPolicy: EditPolicy;
}

/**
 * Request body for PUT /api/v2/farms/{farmId}/layout.
 * Uses exact decimal strings for expectedVersion.
 */
export interface SaveLayoutRequest {
  operationId: string; // UUIDv4
  expectedVersion: string;
  expectedZoneCatalogHash: string;
  items: PlacementItem[];
}

/**
 * Receipt returned by PUT /api/v2/farms/{farmId}/layout
 * and GET /api/v2/farms/{farmId}/layout/operations/{operationId}.
 */
export interface MutationReceipt {
  contractVersion: 'FARM-VIS-001-v1';
  farmId: number;
  layoutId: number;
  operationId: string;
  requestSha256: string;
  actorId: number;
  appliedVersion: string;
  appliedAt: string;
  view: 'APPLIED_SNAPSHOT';
  items: PlacementItem[];
}

export type AdapterSupport = 'LEGACY_CONFIGURED' | 'REGISTRY_ONLY';

export interface ProviderDiscovery {
  id: number;
  code: string;
  name?: string;
  displayName?: string;
  adapterKind?: string;
  adapterSupport: AdapterSupport;
  retiredAt?: string | null;
}

export interface ProviderPage {
  items: ProviderDiscovery[];
  page: {
    limit: number;
    nextAfterId: number | null;
  };
}

export interface NodeSummary {
  id: number;
  providerId: number;
  kind: string;
  externalId: string;
  displayName: string;
  retiredAt: string | null;
}

export type AcquisitionSupport =
  | 'LEGACY_MQTT_COMPATIBLE'
  | 'IOTLAB_BOUND_MAPPING'
  | 'REGISTRY_ONLY';

export interface AssignmentResponse {
  id: number;
  streamId: number;
  sensorId: number;
  version: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  reason: string;
  reactivatePolling: boolean;
}

export interface StreamDiscovery {
  id: number;
  providerId: number;
  nodeId: number | null;
  externalNamespace: string;
  externalId: string;
  sensorType: SensorType;
  retiredAt: string | null;
  provider: ProviderDiscovery;
  node: NodeSummary | null;
  latestAssignmentVersion: number;
  currentAssignment: AssignmentResponse | null;
  acquisitionSupport: AcquisitionSupport;
}

export interface StreamPage {
  items: StreamDiscovery[];
  page: {
    limit: number;
    nextAfterId: number | null;
  };
}

export interface RoutingContract {
  grammar?: 'THREE_LEVEL_EXACT_ZONE' | string;
  namespace?: string;
  messageKind?: string;
  zoneFilter?: string;
  zoneCaseSensitive?: boolean;
  publisherAuthentication?: string;
  legacyUnsignedAccepted?: boolean;
  sourceMetadataEnabled?: boolean;
  scopedWriterEnabled?: boolean;
  topicPattern?: string;
  requiresMqttTopic?: boolean;
  defaultTopic?: string;
}

export interface AssignmentRequest {
  sensorId: number;
  expectedVersion: number;
  expectedUnit: string;
  expectedExternalSensorId: string;
  mqttTopic?: string | null;
  reason: string;
  reactivatePolling?: boolean;
}

export interface FarmVisualErrorResponse {
  error: 'farm_visual_error' | 'FV_DISABLED';
  code?: string;
  fieldErrors?: Array<{ field: string; code: string }>;
}

/**
 * Validates that a string is a canonical decimal representation of a signed 64-bit integer
 * within the non-negative range [0..9223372036854775807] (Long.MAX_VALUE).
 */
export function isValidDecimalVersion(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!/^(0|[1-9][0-9]{0,18})$/.test(value)) return false;
  try {
    const bi = BigInt(value);
    return bi >= 0n && bi <= 9223372036854775807n;
  } catch {
    return false;
  }
}
