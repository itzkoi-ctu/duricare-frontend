import { useCallback, useEffect, useRef, useState } from 'react';
import { getOverview } from '../api/overview';
import type { OverviewResponse } from '../types/overview';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from './useAuth';

export interface UseOverviewReturn {
  data: OverviewResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

export default function useOverview(): UseOverviewReturn {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedFarmId = Number(searchParams.get('farmId'));
  const farmId = user?.role === 'ADMIN' && Number.isSafeInteger(requestedFarmId) && requestedFarmId > 0 ? requestedFarmId : undefined;
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const dataRef = useRef<OverviewResponse | null>(null);
  dataRef.current = data;

  const loadData = useCallback(async (isRefetch = false) => {
    if (user?.role === 'ADMIN' && farmId === undefined) {
      setData(null);
      setError("Vui lòng chọn nông trại để xem tổng quan (farmId).");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (isRefetch && dataRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    // Dev-only fixture condition (completely tree-shaken in production builds)
    if (import.meta.env.DEV) {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('fixture') === 'true' || searchParams.get('mock') === 'true') {
        const { mockOverviewData } = await import('../fixtures/overviewFixture');
        setData(mockOverviewData);
        setLastUpdated(new Date());
        setError(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }
    }

    try {
      const response = await getOverview(farmId);
      setData(response);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: unknown) {
      // If dev mode and backend is not running, fallback to fixture unless explicitly disabled
      if (import.meta.env.DEV && !dataRef.current) {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('nofixture') !== 'true') {
          try {
            const { mockOverviewData } = await import('../fixtures/overviewFixture');
            setData(mockOverviewData);
            setLastUpdated(new Date());
            setError(null);
            setLoading(false);
            setRefreshing(false);
            return;
          } catch {
            // fallback to error
          }
        }
      }

      // If refetch fails, keep previous data! Only set error if no data yet
      if (!dataRef.current) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu tổng quan nông trại";
        setError(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [farmId, user?.role]);

  useEffect(() => {
    loadData(false);

    // Auto-refetch every 60 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  return {
    data,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
  };
}
