export type SourceType =
  | 'OFFICIAL_DOCUMENT'
  | 'RESEARCH_PUBLICATION'
  | 'RESEARCH_INSTITUTE_GUIDE'
  | 'COOPERATIVE_MANUAL'
  | 'COMMERCIAL_GUIDE'
  | 'FIELD_INTERVIEW'
  | 'OTHER';

export type RevisionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type Topic = 'IRRIGATION' | 'FERTILIZATION' | 'GENERAL';

export type Tier = 'A' | 'B' | 'C' | 'D' | 'E' | 'UNKNOWN';

export type GrowthStage =
  | 'KIEN_THIET_CO_BAN'
  | 'XIET_NUOC'
  | 'RA_HOA'
  | 'DAU_TRAI'
  | 'PHAT_TRIEN_TRAI'
  | 'TRUOC_THU_HOACH'
  | 'CHIN_THU_HOACH';

export interface KnowledgeMetadata {
  title: string;
  authors: string | null;
  publisher: string | null;
  sourceType: SourceType;
  year: number | null;
  edition: string | null;
  sourceUrl: string | null;
  evidenceReference: string | null;
  provenanceNotes: string | null;
  proposedTier: Tier;
  proposedTierRationale: string | null;
}

export interface KnowledgeChunk {
  chunkId?: string | null;
  title: string;
  topic: Topic;
  stage: GrowthStage | null;
  content: string;
  originalExcerpt: string;
  locator: string;
  applicabilityNotes?: string | null;
  measurementNotes?: string | null;
}

export interface KnowledgeChunkResponse {
  chunkId: string;
  position: number;
  title: string;
  topic: Topic;
  stage: GrowthStage | null;
  content: string;
  originalExcerpt: string;
  locator: string;
  applicabilityNotes: string | null;
  measurementNotes: string | null;
}

export interface CreateSourceRequest {
  metadata: KnowledgeMetadata;
  chunks: KnowledgeChunk[];
}

export interface SaveRevisionRequest {
  version: number;
  metadata: KnowledgeMetadata;
  chunks: KnowledgeChunk[];
}

export interface RevisionSummary {
  id: string;
  sourceId: string;
  revisionNumber: number;
  status: RevisionStatus;
  title: string;
  version: number;
  submittedAt: string | null;
  updatedAt: string | null;
}

export interface SourceResponse {
  id: string;
  ownerUserId: number;
  ownerDisplayName: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  latestRevision: RevisionSummary | null;
  latestRevisionId: string | null;
}

export interface RevisionResponse {
  id: string;
  sourceId: string;
  revisionNumber: number;
  status: RevisionStatus;
  title: string;
  version: number;
  submittedAt: string | null;
  updatedAt: string | null;
  baseRevisionId: string | null;
  metadata: KnowledgeMetadata;
  chunks: KnowledgeChunkResponse[];
  createdAt: string;
  closedAt: string | null;
  tierPolicyVersion: string;
  assessedTier: Tier | null;
  tierRationale: string | null;
  activeAssignment: unknown | null;
  decision: unknown | null;
}

export interface CreatedResponse {
  source: SourceResponse;
  revision: RevisionResponse;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuditResponse {
  id: string;
  sourceId: string;
  revisionId: string | null;
  assignmentId: string | null;
  actorUserId: number;
  actorDisplayName: string;
  occurredAt: string;
  action: string;
  previousStatus: RevisionStatus | null;
  newStatus: RevisionStatus | null;
  reason: string | null;
  previousVersion: number | null;
  newVersion: number | null;
  metadata: Record<string, unknown> | null;
}

export interface GovernanceFieldError {
  field: string;
  code: string;
  message: string;
}

export interface GovernanceErrorResponse {
  error: string;
  code?: string;
  message: string;
  fieldErrors?: GovernanceFieldError[];
}
