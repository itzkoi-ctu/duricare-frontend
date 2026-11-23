export type OriginClass = 'EXPERT_AUTHORED' | 'EXTERNAL_REFERENCE' | 'UNDETERMINED' | string;
export type AuthorState = 'NAMED' | 'UNKNOWN' | 'WITHHELD' | string;
export type OriginStatus = 'REVIEWED' | 'LEGACY_UNDETERMINED' | string;

export interface CitationChunk {
  chunkId: string;
  locator: string;
  contentHash?: string;
  detailPath?: string;
  content?: string;
}

export interface CitationGroup {
  id: string; // View key, guaranteed to be defined (mapped from citationId ?? `${sourceId}:${revisionId}`)
  citationId: string;
  sourceTitle: string;
  revisionNumber: number;
  tier?: string;
  year?: number;
  sourceUrl?: string | null;
  publicationId: string;
  sourceId: string;
  revisionId: string;
  originClass?: OriginClass;
  authorState?: AuthorState;
  publicAuthorName?: string | null;
  originStatus?: OriginStatus;
  chunks: CitationChunk[];
}

export interface StructuredCitationsEnvelope {
  schemaVersion: number;
  status: 'VERIFIED_CONTEXT' | 'LEGACY_REFERENCE' | 'NONE';
  supportLevel: 'RETRIEVED_CONTEXT' | string;
  groups: CitationGroup[];
  claimLinks?: unknown[];
}

export interface ExtractedCitationsResult {
  cleanContent: string;
  citations: CitationGroup[];
  hasRawFooter: boolean;
}
