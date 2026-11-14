export interface CitationChunk {
  chunkId: string;
  locator: string;
}

export interface CitationGroup {
  id: string; // Composite key: `${sourceId}:${revisionId}`
  sourceTitle: string;
  revisionNumber: number;
  tier?: string;
  year?: number;
  sourceUrl?: string;
  publicationId: string;
  sourceId: string;
  revisionId: string;
  chunks: CitationChunk[];
}

export interface ExtractedCitationsResult {
  cleanContent: string;
  citations: CitationGroup[];
  hasRawFooter: boolean;
}
