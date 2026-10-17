import { useEffect, useState } from 'react';
import { getOwnExpertProfile } from '../api/expert';
import type { ExpertProfile } from '../types/expert';

export default function useExpertProfile() {
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getOwnExpertProfile(controller.signal).then(data => {
      if (!controller.signal.aborted) setProfile(data);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [attempt]);
  return { profile, loading, error, retry: () => {
    setLoading(true);
    setError(false);
    setAttempt(value => value + 1);
  } };
}
