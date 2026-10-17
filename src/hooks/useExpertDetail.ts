import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getExpert, verifyExpert, suspendExpert } from '../api/expert';
import type { ExpertProfile } from '../types/expert';

export interface UseExpertDetailReturn {
  profile: ExpertProfile | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  forbidden: boolean;
  actionPending: boolean;
  conflictError: string | null;
  reload: () => Promise<ExpertProfile | null>;
  verify: (version: number, reason: string) => Promise<ExpertProfile | null>;
  suspend: (version: number, reason: string) => Promise<ExpertProfile | null>;
  clearConflict: () => void;
}

export function useExpertDetail(id: number): UseExpertDetailReturn {
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    getExpert(id, controller.signal)
      .then(data => {
        if (!ignore) {
          setProfile(data);
          setLoading(false);
          setError(null);
          setNotFound(false);
          setForbidden(false);
        }
      })
      .catch((err: unknown) => {
        if (ignore || controller.signal.aborted) return;
        setLoading(false);
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 404) {
            setNotFound(true);
            setError('Không tìm thấy hồ sơ chuyên gia');
          } else if (err.response?.status === 403) {
            setForbidden(true);
            setError('Bạn không có quyền truy cập hồ sơ này');
          } else {
            setError(err.response?.data?.message || err.message || 'Không thể tải hồ sơ chuyên gia');
          }
        } else {
          setError(err instanceof Error ? err.message : 'Không thể tải hồ sơ chuyên gia');
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [id]);

  const reload = useCallback(async (): Promise<ExpertProfile | null> => {
    setLoading(true);
    setConflictError(null);
    try {
      const data = await getExpert(id);
      setProfile(data);
      setError(null);
      setNotFound(false);
      setForbidden(false);
      return data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) {
          setNotFound(true);
          setError('Không tìm thấy hồ sơ chuyên gia');
        } else if (err.response?.status === 403) {
          setForbidden(true);
          setError('Bạn không có quyền truy cập hồ sơ này');
        } else {
          setError(err.response?.data?.message || err.message || 'Không thể tải hồ sơ chuyên gia');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Không thể tải hồ sơ chuyên gia');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  const clearConflict = useCallback(() => {
    setConflictError(null);
  }, []);

  const verify = useCallback(async (version: number, reason: string): Promise<ExpertProfile | null> => {
    setActionPending(true);
    setConflictError(null);
    try {
      const updated = await verifyExpert(id, { version, reason: reason.trim() });
      setProfile(updated);
      return updated;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setConflictError('Hồ sơ đã thay đổi. Vui lòng tải lại và kiểm tra trước khi thực hiện lại.');
      } else {
        const message = axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : err instanceof Error
          ? err.message
          : 'Không thể xác minh chuyên gia';
        setError(message);
      }
      return null;
    } finally {
      setActionPending(false);
    }
  }, [id]);

  const suspend = useCallback(async (version: number, reason: string): Promise<ExpertProfile | null> => {
    setActionPending(true);
    setConflictError(null);
    try {
      const updated = await suspendExpert(id, { version, reason: reason.trim() });
      setProfile(updated);
      return updated;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setConflictError('Hồ sơ đã thay đổi. Vui lòng tải lại và kiểm tra trước khi thực hiện lại.');
      } else {
        const message = axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : err instanceof Error
          ? err.message
          : 'Không thể tạm đình chỉ chuyên gia';
        setError(message);
      }
      return null;
    } finally {
      setActionPending(false);
    }
  }, [id]);

  return {
    profile,
    loading,
    error,
    notFound,
    forbidden,
    actionPending,
    conflictError,
    reload,
    verify,
    suspend,
    clearConflict,
  };
}
