import { useCallback, useEffect, useMemo, useState } from 'react';
import { getUnresolvedAlerts } from '../api/alerts';
import type { Alert, AlertSource } from '../types/alert';

export type FilterSource = 'ALL' | AlertSource;

interface UseAlertsReturn {
  alerts: Alert[];
  filteredAlerts: Alert[];
  loading: boolean;
  error: string | null;
  filterSource: FilterSource;
  setFilterSource: (source: FilterSource) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  counts: {
    total: number;
    hard: number;
    agentic: number;
  };
  retry: () => void;
}

export default function useAlerts(): UseAlertsReturn {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<FilterSource>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchKey, setFetchKey] = useState(0);

  const retry = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchAlerts() {
      setLoading(true);
      setError(null);

      try {
        const data = await getUnresolvedAlerts();
        if (cancelled) return;

        // Sort newest first
        const sorted = [...data].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setAlerts(sorted);
        setLoading(false);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Lỗi tải danh sách cảnh báo');
        setLoading(false);
      }
    }

    fetchAlerts();
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const counts = useMemo(() => {
    let hard = 0;
    let agentic = 0;
    for (const a of alerts) {
      if (a.source === 'HARD') hard++;
      else if (a.source === 'AGENTIC') agentic++;
    }
    return {
      total: alerts.length,
      hard,
      agentic,
    };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      // Source filter
      if (filterSource !== 'ALL' && item.source !== filterSource) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchZone = item.zoneCode.toLowerCase().includes(q);
        const matchMsg = item.message.toLowerCase().includes(q);
        const matchType = item.type.toLowerCase().includes(q);
        return matchZone || matchMsg || matchType;
      }
      return true;
    });
  }, [alerts, filterSource, searchQuery]);

  return {
    alerts,
    filteredAlerts,
    loading,
    error,
    filterSource,
    setFilterSource,
    searchQuery,
    setSearchQuery,
    counts,
    retry,
  };
}
