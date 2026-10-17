import { useState, useEffect, useCallback, useRef } from 'react';
import { getExperts } from '../api/expert';
import type { ExpertProfilePage } from '../types/expert';

export interface UseExpertListReturn {
  data: ExpertProfilePage | null;
  page: number;
  loading: boolean;
  pageChanging: boolean;
  error: string | null;
  setPage: (nextPage: number) => void;
  retry: () => void;
}

export function useExpertList(initialPage = 0, size = 20): UseExpertListReturn {
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<ExpertProfilePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageChanging, setPageChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  const hasData = useRef(false);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    getExperts(page, size, controller.signal)
      .then(result => {
        if (!ignore) {
          setData(result);
          hasData.current = true;
          setLoading(false);
          setPageChanging(false);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!ignore && !controller.signal.aborted) {
          const message = err instanceof Error ? err.message : 'Không thể tải danh sách chuyên gia';
          setError(message);
          setLoading(false);
          setPageChanging(false);
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [page, reloadIndex, size]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadIndex(i => i + 1);
  }, []);

  const changePage = useCallback((nextPage: number) => {
    setPageChanging(true);
    setError(null);
    setPage(nextPage);
  }, []);

  return {
    data,
    page,
    loading,
    pageChanging,
    error,
    setPage: changePage,
    retry,
  };
}
