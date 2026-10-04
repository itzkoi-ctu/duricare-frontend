import { useState } from 'react';
import { useAuth } from './useAuth';

export default function useLogout() {
  const { logout } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try { await logout(); }
    catch { setError("Không thể đăng xuất. Vui lòng thử lại."); }
    finally { setPending(false); }
  };
  return { pending, error, submit };
}
