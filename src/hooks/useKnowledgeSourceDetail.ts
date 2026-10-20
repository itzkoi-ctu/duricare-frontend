import { useState, useEffect, useCallback, useRef } from 'react';
import { getSource, getRevision, parseGovernanceError } from '../api/governance';
import type { SourceResponse, RevisionResponse } from '../types/governance';

export function useKnowledgeSourceDetail(sourceId: string | undefined) {
  const [source, setSource] = useState<SourceResponse | null>(null);
  const [revision, setRevision] = useState<RevisionResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(sourceId));
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(!sourceId);
  const [reloadKey, setReloadKey] = useState(0);

  const activeRequestRef = useRef<AbortController | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (!sourceId) return;

    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }
    const controller = new AbortController();
    activeRequestRef.current = controller;

    getSource(sourceId, controller.signal)
      .then(async srcData => {
        if (controller.signal.aborted) return;
        setSource(srcData);

        if (srcData.latestRevisionId) {
          try {
            const revData = await getRevision(srcData.latestRevisionId, controller.signal);
            if (!controller.signal.aborted) {
              setRevision(revData);
            }
          } catch (revErr) {
            if (!controller.signal.aborted) {
              const parsed = parseGovernanceError(revErr, 'Không thể tải phiên bản nguồn tri thức.');
              setError(parsed.message);
            }
          }
        }
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        const parsed = parseGovernanceError(err, 'Không thể tải thông tin nguồn tri thức.');
        if (parsed.status === 404) {
          setNotFound(true);
        } else {
          setError(parsed.message);
        }
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [sourceId, reloadKey]);

  return {
    source,
    revision,
    loading,
    error,
    notFound,
    reload,
  };
}
