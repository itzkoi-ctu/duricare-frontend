import type { Farm } from './farm';
import type { OwnerResponse } from './owner';

export type SetupOperationKind = 'FARM_CREATE' | 'OWNER_CREATE' | 'FARM_CREATE_INLINE';
export type SetupOperationStatus = 'APPLIED_SNAPSHOT';

export interface SetupOperationResponse<T = Farm | OwnerResponse> {
  contractVersion: string;
  operationId: string;
  kind: SetupOperationKind;
  status: SetupOperationStatus;
  resourceId: number;
  farmId: number;
  appliedAt: string;
  resource: T;
  resourcePath: string;
}

export interface SetupFieldError {
  field: string;
  code: string;
  message: string;
}

export interface SetupOperationError {
  error: 'farm_setup_error' | string;
  code: string;
  message: string;
  fieldErrors?: SetupFieldError[];
}

export type SetupStage =
  | 'DRAFT'
  | 'DISPATCHING'
  | 'UNKNOWN'
  | 'APPLIED'
  | 'FAILED';

export interface StoredSetupOperation {
  version: 1;
  actorId: number;
  operationId: string;
  kind: SetupOperationKind;
  stage: SetupStage;
  farmId?: number;
  resourceId?: number;
  draft: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  errorCode?: string;
  errorMessage?: string;
}
