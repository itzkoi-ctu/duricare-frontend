export interface OwnerResponse {
  id: number;
  email: string;
  role: string;
  farmId: number;
  farmName: string;
  enabled: boolean;
  version: number;
  createdAt: string;
}

export interface OwnerPage {
  content: OwnerResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CreateOwnerRequest {
  email: string;
  initialPassword: string;
  farmId: number;
}

export interface UpdateOwnerStatusRequest {
  version: number;
  enabled: boolean;
  reason: string;
}

export interface EventResponse {
  eventId: number;
  ownerUserId: number;
  actorUserId: number;
  action: 'CREATE' | 'LOCK' | 'UNLOCK' | string;
  reason: string | null;
  fromEnabled: boolean | null;
  toEnabled: boolean;
  fromVersion?: number | null;
  version: number;
  occurredAt: string;
  // Backward compatibility aliases
  id?: number;
  timestamp?: string;
  previousState?: string | null;
  newState?: string;
}

export interface EventPage {
  content: EventResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface OwnerFilterParams {
  page?: number;
  size?: number;
  farmId?: number | null;
  enabled?: boolean | null;
}
