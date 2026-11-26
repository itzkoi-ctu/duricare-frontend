import { isAxiosError } from 'axios';
import client from './client';
import { getSensors as getLegacyZoneSensors } from './zones';
import type {
  ProviderPage,
  RoutingContract,
  StreamDiscovery,
  StreamPage,
} from '../types/farmVisual';
import type { SensorMetadata } from '../types/sensor';
import {
  assertSafeIntegerId,
  type DecimalId,
  type DecimalVersion,
  type IotLabMappingAdminItem,
  type ParsedZoneSourceError,
  type ZoneSourceFieldError,
  type ZoneSourceHistoryResponse,
  type ZoneSourceNodePage,
  type ZoneSourceOperationRequest,
  type ZoneSourceReceipt,
  type ZoneSourceStatusResponse,
} from '../types/zoneSource';
import { isValidUuidV4 } from '../utils/zoneSourceValidation';

export async function getZoneSourceStatus(
  zoneCode: string,
  params?: { afterSensorId?: DecimalId; limit?: number },
  signal?: AbortSignal
): Promise<ZoneSourceStatusResponse> {
  const response = await client.get<ZoneSourceStatusResponse>(
    `/v2/zones/${encodeURIComponent(zoneCode)}/source-status`,
    { params, signal }
  );
  return response.data;
}

export async function getZoneSourceAssignments(
  zoneCode: string,
  params: { sensorId: DecimalId; afterAssignmentId?: DecimalId; limit?: number },
  signal?: AbortSignal
): Promise<ZoneSourceHistoryResponse> {
  const response = await client.get<ZoneSourceHistoryResponse>(
    `/v2/zones/${encodeURIComponent(zoneCode)}/source-assignments`,
    { params, signal }
  );
  return response.data;
}

export async function getZoneSourceNodes(
  params: {
    providerId: DecimalId;
    afterId?: DecimalId;
    limit?: number;
    includeRetired?: boolean;
  },
  signal?: AbortSignal
): Promise<ZoneSourceNodePage> {
  const response = await client.get<ZoneSourceNodePage>('/v2/admin/source-nodes', {
    params,
    signal,
  });
  return response.data;
}

export async function executeZoneSourceOperation(
  command: ZoneSourceOperationRequest,
  signal?: AbortSignal
): Promise<{ status: number; receipt: ZoneSourceReceipt }> {
  const response = await client.post<ZoneSourceReceipt>('/v2/admin/source-operations', command, {
    timeout: 20000,
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    signal,
  });
  return {
    status: response.status,
    receipt: response.data,
  };
}

export async function getZoneSourceOperation(
  operationId: string,
  signal?: AbortSignal
): Promise<ZoneSourceReceipt> {
  if (!isValidUuidV4(operationId)) {
    throw new Error('INVALID_UUID_V4');
  }
  const response = await client.get<ZoneSourceReceipt>(
    `/v2/admin/source-operations/${encodeURIComponent(operationId)}`,
    { signal }
  );
  return response.data;
}

export async function getIotLabMappingsAdmin(
  signal?: AbortSignal
): Promise<IotLabMappingAdminItem[]> {
  const response = await client.get<IotLabMappingAdminItem[]>('/admin/iotlab/mappings', {
    signal,
  });
  return Array.isArray(response.data) ? response.data : [];
}

export async function getSafeSourceProviders(
  params?: {
    afterId?: number;
    limit?: number;
    adapterKind?: string;
    includeRetired?: boolean;
  },
  signal?: AbortSignal
): Promise<ProviderPage> {
  const response = await client.get<ProviderPage>('/v2/admin/source-providers', {
    params,
    signal,
  });
  const page = response.data;
  for (const p of page.items) {
    assertSafeIntegerId(p.id, 'provider.id');
  }
  return page;
}

export async function getSafeSourceStreams(
  params?: {
    afterId?: number;
    limit?: number;
    providerId?: number;
    nodeId?: number;
    sensorType?: string;
    includeRetired?: boolean;
  },
  signal?: AbortSignal
): Promise<StreamPage> {
  const response = await client.get<StreamPage>('/v2/admin/source-streams', {
    params,
    signal,
  });
  const page = response.data;
  for (const s of page.items) {
    assertSafeIntegerId(s.id, 'stream.id');
    assertSafeIntegerId(s.providerId, 'stream.providerId');
    if (s.nodeId != null) assertSafeIntegerId(s.nodeId, 'stream.nodeId');
  }
  return page;
}

export async function getSafeSourceStreamDetail(
  id: number,
  signal?: AbortSignal
): Promise<StreamDiscovery> {
  assertSafeIntegerId(id, 'stream.id');
  const response = await client.get<StreamDiscovery>(`/v2/admin/source-streams/${id}`, {
    signal,
  });
  const detail = response.data;
  assertSafeIntegerId(detail.id, 'stream.id');
  return detail;
}

export async function getSafeZoneSensors(zoneCode: string): Promise<SensorMetadata[]> {
  const sensors = await getLegacyZoneSensors(zoneCode);
  for (const sensor of sensors) {
    assertSafeIntegerId(sensor.id, 'sensor.id');
  }
  return sensors;
}

export async function getSafeRoutingContract(signal?: AbortSignal): Promise<RoutingContract> {
  const response = await client.get<RoutingContract>('/v2/admin/source-routing-contract', {
    signal,
  });
  return response.data;
}

export function parseZoneSourceApiError(error: unknown): ParsedZoneSourceError {
  if (error instanceof Error && error.message.startsWith('UNSAFE_NUMERIC_ID')) {
    return {
      status: 0,
      code: 'UNSAFE_NUMERIC_ID',
      message: 'Dữ liệu định danh vượt giới hạn an toàn JavaScript (53-bit).',
      fieldErrors: [],
      isNetworkOrTimeout: false,
      isDisabledFeature: false,
      isConflict: false,
      isNotFound: false,
      isUnauthorized: false,
      isForbidden: false,
    };
  }

  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as
      | {
          error?: string;
          message?: string;
          code?: string;
          fieldErrors?: ZoneSourceFieldError[];
        }
      | undefined;

    const code = data?.error || data?.code || (status === 0 ? 'NETWORK_ERROR' : `HTTP_${status}`);
    const fieldErrors = Array.isArray(data?.fieldErrors) ? data.fieldErrors : [];
    const isNetworkOrTimeout =
      !error.response ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      status === 502 ||
      status === 503 ||
      status === 504;

    const isDisabledFeature =
      code === 'ZS_DISABLED' ||
      code === 'ZS_SCHEMA_NOT_READY' ||
      code === 'SOURCE_METADATA_DISABLED' ||
      code === 'FV_DISABLED';

    return {
      status,
      code,
      message: data?.message || error.message || '',
      fieldErrors,
      isNetworkOrTimeout: isNetworkOrTimeout && !isDisabledFeature,
      isDisabledFeature,
      isConflict: status === 409,
      isNotFound: status === 404,
      isUnauthorized: status === 401,
      isForbidden: status === 403,
    };
  }

  return {
    status: 0,
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : String(error ?? ''),
    fieldErrors: [],
    isNetworkOrTimeout: false,
    isDisabledFeature: false,
    isConflict: false,
    isNotFound: false,
    isUnauthorized: false,
    isForbidden: false,
  };
}

export function getZoneSourceErrorMessage(
  parsed: ParsedZoneSourceError,
  t: (k: string, values?: readonly (string | number | null)[]) => string = (k, vals) => {
    if (!vals || vals.length === 0) return k;
    return vals.reduce<string>(
      (acc, v, idx) => acc.replace(new RegExp(`\\{${idx}\\}`, 'g'), String(v ?? '')),
      k
    );
  }
): string {
  switch (parsed.code) {
    case 'ZS_DISABLED':
    case 'ZS_SCHEMA_NOT_READY':
      return t('Tính năng quản lý nguồn dữ liệu khu vực hiện đang tạm khóa trên máy chủ.');
    case 'ZS_STORE_UNAVAILABLE':
      return t('Máy chủ dữ liệu đang tạm gián đoạn (503). Vui lòng thử lại.');
    case 'SOURCE_METADATA_DISABLED':
    case 'FV_DISABLED':
      return t('Tính năng siêu dữ liệu nguồn nhận đang tắt trên máy chủ.');
    case 'ZS_ASSIGNMENT_CONFLICT':
      return t('Phiên bản hoặc trạng thái nguồn đã thay đổi từ một thao tác khác.');
    case 'ZS_HANDOFF_REVIEW_REQUIRED':
      return t('Nguồn IoTLab này từng gắn với cảm biến khác; cần kiểm tra bàn giao trước khi gán lại.');
    case 'ZS_MAPPING_CONFLICT':
      return t('Cấu hình mapping IoTLab hoặc phiên bản mapping không còn khớp.');
    case 'ZS_MQTT_CHANNEL_AMBIGUOUS':
      return t('Topic MQTT đã tồn tại kênh khác xung đột trong hệ thống.');
    case 'ZS_TRANSPORT_MISMATCH':
      return t('Cấu hình truyền dẫn (MQTT / IoTLab / loại cảm biến) không tương thích.');
    case 'ZS_UNIT_MISMATCH':
      return t('Đơn vị đo của nguồn không khớp với cảm biến khu vực.');
    case 'ZS_TARGET_MISMATCH':
      return t('Cảm biến hoặc khu vực đích không còn hợp lệ.');
    case 'ZS_SOURCE_RETIRED':
      return t('Nguồn, thiết bị hoặc nhà cung cấp đã ngừng hoạt động (RETIRED).');
    case 'ZS_IDENTITY_CONFLICT':
      return t('Mã định danh thiết bị/luồng hoặc bản ghi gán bị trùng lặp.');
    case 'ZS_OPERATION_BODY_CONFLICT':
      return t('Mã thao tác (UUID) đã được dùng trước đó với nội dung yêu cầu khác.');
    case 'ZS_OPERATION_NOT_FOUND':
      return t('Chưa tìm thấy biên nhận thao tác này trên máy chủ.');
    case 'ZS_ZONE_NOT_FOUND':
      return t('Không tìm thấy khu vực yêu cầu.');
    case 'ZS_SOURCE_NOT_FOUND':
      return t('Không tìm thấy nhà cung cấp, thiết bị hoặc nguồn yêu cầu.');
    case 'ZS_STATUS_OVERFLOW':
      return t('Số lượng bản ghi vượt giới hạn hiển thị cho phép trên một lần đọc.');
    case 'ZS_ASSIGNMENT_TIME':
      return t('Mốc thời gian hiệu lực gán nguồn không hợp lệ.');
    case 'ZS_VERSION_EXHAUSTED':
      return t('Phiên bản đồng bộ của nguồn đã vượt ngưỡng cho phép.');
    case 'ZS_REQUEST_INVALID':
      return t('Dữ liệu yêu cầu chưa hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.');
    default:
      if (parsed.isForbidden) {
        return t('Bạn không có quyền thực hiện hoặc truy cập dữ liệu nguồn của khu vực này.');
      }
      if (parsed.isUnauthorized) {
        return t('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
      return parsed.message || t('Không thể kết nối máy chủ. Vui lòng thử lại.');
  }
}

export interface ResolveClosedAssignmentResult {
  status: 'FOUND' | 'NOT_FOUND' | 'BUDGET_EXHAUSTED' | 'ERROR';
  assignmentId?: DecimalId;
  effectiveTo?: string | null;
  error?: unknown;
}

export async function resolveClosedAssignmentId(
  zoneCode: string,
  sensorId: DecimalId,
  streamId: DecimalId | number,
  expectedVersion: DecimalVersion | number,
  options?: {
    maxPages?: number;
    pageSize?: number;
    signal?: AbortSignal;
  }
): Promise<ResolveClosedAssignmentResult> {
  const maxPages = options?.maxPages ?? 5;
  const pageSize = options?.pageSize ?? 20;
  const targetStreamIdStr = String(streamId);
  const targetVersionStr = String(expectedVersion);
  const targetSensorIdStr = String(sensorId);

  let afterAssignmentId: DecimalId | undefined = undefined;
  let pagesVisited = 0;

  try {
    while (pagesVisited < maxPages) {
      pagesVisited++;
      const res = await getZoneSourceAssignments(
        zoneCode,
        {
          sensorId,
          limit: pageSize,
          afterAssignmentId,
        },
        options?.signal
      );

      for (const row of res.items) {
        if (
          String(row.streamId) === targetStreamIdStr &&
          String(row.version) === targetVersionStr &&
          String(row.sensorId) === targetSensorIdStr &&
          row.effectiveTo !== null
        ) {
          return {
            status: 'FOUND',
            assignmentId: row.assignmentId,
            effectiveTo: row.effectiveTo,
          };
        }
      }

      if (!res.page.nextAfterAssignmentId) {
        return { status: 'NOT_FOUND' };
      }
      afterAssignmentId = res.page.nextAfterAssignmentId;
    }

    return { status: 'BUDGET_EXHAUSTED' };
  } catch (err) {
    return { status: 'ERROR', error: err };
  }
}
