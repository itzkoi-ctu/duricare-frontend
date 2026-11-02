/**
 * RAG-PUB-001 Types definition according to frozen contract & API-SCHEMAS.json
 * Proposal v0.1 - urn:duricare:rag-pub-001:proposal:v0.1
 */

export type PublicationStatus = 'PENDING' | 'ACTIVE' | 'SUPERSEDED' | 'REVOKED';

export type JobKind = 'INDEX' | 'CLEANUP';

export type JobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'RETRY_WAIT'
  | 'WAITING_GATE'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export type JobPhase =
  | 'VALIDATE'
  | 'EMBED'
  | 'INDEX'
  | 'VERIFY'
  | 'ACTIVATE'
  | 'CLEANUP';

export type RunStatus =
  | 'RUNNING'
  | 'VERIFIED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export type JobErrorCode =
  | 'EMBEDDING_TIMEOUT'
  | 'VECTOR_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'MANIFEST_MISMATCH'
  | 'FINGERPRINT_MISMATCH'
  | 'LEASE_EXPIRED'
  | 'CANCELLED'
  | 'INELIGIBLE_SNAPSHOT'
  | 'CLEANUP_FAILED'
  | 'GATE_UNAVAILABLE'
  | 'RETRY_EXHAUSTED';

export type PublicationOperation =
  | 'PUBLISH'
  | 'RETRY_INDEX'
  | 'REVOKE'
  | 'RETRY_CLEANUP';

export type PublicationEventAction =
  | 'REQUESTED'
  | 'RETRY_REQUESTED'
  | 'REVOKED'
  | 'CLAIMED'
  | 'LEASE_EXPIRED'
  | 'VERIFIED'
  | 'WAITING_GATE'
  | 'ACTIVATED'
  | 'SUPERSEDED'
  | 'JOB_FAILED'
  | 'CLEANUP_QUEUED'
  | 'CLEANUP_SUCCEEDED'
  | 'CANCELLED';

export interface PublicationHead {
  sourceId: string;
  version: number;
  generation: number;
  activePublicationId: string | null;
  pendingPublicationId: string | null;
  updatedAt: string | null;
}

export interface Fingerprint {
  projectionVersion: 1;
  embeddingModelId: string;
  embeddingModelRevision: string;
  dimension: number;
  distance: 'COSINE';
  collection: string;
}

export interface RetrievalChunk {
  chunkId: string;
  position: number;
  chunkTitle: string;
  topic: 'IRRIGATION' | 'FERTILIZATION' | 'GENERAL';
  stage: string | null;
  content: string;
  locator: string;
}

export interface RetrievalManifest {
  sourceId: string;
  revisionId: string;
  revisionNumber: number;
  sourceTitle: string;
  sourceUrl: string | null;
  year: number | null;
  edition: string | null;
  assessedTier: 'A' | 'B' | 'C' | 'D' | 'E';
  tierPolicyVersion: 'DURI-1B-v1';
  chunks: RetrievalChunk[];
}

export interface PublicationSummary {
  id: string;
  sourceId: string;
  revisionId: string;
  revisionNumber: number;
  generation: number;
  status: PublicationStatus;
  sourceTitle: string;
  assessedTier: 'A' | 'B' | 'C' | 'D' | 'E';
  chunkCount: number;
  manifestHash: string;
  createdAt: string;
  activatedAt: string | null;
  revokedAt: string | null;
  latestJobId: string | null;
}

export interface JobSummary {
  id: string;
  publicationId: string;
  kind: JobKind;
  status: JobStatus;
  phase: JobPhase | null;
  claimCount: number;
  maxClaims: 5;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
  errorCode: JobErrorCode | null;
}

export interface RunSummary {
  id: string;
  jobId: string;
  publicationId: string;
  fence: number;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  expectedPoints: number;
  verifiedPoints: number;
  receiptHash: string | null;
  errorCode: JobErrorCode | null;
}

export interface PagePublicationSummary {
  content: PublicationSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PageJobSummary {
  content: JobSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PageRunSummary {
  content: RunSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CleanupTarget {
  publicationId: string;
  indexRunIds: string[] | null;
}

export interface PublicationDetail {
  head: PublicationHead;
  publication: PublicationSummary;
  manifest: RetrievalManifest;
  fingerprint: Fingerprint;
  acceptedIndexRunId: string | null;
  jobs: PageJobSummary;
}

export interface JobDetail {
  head: PublicationHead;
  job: JobSummary;
  cleanupTarget: CleanupTarget | null;
  runs: PageRunSummary;
}

export interface MutationReceipt {
  requestId: string;
  operation: PublicationOperation;
  committedAt: string;
  replayed: boolean;
  head: PublicationHead;
  publication: PublicationSummary;
  job: JobSummary | null;
}

export interface OperationReceipt {
  requestId: string;
  operation: PublicationOperation;
  committedAt: string;
  responseStatus: 200 | 202;
  response: MutationReceipt;
}

export interface PublicationEvent {
  id: string;
  publicationId: string;
  sourceId: string;
  jobId: string | null;
  runId: string | null;
  actorUserId: number | null;
  actorKind: 'ADMIN' | 'WORKER';
  action: PublicationEventAction | string;
  reason: string | null;
  occurredAt: string;
  previousStatus: PublicationStatus | null;
  newStatus: PublicationStatus | null;
}

export interface PagePublicationEvent {
  content: PublicationEvent[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PublishRequest {
  requestId: string;
  version: number;
  revisionId: string;
  revisionVersion: number;
  reason: string;
  disclosureConfirmed: true;
}

export interface RetryRequest {
  requestId: string;
  version: number;
  reason: string;
}

export interface RevokeRequest {
  requestId: string;
  version: number;
  reason: string;
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface PublicationError {
  error: 'validation' | 'not_found' | 'conflict' | 'request_too_large' | 'unavailable' | 'internal_error' | string;
  code:
    | 'invalid_request'
    | 'publication_ineligible'
    | 'invalid_page'
    | 'not_found'
    | 'stale_version'
    | 'idempotency_key_reused'
    | 'already_active'
    | 'pending_publication_exists'
    | 'invalid_state'
    | 'live_job_exists'
    | 'already_revoked'
    | 'fingerprint_changed'
    | 'request_too_large'
    | 'publication_disabled'
    | 'publication_schema_not_ready'
    | 'publication_config_not_ready'
    | 'internal_error'
    | string;
  message: string;
  fieldErrors: FieldError[];
}

export interface Provenance {
  kind: 'GOVERNED';
  publicationId: string;
  indexRunId: string;
  sourceId: string;
  revisionId: string;
  revisionNumber: number;
  chunkId: string;
  locator: string;
  manifestHash: string;
  contentHash: string;
  tierPolicyVersion: 'DURI-1B-v1';
}

export interface IndeterminateOperation {
  requestId: string;
  sourceId: string;
  targetId: string;
  operation: 'PUBLISH' | 'REVOKE' | 'RETRY_INDEX' | 'RETRY_CLEANUP';
  reason: string;
  version: number;
  occurredAt: string;
  errorMessage?: string;
}
