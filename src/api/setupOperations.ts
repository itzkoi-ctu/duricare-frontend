import client from './client';
import type { Farm } from '../types/farm';
import type { OwnerResponse } from '../types/owner';
import type { SetupOperationResponse } from '../types/setupOperation';

export async function getSetupOperation<T = Farm | OwnerResponse>(
  operationId: string,
  signal?: AbortSignal
): Promise<SetupOperationResponse<T>> {
  const response = await client.get<SetupOperationResponse<T>>(
    `/admin/setup-operations/${operationId}`,
    { signal }
  );
  return response.data;
}
