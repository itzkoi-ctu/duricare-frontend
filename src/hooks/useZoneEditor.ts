import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getFarms } from '../api/farms';
import { getZoneByCode, getZones, createZone, updateZone } from '../api/zones';
import { getTree } from '../api/trees';
import type { Farm } from '../types/farm';
import type { Tree } from '../types/tree';
import type { Zone, ZoneRequest } from '../types/zone';

export default function useZoneEditor(code?: string) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zone, setZone] = useState<Zone | null>(null);
  const [tree, setTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const saving = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    async function load() {
      setLoading(true);
      setError(null);
      setSaveError(null);
      setZone(null);
      setTree(null);
      try {
        const [farmList, records, detail] = await Promise.all([getFarms(), getZones(), code ? getZoneByCode(code) : Promise.resolve(null)]);
        if (current !== generation.current) return;
        if (detail) {
          if (detail.representativeTreeId === null || detail.farmId === null) {
            setError('Khu vực thiếu nông trại hoặc cây đại diện. Vui lòng kiểm tra cấu hình.');
            return;
          }
          const representative = await getTree(detail.representativeTreeId);
          if (current !== generation.current) return;
          setTree(representative);
        }
        setFarms(farmList);
        setZones(records);
        setZone(detail);
      } catch {
        if (current === generation.current) setError('Không thể tải thông tin khu vực. Vui lòng thử lại.');
      } finally { if (current === generation.current) setLoading(false); }
    }
    void load();
    return () => { generation.current = current + 1; };
  }, [code, fetchKey]);
  const save = async (request: ZoneRequest): Promise<Zone | null> => {
    if (saving.current || (code && !zone)) return null;
    saving.current = true;
    const current = generation.current;
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = zone ? await updateZone(zone.id, request) : await createZone(request);
      return current === generation.current ? result : null;
    } catch (failure: unknown) {
      if (current === generation.current) setSaveError(axios.isAxiosError(failure) && failure.response?.status === 409
        ? 'Mã khu vực đã được sử dụng. Vui lòng chọn mã khác.' : 'Không thể lưu khu vực. Vui lòng thử lại.');
      return null;
    } finally { saving.current = false; setIsSaving(false); }
  };
  return { farms, zones, zone, tree, loading, error, saveError, isSaving, save, retry: () => setFetchKey(key => key + 1) };
}
