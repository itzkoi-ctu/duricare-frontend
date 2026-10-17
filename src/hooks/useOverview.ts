import { useCallback, useEffect, useRef, useState } from 'react';
import { getOverview } from '../api/overview';
import { getFarms } from '../api/farms';
import type { OverviewResponse } from '../types/overview';
import type { Farm } from '../types/farm';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from './useAuth';

export interface UseOverviewReturn {
  data: OverviewResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  farms: Farm[];
  selectedFarmId: number | null;
  onSelectFarm: (farmId: number) => void;
  noFarmsAvailable: boolean;
}

export default function useOverview(): UseOverviewReturn {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedFarmId = Number(searchParams.get('farmId'));
  const farmId = user?.role === 'ADMIN' && Number.isSafeInteger(requestedFarmId) && requestedFarmId > 0 ? requestedFarmId : undefined;
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [noFarmsAvailable, setNoFarmsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const dataRef = useRef<OverviewResponse | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Load farms list for ADMIN
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    let active = true;
    getFarms()
      .then((list) => {
        if (!active) return;
        setFarms(list);
        if (list.length === 0) {
          setNoFarmsAvailable(true);
        } else {
          setNoFarmsAvailable(false);
        }
      })
      .catch(() => {
        // Ignored here; handled in overview or retry
      });
    return () => {
      active = false;
    };
  }, [user?.role]);

  const onSelectFarm = useCallback((selectedId: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('farmId', String(selectedId));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const loadData = useCallback(async (isRefetch = false) => {
    let targetFarmId = farmId;

    if (user?.role === 'ADMIN' && targetFarmId === undefined) {
      try {
        const farmList = await getFarms();
        setFarms(farmList);
        if (farmList.length === 0) {
          setNoFarmsAvailable(true);
          setData(null);
          setError(null);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        setNoFarmsAvailable(false);
        targetFarmId = farmList[0].id;
        const next = new URLSearchParams(searchParams);
        next.set('farmId', String(targetFarmId));
        setSearchParams(next, { replace: true });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải danh sách nông trại.";
        setError(message);
        setLoading(false);
        setRefreshing(false);
        return;
      }
    }

    if (isRefetch && dataRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    // Dev-only fixture condition (completely tree-shaken in production builds)
    if (import.meta.env.DEV) {
      const search = new URLSearchParams(window.location.search);
      if (search.get('fixture') === 'true' || search.get('mock') === 'true') {
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
      const response = await getOverview(targetFarmId);
      setData(response);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: unknown) {
      // If dev mode and backend is not running, fallback to fixture unless explicitly disabled
      if (import.meta.env.DEV && !dataRef.current) {
        const search = new URLSearchParams(window.location.search);
        if (search.get('nofixture') !== 'true') {
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
  }, [farmId, searchParams, setSearchParams, user?.role]);

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
    farms,
    selectedFarmId: farmId ?? (farms.length > 0 ? farms[0].id : null),
    onSelectFarm,
    noFarmsAvailable,
  };
}
