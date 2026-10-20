import { useState, useEffect, useCallback, useRef } from 'react';
import { getSourceHistory, parseGovernanceError } from '../api/governance';
import type { PageResponse, AuditResponse } from '../types/governance';

export function useKnowledgeHistory(sourceId: string | undefined, initialPage = 0, initialSize = 20) {
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<PageResponse<AuditResponse> | null>(null);
  const [loading, setLoading] = useState(Boolean(sourceId));
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const activeRequestRef = useRef<AbortController | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey(k => k + 1);
  }, []);

  const handleSetPage = useCallback((nextPage: number) => {
    setLoading(true);
    setPage(nextPage);
  }, []);

  useEffect(() => {
    if (!sourceId) return;

    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }
    const controller = new AbortController();
    activeRequestRef.current = controller;

    getSourceHistory(sourceId, page, initialSize, controller.signal)
      .then(response => {
        if (!controller.signal.aborted) {
          setData(response);
          setError(null);
          setLoading(false);
        }
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        const parsed = parseGovernanceError(err, 'Không thể tải lịch sử kiểm toán nguồn tri thức.');
        setError(parsed.message);
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [sourceId, page, initialSize, reloadKey]);

  return {
    data,
    loading,
    error,
    page,
    setPage: handleSetPage,
    reload,
  };
}
