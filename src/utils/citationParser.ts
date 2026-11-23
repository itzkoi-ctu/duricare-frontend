import type { CitationGroup, ExtractedCitationsResult } from '../types/citation';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Validates and sanitizes an external source URL.
 * Only HTTP and HTTPS protocols are accepted.
 * URLs containing user credentials, non-HTTP protocols (javascript:, data:, file:),
 * or invalid syntax are safely rejected (returns null).
 */
export function sanitizeSourceUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    // Disallow credentials in URLs to prevent credential-leak or phishing attacks
    if (parsed.username || parsed.password) {
      return null;
    }
    // Must have a valid non-empty hostname
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

interface RawParsedEntry {
  sourceTitle: string;
  revisionNumber: number;
  chunkId: string;
  locator: string;
  tier?: string;
  year?: number;
  sourceUrl?: string;
  publicationId: string;
  sourceId: string;
  revisionId: string;
}

/**
 * Parses a single governed citation bullet line.
 * Format:
 * - <sourceTitle> | bản <rev> | đoạn <chunkUUID> | <locator> | tầng <tier>[ | năm <year>][ | <sourceUrl>] | publication <pubUUID> | source <sourceUUID> | revision <revUUID>
 */
export function parseCitationLine(line: string): RawParsedEntry | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('- ')) return null;

  const rawTokens = trimmed.slice(2).split(' | ').map(t => t.trim());
  if (rawTokens.length < 7) return null;

  // Last 3 tokens must be publication, source, revision
  const revToken = rawTokens[rawTokens.length - 1];
  const srcToken = rawTokens[rawTokens.length - 2];
  const pubToken = rawTokens[rawTokens.length - 3];

  const revMatch = revToken.match(/^revision\s+([0-9a-fA-F-]{36})$/);
  const srcMatch = srcToken.match(/^source\s+([0-9a-fA-F-]{36})$/);
  const pubMatch = pubToken.match(/^publication\s+([0-9a-fA-F-]{36})$/);

  if (!revMatch || !srcMatch || !pubMatch) return null;

  const revisionId = revMatch[1];
  const sourceId = srcMatch[1];
  const publicationId = pubMatch[1];

  if (!UUID_REGEX.test(revisionId) || !UUID_REGEX.test(sourceId) || !UUID_REGEX.test(publicationId)) {
    return null;
  }

  // First 5 tokens
  const sourceTitle = rawTokens[0];
  const revNumMatch = rawTokens[1].match(/^bản\s+(\d+)$/);
  const chunkMatch = rawTokens[2].match(/^đoạn\s+([0-9a-fA-F-]{36})$/);
  const locator = rawTokens[3];
  const tierMatch = rawTokens[4].match(/^tầng\s+(.+)$/);

  if (!sourceTitle || !revNumMatch || !chunkMatch || !locator || !tierMatch) {
    return null;
  }

  const chunkId = chunkMatch[1];
  if (!UUID_REGEX.test(chunkId)) return null;

  const revisionNumber = parseInt(revNumMatch[1], 10);
  const tier = tierMatch[1].trim();

  // Middle tokens between index 4 and (length - 3)
  let year: number | undefined;
  let sourceUrl: string | undefined;

  for (let i = 5; i < rawTokens.length - 3; i++) {
    const token = rawTokens[i];
    const yearMatch = token.match(/^năm\s+(\d{4})$/);
    if (yearMatch) {
      year = parseInt(yearMatch[1], 10);
    } else {
      const sanitized = sanitizeSourceUrl(token);
      if (sanitized) {
        sourceUrl = sanitized;
      }
    }
  }

  return {
    sourceTitle,
    revisionNumber,
    chunkId,
    locator,
    tier,
    year,
    sourceUrl,
    publicationId,
    sourceId,
    revisionId,
  };
}

/**
 * Groups raw parsed citation entries by `sourceId:revisionId`.
 * Multiple chunks with the same sourceId and revisionId are merged into one CitationGroup,
 * preserving individual chunk IDs and locators.
 * Different sources or different revisions of the same source are NEVER merged.
 */
export function groupCitations(entries: RawParsedEntry[]): CitationGroup[] {
  const groupMap = new Map<string, CitationGroup>();

  for (const entry of entries) {
    const groupId = `${entry.sourceId}:${entry.revisionId}`;
    let group = groupMap.get(groupId);

    if (!group) {
      group = {
        id: groupId,
        citationId: groupId,
        sourceTitle: entry.sourceTitle,
        revisionNumber: entry.revisionNumber,
        tier: entry.tier,
        year: entry.year,
        sourceUrl: entry.sourceUrl,
        publicationId: entry.publicationId,
        sourceId: entry.sourceId,
        revisionId: entry.revisionId,
        chunks: [],
      };
      groupMap.set(groupId, group);
    } else {
      // If later chunk provides a valid sourceUrl while initial didn't, adopt it
      if (!group.sourceUrl && entry.sourceUrl) {
        group.sourceUrl = entry.sourceUrl;
      }
    }

    // Add chunk if not already present
    const chunkExists = group.chunks.some(
      c => c.chunkId === entry.chunkId && c.locator === entry.locator
    );
    if (!chunkExists) {
      group.chunks.push({
        chunkId: entry.chunkId,
        locator: entry.locator,
      });
    }
  }

  return Array.from(groupMap.values());
}

/**
 * Checks whether an index in a string is inside a markdown code fence (``` or ~~~).
 */
function isInsideCodeBlock(text: string, matchIndex: number): boolean {
  const prefix = text.slice(0, matchIndex);
  const codeBlockMatches = prefix.match(/(?:```|~~~)/g);
  if (!codeBlockMatches) return false;
  // If count is odd, we are inside a code block
  return codeBlockMatches.length % 2 !== 0;
}

/**
 * Extracts governed RAG citations from message content.
 * If the exact server-generated footer `Căn cứ đã xác minh:` is found with valid citation lines,
 * it parses them into grouped citations and cleanly removes the footer from the markdown content.
 *
 * If content is in a code block, is malformed, or is legacy unsourced ("Căn cứ: ..."),
 * content is left completely untouched and no citations are extracted.
 */
export function extractCitations(content: string): ExtractedCitationsResult {
  if (!content || typeof content !== 'string') {
    return { cleanContent: '', citations: [], hasRawFooter: false };
  }

  // Look for the exact header pattern "Căn cứ đã xác minh:" preceded by newlines or at start
  const headerRegex = /(?:^|\r?\n\r?\n)Căn cứ đã xác minh:\r?\n/g;
  let match: RegExpExecArray | null;

  while ((match = headerRegex.exec(content)) !== null) {
    const matchStart = match.index;
    const headerEnd = matchStart + match[0].length;

    // Must not be inside a code fence
    if (isInsideCodeBlock(content, matchStart)) {
      continue;
    }

    // Examine following lines until empty line or end of text
    const followingText = content.slice(headerEnd);
    const lines = followingText.split(/\r?\n/);
    const parsedEntries: RawParsedEntry[] = [];
    let linesConsumed = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        // Empty line indicates end of citation list
        break;
      }
      if (!trimmed.startsWith('- ')) {
        // Non-bullet line indicates end of citation list
        break;
      }
      const parsed = parseCitationLine(line);
      if (!parsed) {
        // If a bullet line fails validation, this entire block is not a valid governed block
        parsedEntries.length = 0;
        break;
      }
      parsedEntries.push(parsed);
      linesConsumed++;
    }

    if (parsedEntries.length > 0) {
      // Calculate exact end index of the citation block in the original text
      let consumedChars = 0;
      let temp = followingText;
      for (let i = 0; i < linesConsumed; i++) {
        const lineLen = lines[i].length;
        consumedChars += lineLen;
        temp = temp.slice(lineLen);
        if (temp.startsWith('\r\n')) {
          consumedChars += 2;
          temp = temp.slice(2);
        } else if (temp.startsWith('\n')) {
          consumedChars += 1;
          temp = temp.slice(1);
        }
      }
      const blockEnd = headerEnd + consumedChars;

      // Reconstruct clean content: preserve text before and text after
      const before = content.slice(0, matchStart).trimEnd();
      const after = content.slice(blockEnd).trimStart();
      const cleanContent = after ? `${before}\n\n${after}` : before;

      const grouped = groupCitations(parsedEntries);
      return {
        cleanContent,
        citations: grouped,
        hasRawFooter: true,
      };
    }
  }

  // Fallback: no valid governed citations found
  return {
    cleanContent: content,
    citations: [],
    hasRawFooter: false,
  };
}

/**
 * Strips the recognized server footer `Căn cứ đã xác minh:\n...` from markdown prose.
 * Only recognized bullet citation lines attached to the header are stripped.
 * Preserves all other content before and after the footer block.
 */
export function stripCitationFooter(content: string): string {
  if (!content || typeof content !== 'string') return '';
  const result = extractCitations(content);
  return result.hasRawFooter ? result.cleanContent : content;
}

/**
 * Validates whether a wire citation group conforms to the approved RAG-ORIGIN C0 wire contract shape.
 * Requires complete identity fields (citationId, sourceId, revisionId, publicationId, sourceTitle)
 * and a non-empty array of valid chunks.
 * Rejects null, undefined, non-objects, or incomplete groups without valid source identity.
 */
export function isValidWireCitationGroup(wire: any): boolean {
  if (!wire || typeof wire !== 'object' || Array.isArray(wire)) {
    return false;
  }

  const citationId =
    (typeof wire.citationId === 'string' && wire.citationId.trim()) ||
    (typeof wire.id === 'string' && wire.id.trim());
  if (!citationId) {
    return false;
  }

  const sourceTitle = typeof wire.sourceTitle === 'string' && wire.sourceTitle.trim();
  if (!sourceTitle) {
    return false;
  }

  const sourceId = typeof wire.sourceId === 'string' && wire.sourceId.trim();
  if (!sourceId) {
    return false;
  }

  const revisionId = typeof wire.revisionId === 'string' && wire.revisionId.trim();
  if (!revisionId) {
    return false;
  }

  const publicationId = typeof wire.publicationId === 'string' && wire.publicationId.trim();
  if (!publicationId) {
    return false;
  }

  if (!Array.isArray(wire.chunks) || wire.chunks.length === 0) {
    return false;
  }

  for (const ch of wire.chunks) {
    if (!ch || typeof ch !== 'object' || Array.isArray(ch)) {
      return false;
    }
    const chunkId = typeof ch.chunkId === 'string' && ch.chunkId.trim();
    if (!chunkId) {
      return false;
    }
  }

  return true;
}

/**
 * Adapts a wire citation group from the backend RAG-ORIGIN C0 envelope into a view CitationGroup.
 * Validates the wire shape and returns null if malformed or incomplete.
 * Generating presentation fallbacks must NOT promote a null or invalid group into an authenticated citation.
 */
export function adaptWireCitationGroup(wire: any, _index = 0): CitationGroup | null {
  if (!isValidWireCitationGroup(wire)) {
    return null;
  }

  const citationId = ((typeof wire.citationId === 'string' && wire.citationId.trim()) || wire.id.trim()) as string;

  return {
    id: citationId,
    citationId,
    sourceTitle: wire.sourceTitle.trim(),
    revisionNumber: typeof wire.revisionNumber === 'number' ? wire.revisionNumber : 1,
    tier: wire.tier,
    year: typeof wire.year === 'number' ? wire.year : undefined,
    sourceUrl: sanitizeSourceUrl(wire.sourceUrl),
    publicationId: wire.publicationId.trim(),
    sourceId: wire.sourceId.trim(),
    revisionId: wire.revisionId.trim(),
    originClass: wire.originClass,
    authorState: wire.authorState,
    publicAuthorName: wire.publicAuthorName ?? null,
    originStatus: wire.originStatus,
    chunks: wire.chunks.map((ch: any) => ({
      chunkId: ch.chunkId.trim(),
      locator: ch.locator || '',
      contentHash: ch.contentHash,
      detailPath: ch.detailPath,
      content: ch.content,
    })),
  };
}

/**
 * Resolves a message-scoped citation detailPath against the shared Axios client.
 * The backend wire contract returns paths starting with `/api/agent/conversations/...`.
 * Since Axios client baseURL already includes `/api` (e.g. `/api` or `http://host:port/api`),
 * passing `/api/...` causes Axios to generate `/api/api/...`.
 *
 * This function validates the permitted path shape and strips the redundant `/api` prefix
 * so Axios resolves it to `/api/agent/...` exactly once.
 */
export function resolveCitationDetailEndpoint(
  detailPath?: string | null,
  context?: { conversationId?: string; messageId?: string | number; citationId?: string; chunkId?: string },
): string | null {
  if (detailPath && typeof detailPath === 'string') {
    const trimmed = detailPath.trim();
    // Validate path safety: must NOT have scheme/protocol (http:, https:, etc.), host (//), or path traversal (..)
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || trimmed.startsWith('//') || trimmed.includes('..')) {
      return null;
    }

    // Permitted backend wire pattern:
    // /api/agent/conversations/<id>/messages/<id>/citations/<id>/chunks/<id>
    // or /agent/conversations/<id>/messages/<id>/citations/<id>/chunks/<id>
    const wirePattern = /^(?:\/api)?(\/agent\/conversations\/[a-zA-Z0-9_-]+\/messages\/[a-zA-Z0-9_-]+\/citations\/[a-zA-Z0-9_-]+\/chunks\/[a-zA-Z0-9_-]+)$/;
    const wireMatch = trimmed.match(wirePattern);
    if (wireMatch) {
      return wireMatch[1];
    }

    // Fallback pattern for safe endpoints under /agent/
    const fallbackPattern = /^(?:\/api)?(\/agent\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*)$/;
    const fallbackMatch = trimmed.match(fallbackPattern);
    if (fallbackMatch) {
      return fallbackMatch[1];
    }
    return null;
  }

  // Canonical fallback when detailPath is not provided on chunk
  if (context?.conversationId && context.messageId && context.citationId && context.chunkId) {
    return `/agent/conversations/${encodeURIComponent(context.conversationId)}/messages/${encodeURIComponent(
      String(context.messageId),
    )}/citations/${encodeURIComponent(context.citationId)}/chunks/${encodeURIComponent(context.chunkId)}`;
  }

  return null;
}
