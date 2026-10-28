import { useState, useEffect, useCallback, useRef } from 'react';
import { getSource, getRevision, listRevisions, parseGovernanceError } from '../api/governance';
import type { SourceResponse, RevisionResponse, RevisionSummary } from '../types/governance';

export function useKnowledgeSourceDetail(sourceId: string | undefined, initialRevisionId?: string) {
  const [source, setSource] = useState<SourceResponse | null>(null);
  const [revision, setRevision] = useState<RevisionResponse | null>(null);
  const [revisionsList, setRevisionsList] = useState<RevisionSummary[]>([]);
  const [loading, setLoading] = useState(Boolean(sourceId));
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(!sourceId);

  const activeRequestRef = useRef<AbortController | null>(null);
  const activeSelectionControllerRef = useRef<AbortController | null>(null);
  const selectionGenerationRef = useRef<number>(0);
  const currentSourceIdRef = useRef<string | undefined>(sourceId);
  const selectedRevIdRef = useRef<string | undefined>(initialRevisionId);
  const prevSourceIdRef = useRef<string | undefined>(sourceId);

  // If sourceId changes within the same mounted instance, reset selected revision and state
  // to prevent foreign revision retention from a previous source
  if (prevSourceIdRef.current !== sourceId) {
    prevSourceIdRef.current = sourceId;
    currentSourceIdRef.current = sourceId;
    selectedRevIdRef.current = initialRevisionId;
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    activeSelectionControllerRef.current?.abort();
    activeSelectionControllerRef.current = null;
    selectionGenerationRef.current++;
    setSource(null);
    setRevision(null);
    setRevisionsList([]);
  }

  useEffect(() => {
    selectedRevIdRef.current = initialRevisionId;
  }, [initialRevisionId]);

  const fetchDetail = useCallback(
    async (signal?: AbortSignal, specificRevId?: string): Promise<{ source: SourceResponse; revision: RevisionResponse | null }> => {
      if (!sourceId) {
        throw new Error('No sourceId provided');
      }

      const thisGen = selectionGenerationRef.current;
      const targetSourceId = sourceId;
      const initialIntendedRevId = specificRevId || selectedRevIdRef.current;

      const srcData = await getSource(sourceId, signal);
      if (
        signal?.aborted ||
        thisGen !== selectionGenerationRef.current ||
        targetSourceId !== currentSourceIdRef.current
      ) {
        throw new Error('Request aborted or superseded');
      }
      setSource(srcData);

      // Fetch revisions list
      let revs: RevisionSummary[] = [];
      try {
        const revsPage = await listRevisions(sourceId, 0, 50, signal);
        revs = revsPage.content;
      } catch {
        if (srcData.latestRevision) {
          revs = [srcData.latestRevision];
        }
      }
      if (
        signal?.aborted ||
        thisGen !== selectionGenerationRef.current ||
        targetSourceId !== currentSourceIdRef.current
      ) {
        throw new Error('Request aborted or superseded');
      }
      setRevisionsList(revs);

      // Determine target revision ID:
      const targetRevId = initialIntendedRevId || selectedRevIdRef.current;
      const defaultRevId = srcData.latestRevisionId || srcData.latestRevision?.id;

      // Fetch target revision details and verify that it strictly belongs to this source
      let revData: RevisionResponse | null = null;
      const revToFetch = targetRevId || defaultRevId;
      if (revToFetch) {
        try {
          const fetched = await getRevision(revToFetch, signal);
          if (fetched.sourceId === srcData.id) {
            revData = fetched;
          } else if (defaultRevId && defaultRevId !== revToFetch) {
            revData = await getRevision(defaultRevId, signal);
          }
        } catch (err: unknown) {
          if (signal?.aborted) {
            throw err;
          }
          // If revToFetch was foreign/invalid (and not defaultRevId), try fallback to defaultRevId
          if (defaultRevId && defaultRevId !== revToFetch) {
            try {
              revData = await getRevision(defaultRevId, signal);
            } catch (fallbackErr: unknown) {
              if (signal?.aborted) throw fallbackErr;
              throw fallbackErr;
            }
          } else {
            // Genuine HTTP/network error for the active revision: rethrow so valid state is preserved
            throw err;
          }
        }
      }

      // STRICT VALIDATION before setting revision state:
      // 1. Was the request aborted?
      // 2. Was a newer selection or reload started (generation mismatch)?
      // 3. Did the user navigate to another source?
      // 4. Did the user select a different revision while this request was in flight?
      if (
        signal?.aborted ||
        thisGen !== selectionGenerationRef.current ||
        targetSourceId !== currentSourceIdRef.current ||
        (selectedRevIdRef.current && revData && revData.id !== selectedRevIdRef.current)
      ) {
        // Late or superseded response: do NOT write stale revision to state!
        return { source: srcData, revision: null };
      }

      setRevision(revData);
      if (revData) {
        selectedRevIdRef.current = revData.id;
      }
      setNotFound(false);
      setError(null);
      return { source: srcData, revision: revData };
    },
    [sourceId]
  );

  const reload = useCallback(async (): Promise<{ source: SourceResponse; revision: RevisionResponse | null }> => {
    if (!sourceId) throw new Error('No sourceId provided');

    // Invalidate and cancel any ongoing request and selection
    activeRequestRef.current?.abort();
    activeSelectionControllerRef.current?.abort();

    const controller = new AbortController();
    activeRequestRef.current = controller;

    const thisGen = ++selectionGenerationRef.current;
    const targetSourceId = sourceId;
    const targetRevId = selectedRevIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const res = await fetchDetail(controller.signal, targetRevId);
      if (
        controller.signal.aborted ||
        thisGen !== selectionGenerationRef.current ||
        targetSourceId !== currentSourceIdRef.current
      ) {
        return { source: res.source, revision: null };
      }
      return res;
    } catch (err: unknown) {
      if (
        controller.signal.aborted ||
        thisGen !== selectionGenerationRef.current ||
        targetSourceId !== currentSourceIdRef.current
      ) {
        return { source: null as unknown as SourceResponse, revision: null };
      }
      const parsed = parseGovernanceError(err, 'Không thể tải thông tin nguồn tri thức.');
      if (parsed.status === 404) {
        setNotFound(true);
      } else {
        setError(parsed.message);
      }
      throw err;
    } finally {
      if (
        !controller.signal.aborted &&
        thisGen === selectionGenerationRef.current &&
        targetSourceId === currentSourceIdRef.current
      ) {
        setLoading(false);
      }
    }
  }, [sourceId, fetchDetail]);

  const selectRevision = useCallback(
    async (revId: string) => {
      if (!sourceId) return;

      // Invalidate and cancel any in-flight reload or initial fetch requests
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;

      activeSelectionControllerRef.current?.abort();
      const controller = new AbortController();
      activeSelectionControllerRef.current = controller;

      const thisGen = ++selectionGenerationRef.current;
      const targetSourceId = sourceId;

      selectedRevIdRef.current = revId;
      setLoading(true);
      setError(null);

      try {
        const revData = await getRevision(revId, controller.signal);

        if (
          controller.signal.aborted ||
          thisGen !== selectionGenerationRef.current ||
          targetSourceId !== currentSourceIdRef.current ||
          revData.sourceId !== targetSourceId
        ) {
          return;
        }

        setRevision(revData);
        selectedRevIdRef.current = revData.id;
      } catch (err: unknown) {
        if (
          controller.signal.aborted ||
          thisGen !== selectionGenerationRef.current ||
          targetSourceId !== currentSourceIdRef.current
        ) {
          return;
        }
        const parsed = parseGovernanceError(err, 'Không thể tải phiên bản nguồn tri thức.');
        setError(parsed.message);
      } finally {
        if (
          !controller.signal.aborted &&
          thisGen === selectionGenerationRef.current &&
          targetSourceId === currentSourceIdRef.current
        ) {
          setLoading(false);
        }
      }
    },
    [sourceId]
  );

  const setRevisionDirectly = useCallback((updated: RevisionResponse) => {
    // Invalidate and cancel any in-flight reload or selection requests
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    activeSelectionControllerRef.current?.abort();
    activeSelectionControllerRef.current = null;
    selectionGenerationRef.current++;

    selectedRevIdRef.current = updated.id;
    setRevision(updated);
    setRevisionsList(prev =>
      prev.map(r => (r.id === updated.id ? { ...r, status: updated.status, version: updated.version } : r))
    );
  }, []);

  useEffect(() => {
    if (!sourceId) return;

    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setLoading(true);
    setError(null);

    fetchDetail(controller.signal)
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          const parsed = parseGovernanceError(err, 'Không thể tải thông tin nguồn tri thức.');
          if (parsed.status === 404) {
            setNotFound(true);
          } else {
            setError(parsed.message);
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
      activeSelectionControllerRef.current?.abort();
      selectionGenerationRef.current++;
    };
  }, [sourceId, fetchDetail]);

  return {
    source,
    revision,
    revisionsList,
    loading,
    error,
    notFound,
    reload,
    selectRevision,
    setRevisionDirectly,
  };
}
