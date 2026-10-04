import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getUnresolvedAlerts, resolveAlert } from '../api/alerts';
import type { Alert } from '../types/alert';

const newestFirst = (alerts: Alert[]) => [...alerts].sort((a, b) =>
  Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id);

export default function useAlerts() {
  useLanguage();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<number | null>(null);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const alertsRef = useRef<Alert[]>([]);
  const pending = useRef(new Set<number>());
  const hidden = useRef(new Set<number>());
  const revision = useRef(0);
  const loaded = useRef(false);
  const mounted = useRef(false);

  const updateAlerts = useCallback((next: Alert[]) => {
    alertsRef.current = next;
    setAlerts(next);
  }, []);

  const refresh = useCallback(async () => {
    const request = ++revision.current;
    if (!loaded.current) setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const data = await getUnresolvedAlerts();
      // A fetch started before a resolve must not put the removed row back.
      if (!mounted.current || request !== revision.current) return;
      for (const id of hidden.current) {
        if (!pending.current.has(id) && !data.some(alert => alert.id === id)) hidden.current.delete(id);
      }
      updateAlerts(newestFirst(data.filter(alert => !hidden.current.has(alert.id))));
      loaded.current = true;
    } catch (err: unknown) {
      if (mounted.current && request === revision.current) {
        setError(err instanceof Error ? err.message : "Không thể tải cảnh báo");
      }
    } finally {
      if (mounted.current && request === revision.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [updateAlerts]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 60000);
    return () => {
      mounted.current = false;
      revision.current++;
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    if (resolveError === null) return;
    const timeout = window.setTimeout(() => setResolveError(null), 8000);
    return () => window.clearTimeout(timeout);
  }, [resolveError]);

  const resolve = useCallback(async (id: number): Promise<boolean> => {
    const original = alertsRef.current.find(alert => alert.id === id);
    if (!original || pending.current.has(id)) return false;
    pending.current.add(id);
    hidden.current.add(id);
    revision.current++;
    setRefreshing(false);
    setPendingIds([...pending.current]);
    setResolveError(null);
    updateAlerts(alertsRef.current.filter(alert => alert.id !== id));
    try {
      await resolveAlert(id);
      return true;
    } catch {
      hidden.current.delete(id);
      if (mounted.current) {
        updateAlerts(newestFirst([...alertsRef.current.filter(alert => alert.id !== id), original]));
        setResolveError(id);
      }
      return false;
    } finally {
      pending.current.delete(id);
      if (mounted.current) setPendingIds([...pending.current]);
    }
  }, [updateAlerts]);

  return { alerts, loading, refreshing, error, resolveError: resolveError === null ? null : t('Không thể xử lý cảnh báo #{0}. Cảnh báo đã được khôi phục; vui lòng thử lại.', [resolveError]), dismissResolveError: () => setResolveError(null), pendingIds, refresh, resolve };
}
