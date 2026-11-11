/**
 * FE-KNOWLEDGE-IMPORT-001 Types definition according to frozen contract & API-SCHEMAS.json
 * Revision: C0-v2-P1-2026-11-09
 * Aggregate SHA-256: f7f91ddbedd2dcf24dc31de3712c6ef951fa5442b3a71bbb25973ec075a3f6a8
 */

import type {
  GrowthStage,
  KnowledgeMetadata,
  SourceType,
  Topic,
  CreatedResponse,
} from './governance';

export type { GrowthStage, KnowledgeMetadata, SourceType, Topic, CreatedResponse };

export type WarningCode =
  | 'PDF_READING_ORDER_REVIEW'
  | 'DOCX_LAYOUT_REVIEW'
  | 'TRACKED_CHANGES_VIEW'
  | 'HEADERS_FOOTERS_OMITTED'
  | 'COMMENTS_OMITTED'
  | 'FOOTNOTES_ENDNOTES_OMITTED'
  | 'DRAWING_TEXT_OMITTED'
  | 'FIELD_RESULT_REVIEW'
  | 'EXTERNAL_LINK_IGNORED'
  | 'LOCATOR_REVIEW'
  | 'MANUAL_CHUNKING_REQUIRED'
  | 'EXTRACTION_NOT_EXPERT_REVIEW';

export type LocatorKind =
  | 'LINES'
  | 'MARKDOWN'
  | 'PDF_PAGE'
  | 'DOCX_PARAGRAPH'
  | 'DOCX_CELL';

export interface Locator {
  kind: LocatorKind;
  display: string;
  lineStart: number | null;
  lineEnd: number | null;
  pageStart: number | null;
  pageEnd: number | null;
  paragraph: number | null;
  table: number | null;
  row: number | null;
  cell: number | null;
  heading: string | null;
}

export interface Span {
  segmentId: number;
  start: number;
  end: number;
}

export interface Segment {
  id: number;
  start: number;
  end: number;
  locator: Locator;
}

export interface Counters {
  utf16Units: number;
  utf8Bytes: number;
  segments: number;
  pages: number | null;
  paragraphs: number;
  tables: number;
  cells: number;
  zipEntries: number;
  inflatedBytes: number;
}

export interface FileInfo {
  displayName: string;
  mediaType: string;
  bytes: number;
  sha256: string;
}

export interface Extraction {
  parser: 'JDK-UTF8' | 'PDFBox' | 'JDK-DOCX';
  parserVersion: string;
  normalization: 'DURI-IMPORT-TEXT-1';
  text: string;
  textSha256: string;
  segments: Segment[];
  warnings: WarningCode[];
  counters: Counters;
  truncated: false;
}

export interface ProposedChunk {
  proposalId: number;
  title: string;
  topic: null;
  stage: null;
  content: string;
  originalExcerpt: string;
  locator: string;
  selectedSpans: Span[];
}

export interface MetadataSuggestion {
  title: null;
  sourceType: null;
  proposedTier: 'UNKNOWN';
}

export type ChunkingStatus = 'PROPOSED' | 'MANUAL_REQUIRED';

export type SessionState = 'READY' | 'CONSUMED' | 'CANCELLED';

export type LocatorStatus = 'EXACT_SPAN' | 'USER_VERIFIED' | 'UNVERIFIED';

export interface Binding {
  clientChunkKey: string;
  selectedSpans: Span[];
  locatorStatus: LocatorStatus;
}

export interface ChunkInput {
  clientChunkKey: string;
  title: string;
  topic: Topic;
  stage: GrowthStage | null;
  content: string;
  originalExcerpt: string | null;
  locator: string | null;
  applicabilityNotes: string | null;
  measurementNotes: string | null;
}

export interface ConfirmRequest {
  requestId: string;
  version: number;
  reviewConfirmed: true;
  metadata: KnowledgeMetadata;
  chunks: ChunkInput[];
  bindings: Binding[];
}

export interface ChunkMapping {
  clientChunkKey: string;
  chunkId: string;
}

export interface ConfirmReceipt {
  importId: string;
  documentId: string;
  snapshotId: string;
  confirmedAt: string;
  requestId: string;
  replayed: boolean;
  created: CreatedResponse;
  chunkMappings: ChunkMapping[];
}

export interface PreviewSession {
  id: string;
  version: number;
  state: SessionState;
  createdAt: string;
  expiresAt: string;
  purgeAfter: string;
  file: FileInfo;
  extraction: Extraction | null;
  metadataSuggestion: MetadataSuggestion | null;
  proposals: ProposedChunk[];
  chunkingStatus: ChunkingStatus | null;
  receipt: ConfirmReceipt | null;
}

export interface SessionSummary {
  id: string;
  version: number;
  state: SessionState;
  createdAt: string;
  expiresAt: string;
  purgeAfter: string;
  file: FileInfo;
}

export interface SessionPage {
  content: SessionSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Limits {
  fileBytes: number;
  requestBytes: number;
  confirmBytes: number;
  extractedUtf16Units: number;
  pages: number;
  chunks: number;
  chunkUtf16Units: number;
  previewTtlSeconds: number;
}

export interface Capabilities {
  enabled: boolean;
  formats: string[];
  ocr: false;
  maxFiles: 1;
  limits: Limits;
}

export interface ChunkLineage {
  chunkId: string;
  contentSha256: string;
  locator: string | null;
  locatorStatus: LocatorStatus;
  selectedSpans: Span[];
}

export interface Snapshot {
  id: string;
  revisionId: string;
  draftSaveSequence: number;
  metadataSha256: string;
  chunksSha256: string;
  savedAt: string;
  actorUserId: number;
  omittedUtf16Units: number | null;
  chunks: ChunkLineage[];
}

export interface Document {
  id: string;
  importId: string;
  sourceId: string;
  createdAt: string;
  file: FileInfo;
  extraction: Extraction;
}

export type ProvenanceOrigin = 'MANUAL' | 'IMPORTED';

export type ProvenanceStatus = 'NOT_APPLICABLE' | 'CURRENT' | 'STALE_SNAPSHOT';

export interface ProvenanceView {
  origin: ProvenanceOrigin;
  status: ProvenanceStatus;
  revisionId: string;
  document: Document | null;
  snapshot: Snapshot | null;
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface ImportError {
  error: string;
  code: string;
  message: string;
  fieldErrors: FieldError[];
}

export interface FrozenConfirmRecord {
  importId: string;
  version: number;
  requestId: string;
  contentSignature: string;
  preparedRequest: ConfirmRequest;
  inFlight: boolean;
  outcome?: 'uncertain' | 'error' | 'success';
  errorMessage?: string | null;
}
