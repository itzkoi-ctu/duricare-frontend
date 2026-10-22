import { useEffect, useState } from 'react';
import { getOwnExpertProfile } from '../api/expert';
import type { ExpertProfile } from '../types/expert';
import { useAuth } from './useAuth';

export default function useExpertProfile() {
  const { user } = useAuth();
  const isExpert = user?.role === 'EXPERT';
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(isExpert);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isExpert) {
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(false);
    getOwnExpertProfile(controller.signal).then(data => {
      if (!controller.signal.aborted) setProfile(data);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [isExpert, attempt]);

  return {
    profile: isExpert ? profile : null,
    loading: isExpert ? loading : false,
    error: isExpert ? error : false,
    retry: () => {
      if (isExpert) {
        setLoading(true);
        setError(false);
        setAttempt(value => value + 1);
      }
    },
  };
}
