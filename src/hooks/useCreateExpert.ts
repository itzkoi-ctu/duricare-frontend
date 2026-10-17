import { useState, useCallback } from 'react';
import axios from 'axios';
import { createExpert } from '../api/expert';
import type { CreateExpertRequest, ExpertProfile } from '../types/expert';

export interface UseCreateExpertReturn {
  isPending: boolean;
  error: string | null;
  submit: (request: CreateExpertRequest) => Promise<ExpertProfile | null>;
  clearError: () => void;
}

export function useCreateExpert(): UseCreateExpertReturn {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const submit = useCallback(async (request: CreateExpertRequest): Promise<ExpertProfile | null> => {
    setIsPending(true);
    setError(null);

    try {
      const profile = await createExpert(request);
      return profile;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          setError('Xung đột tài khoản hoặc email đã tồn tại trong hệ thống. Vui lòng kiểm tra danh sách chuyên gia trước khi thử lại.');
        } else if (err.response?.status === 400) {
          setError(err.response?.data?.message || 'Thông tin không hợp lệ. Vui lòng kiểm tra lại các trường đã nhập.');
        } else if (err.code === 'ECONNABORTED' || !err.response) {
          setError('Không thể kết nối máy chủ hoặc quá thời gian chờ. Quản trị viên nên kiểm tra danh sách chuyên gia trước khi gửi lại để tránh trùng lặp tài khoản.');
        } else {
          setError(err.response?.data?.message || 'Không thể tạo tài khoản chuyên gia. Vui lòng thử lại sau.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Không thể tạo tài khoản chuyên gia.');
      }
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  return {
    isPending,
    error,
    submit,
    clearError,
  };
}
