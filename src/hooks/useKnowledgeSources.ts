import { useState, useEffect, useCallback, useRef } from 'react';
import { listSources, parseGovernanceError } from '../api/governance';
import type { PageResponse, SourceResponse, RevisionStatus } from '../types/governance';

export function useKnowledgeSources(initialPage = 0, initialSize = 20, initialStatus?: RevisionStatus) {
  const [page, setPage] = useState(initialPage);
  const [statusFilter, setStatusFilter] = useState<RevisionStatus | undefined>(initialStatus);
  const [data, setData] = useState<PageResponse<SourceResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const activeRequestRef = useRef<AbortController | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setReloadKey(k => k + 1);
  }, []);

  const handleSetPage = useCallback((nextPage: number) => {
    setLoading(true);
    setPage(nextPage);
  }, []);

  const handleSetStatus = useCallback((nextStatus?: RevisionStatus) => {
    setLoading(true);
    setStatusFilter(nextStatus);
    setPage(0);
  }, []);

  useEffect(() => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }
    const controller = new AbortController();
    activeRequestRef.current = controller;

    listSources(page, initialSize, statusFilter, controller.signal)
      .then(response => {
        setData(response);
        setError(null);
        setErrorCode(null);
        setLoading(false);
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        const parsed = parseGovernanceError(err, 'Không thể tải danh sách nguồn tri thức.');
        setError(parsed.message);
        setErrorCode(parsed.code || null);
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [page, initialSize, statusFilter, reloadKey]);

  return {
    data,
    loading,
    error,
    errorCode,
    page,
    statusFilter,
    setPage: handleSetPage,
    setStatusFilter: handleSetStatus,
    reload,
  };
}
