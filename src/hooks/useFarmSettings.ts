import { useEffect, useRef, useState } from 'react';
import { getFarm, getFarms, updateFarm } from '../api/farms';
import type { Farm, FarmRequest } from '../types/farm';

export default function useFarmSettings(farmId: number | null) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const saving = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    const current = ++generation.current;
    async function fetchSettings() {
      setLoading(true);
      setFarm(null);
      setError(null);
      setSaveError(null);
      setSaved(false);
      setIsSaving(saving.current);
      try {
        const list = await getFarms();
        if (current !== generation.current) return;
        setFarms(list);
        if (farmId !== null) {
          if (!list.some(item => item.id === farmId)) throw new Error('unknown-farm');
          const detail = await getFarm(farmId);
          if (current !== generation.current) return;
          setFarm(detail);
        }
      } catch {
        if (current === generation.current) setError('Không thể tải nông trại. Vui lòng chọn lại hoặc thử lại.');
      } finally {
        if (current === generation.current) setLoading(false);
      }
    }
    void fetchSettings();
    return () => { generation.current = current + 1; };
  }, [farmId, fetchKey]);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 6000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const save = async (request: FarmRequest): Promise<boolean> => {
    if (!farm || saving.current) return false;
    const current = generation.current;
    saving.current = true;
    setIsSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await updateFarm(farm.id, request);
      if (current !== generation.current) return false;
      setFarm(updated);
      setFarms(list => list.map(item => item.id === updated.id ? updated : item));
      setSaved(true);
      return true;
    } catch {
      if (current === generation.current) setSaveError('Không thể lưu cài đặt. Vui lòng thử lại.');
      return false;
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  return { farms, farm, loading, error, saveError, isSaving, saved, save, retry: () => setFetchKey(key => key + 1) };
}
