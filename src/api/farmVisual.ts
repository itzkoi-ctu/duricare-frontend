import client from './client';
import type {
  LayoutView,
  SaveLayoutRequest,
  MutationReceipt,
  ProviderPage,
  StreamPage,
  StreamDiscovery,
  RoutingContract,
  AssignmentRequest,
  AssignmentResponse,
} from '../types/farmVisual';

/**
 * GET /api/v2/farms/{farmId}/layout
 * Returns the current layout configuration for a farm.
 * Version tokens are returned as canonical decimal strings.
 */
export async function getFarmLayout(farmId: number): Promise<LayoutView> {
  const response = await client.get<LayoutView>(`/v2/farms/${farmId}/layout`);
  return response.data;
}

/**
 * PUT /api/v2/farms/{farmId}/layout
 * Saves a full snapshot of the farm layout with optimistic locking.
 * ExpectedVersion must be a decimal string.
 */
export async function saveFarmLayout(
  farmId: number,
  request: SaveLayoutRequest,
): Promise<MutationReceipt> {
  const response = await client.put<MutationReceipt>(
    `/v2/farms/${farmId}/layout`,
    request,
  );
  return response.data;
}

/**
 * GET /api/v2/farms/{farmId}/layout/operations/{operationId}
 * Reads back the mutation receipt for a specific operation.
 */
export async function getLayoutOperation(
  farmId: number,
  operationId: string,
): Promise<MutationReceipt> {
  const response = await client.get<MutationReceipt>(
    `/v2/farms/${farmId}/layout/operations/${operationId}`,
  );
  return response.data;
}

/**
 * GET /api/v2/admin/source-providers
 * Bounded keyset query for source telemetry providers.
 */
export async function getSourceProviders(params?: {
  afterId?: number;
  limit?: number;
  adapterKind?: string;
  includeRetired?: boolean;
}): Promise<ProviderPage> {
  const response = await client.get<ProviderPage>('/v2/admin/source-providers', {
    params,
  });
  return response.data;
}

/**
 * GET /api/v2/admin/source-streams
 * Bounded keyset query for source telemetry streams.
 */
export async function getSourceStreams(params?: {
  afterId?: number;
  limit?: number;
  providerId?: number;
  nodeId?: number;
  sensorType?: string;
  includeRetired?: boolean;
}): Promise<StreamPage> {
  const response = await client.get<StreamPage>('/v2/admin/source-streams', {
    params,
  });
  return response.data;
}

/**
 * GET /api/v2/admin/source-streams/{id}
 * Retrieves stream details including latest assignment version.
 */
export async function getSourceStreamDetail(id: number): Promise<StreamDiscovery> {
  const response = await client.get<StreamDiscovery>(`/v2/admin/source-streams/${id}`);
  return response.data;
}

/**
 * GET /api/v2/admin/source-routing-contract
 * Retrieves MQTT routing contract grammar and topic metadata.
 */
export async function getSourceRoutingContract(): Promise<RoutingContract> {
  const response = await client.get<RoutingContract>(
    '/v2/admin/source-routing-contract',
  );
  return response.data;
}

/**
 * POST /api/v2/admin/source-streams/{streamId}/assignments
 * Creates or reassigns a source stream to a logical sensor.
 */
export async function assignSourceStream(
  streamId: number,
  request: AssignmentRequest,
): Promise<AssignmentResponse> {
  const response = await client.post<AssignmentResponse>(
    `/v2/admin/source-streams/${streamId}/assignments`,
    request,
  );
  return response.data;
}

/**
 * DELETE /api/v2/admin/source-streams/{streamId}/assignments/current?version=...
 * Retires the current assignment for a stream.
 */
export async function retireCurrentAssignment(
  streamId: number,
  version: number,
): Promise<void> {
  await client.delete(`/v2/admin/source-streams/${streamId}/assignments/current`, {
    params: { version },
  });
}

/**
 * GET /api/v2/zones/{zoneCode}/sources
 * Retrieves current and historical assignments for a zone's sensors.
 */
export async function getZoneSources(
  zoneCode: string,
): Promise<AssignmentResponse[]> {
  const response = await client.get<{ items: AssignmentResponse[] } | AssignmentResponse[]>(
    `/v2/zones/${encodeURIComponent(zoneCode)}/sources`,
  );
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data?.items ?? [];
}
