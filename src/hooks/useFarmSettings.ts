import { useEffect, useRef, useState, useContext } from 'react';
import axios from 'axios';
import { getFarm, getFarms, updateFarm } from '../api/farms';
import type { Farm, FarmRequest } from '../types/farm';
import { AuthContext } from '../contexts/authContextStore';

export default function useFarmSettings(farmId: number | null) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUncertain, setIsUncertain] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  const auth = useContext(AuthContext);
  const activeOperationGen = useRef<number | null>(null);
  const generation = useRef(0);

  const getActorId = (): number | null => {
    if (auth?.user?.id != null) return auth.user.id;
    try {
      const userStr = sessionStorage.getItem('duricare-user');
      return userStr ? JSON.parse(userStr)?.id ?? null : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const current = ++generation.current;
    async function fetchSettings() {
      setLoading(true);
      setFarm(null);
      setError(null);
      setSaveError(null);
      setIsUncertain(false);
      setSaved(false);
      setIsSaving(false);
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

  const reconcile = async (): Promise<Farm | null> => {
    if (!farm || activeOperationGen.current === generation.current) return null;
    const targetFarmId = farm.id;
    const requestGen = generation.current;
    const currentActorId = getActorId();
    activeOperationGen.current = requestGen;
    setIsSaving(true);
    try {
      const currentFarm = await getFarm(targetFarmId);
      if (
        requestGen !== generation.current ||
        farmId !== targetFarmId ||
        getActorId() !== currentActorId
      ) {
        return null;
      }
      setFarm(currentFarm);
      setFarms(list => list.map(item => item.id === currentFarm.id ? currentFarm : item));
      setIsUncertain(false);
      setSaveError(null);
      return currentFarm;
    } catch {
      return null;
    } finally {
      if (activeOperationGen.current === requestGen) {
        activeOperationGen.current = null;
      }
      if (
        requestGen === generation.current &&
        farmId === targetFarmId &&
        getActorId() === currentActorId
      ) {
        setIsSaving(false);
      }
    }
  };

  const save = async (request: FarmRequest): Promise<boolean> => {
    if (!farm || activeOperationGen.current === generation.current) return false;
    const targetFarmId = farm.id;
    const requestGen = generation.current;
    const currentActorId = getActorId();
    activeOperationGen.current = requestGen;
    setIsSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await updateFarm(targetFarmId, request);
      if (
        requestGen !== generation.current ||
        farmId !== targetFarmId ||
        getActorId() !== currentActorId
      ) {
        return false;
      }
      setFarm(updated);
      setFarms(list => list.map(item => item.id === updated.id ? updated : item));
      setSaved(true);
      setIsUncertain(false);
      return true;
    } catch (err: unknown) {
      if (
        requestGen !== generation.current ||
        farmId !== targetFarmId ||
        getActorId() !== currentActorId
      ) {
        return false;
      }
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 503 || status === 504 || status === 502 || !err.response) {
          setIsUncertain(true);
          setSaveError(null);
          return false;
        }
      }
      setIsUncertain(false);
      setSaveError('Không thể lưu cài đặt. Vui lòng thử lại.');
      return false;
    } finally {
      if (activeOperationGen.current === requestGen) {
        activeOperationGen.current = null;
      }
      if (
        requestGen === generation.current &&
        farmId === targetFarmId &&
        getActorId() === currentActorId
      ) {
        setIsSaving(false);
      }
    }
  };

  return {
    farms,
    farm,
    loading,
    error,
    saveError,
    isSaving,
    isUncertain,
    saved,
    save,
    reconcile,
    retry: () => setFetchKey(key => key + 1),
  };
}
