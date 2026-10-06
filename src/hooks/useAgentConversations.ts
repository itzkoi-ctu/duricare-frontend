import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteConversation, getConversations } from '../api/agent';
import type { AgentConversation } from '../types/agent';

export default function useAgentConversations(savedVersion: number) {
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const deletePending = useRef(false);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError(null);
    try {
      const rows = await getConversations(controller.signal);
      if (!controller.signal.aborted) setConversations(rows);
    } catch {
      if (!controller.signal.aborted) setError('Không thể tải danh sách hội thoại. Vui lòng thử lại.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    queueMicrotask(() => { if (active) void refresh(); });
    return () => { active = false; mounted.current = false; pending.current?.abort(); };
  }, [refresh, savedVersion]);
  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (deletePending.current) return false;
    deletePending.current = true;
    setDeletingId(id);
    setDeleteError(null);
    pending.current?.abort();
    setLoading(false);
    try {
      await deleteConversation(id);
      if (mounted.current) setConversations(rows => rows.filter(row => row.id !== id));
      return true;
    } catch {
      if (mounted.current) setDeleteError('Không thể xoá cuộc trò chuyện. Vui lòng thử lại.');
      return false;
    } finally {
      deletePending.current = false;
      if (mounted.current) setDeletingId(null);
    }
  }, []);
  return { conversations, loading, error, refresh, remove, deletingId, deleteError };
}
