import { useEffect, useState } from 'react';
import { getZones } from '../api/zones';
import { getTrees } from '../api/trees';
import { getFarms } from '../api/farms';
import type { ZoneListEntry } from '../types/zone';
import type { Farm } from '../types/farm';

export default function useZoneManagement() {
  const [zones, setZones] = useState<ZoneListEntry[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [records, trees, farmList] = await Promise.all([getZones(), getTrees(), getFarms()]);
        if (cancelled) return;
        const byId = new Map(trees.map(tree => [tree.id, tree]));
        setZones(records.map(zone => ({ ...zone, variety: zone.representativeTreeId === null ? null : byId.get(zone.representativeTreeId)?.variety ?? null }))
          .sort((a, b) => a.code.localeCompare(b.code)));
        setFarms(farmList);
      } catch {
        if (!cancelled) setError('Không thể tải danh sách khu vực. Vui lòng thử lại.');
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [fetchKey]);
  return { zones, farms, loading, error, retry: () => setFetchKey(key => key + 1) };
}
