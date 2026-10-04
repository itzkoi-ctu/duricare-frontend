import { useCallback, useEffect, useState } from 'react';
import { createCareLog, getCareLogsByZoneCode } from '../api/careLogs';
import type { CareLog, CareLogRequest } from '../types/careLog';

interface UseCareLogsReturn {
  logs: CareLog[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  create: (request: CareLogRequest) => Promise<boolean>;
  isSaving: boolean;
  saveError: string | null;
  clearSaveError: () => void;
}

export default function useCareLogs(zoneCode: string): UseCareLogsReturn {
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const retry = useCallback(() => setFetchKey((k) => k + 1), []);
  const clearSaveError = useCallback(() => setSaveError(null), []);
  const create = async (request: CareLogRequest): Promise<boolean> => {
    if (isSaving) return false;
    setIsSaving(true);
    setSaveError(null);
    try {
      await createCareLog(request);
      retry();
      return true;
    } catch {
      setSaveError('Không thể lưu nhật ký. Vui lòng thử lại.');
      return false;
    } finally { setIsSaving(false); }
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchLogs() {
      setLoading(true);
      setError(null);

      try {
        const data = await getCareLogsByZoneCode(zoneCode);
        if (cancelled) return;

        // Sort newest first if performedAt is present
        const sorted = [...data].sort((a, b) => {
          const timeA = a.performedAt ? new Date(a.performedAt).getTime() : a.id;
          const timeB = b.performedAt ? new Date(b.performedAt).getTime() : b.id;
          return timeB - timeA;
        });

        setLogs(sorted);
        setLoading(false);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Lỗi tải nhật ký chăm sóc");
        setLoading(false);
      }
    }

    fetchLogs();
    return () => {
      cancelled = true;
    };
  }, [zoneCode, fetchKey]);

  return { logs, loading, error, retry, create, isSaving, saveError, clearSaveError };
}
