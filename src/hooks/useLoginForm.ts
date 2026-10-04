import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { loginDestination } from '../utils/authNavigation';
import { isAxiosError } from 'axios';
import { useAuth } from './useAuth';
import type { LoginRequest } from '../types/auth';

export default function useLoginForm() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const form = useForm<LoginRequest>({ defaultValues: { email: '', password: '' } });
  const submit = form.handleSubmit(async ({ email, password }) => {
    form.clearErrors('root');
    try {
      await auth.login(email.trim(), password);
      form.reset();
      navigate(loginDestination(location.state), { replace: true });
    } catch (error: unknown) {
      const body = isAxiosError<{ message?: string }>(error) ? error.response?.data : undefined;
      form.setError('root', { message: typeof body?.message === 'string' ? body.message
        : "Không thể đăng nhập. Vui lòng kiểm tra kết nối và thử lại." });
    }
  });
  const logout = async () => {
    setLoggingOut(true);
    setLogoutError(null);
    try { await auth.logout(); }
    catch { setLogoutError("Không thể đăng xuất. Vui lòng thử lại."); }
    finally { setLoggingOut(false); }
  };
  return { ...form, submit, user: auth.user, logout, logoutError, loggingOut };
}
