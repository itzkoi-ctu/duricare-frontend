import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { updateTreeGrowthStage } from '../api/trees';
import type { GrowthStage, Zone } from '../types/zone';

export default function useGrowthStage(zone: Zone | null, onSaved: (stage: GrowthStage) => Promise<void>) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 5000);
    return () => clearTimeout(timer);
  }, [saved]);

  const save = async (growthStage: GrowthStage): Promise<boolean> => {
    if (inFlight.current || zone?.representativeTreeId == null) return false;
    inFlight.current = true;
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const tree = await updateTreeGrowthStage(zone.representativeTreeId, { growthStage });
      if (tree.growthStage === null) throw new Error('Missing stage in response');
      await onSaved(tree.growthStage);
      setSaved(true);
      return true;
    } catch (failure: unknown) {
      setError(axios.isAxiosError(failure) && failure.response?.status === 403
        ? 'Bạn không có quyền thay đổi giai đoạn của khu vực này.'
        : 'Không thể đổi giai đoạn. Vui lòng thử lại.');
      return false;
    } finally {
      inFlight.current = false;
      setIsSaving(false);
    }
  };
  return { isSaving, error, saved, save, clearFeedback: () => { setError(null); setSaved(false); } };
}
