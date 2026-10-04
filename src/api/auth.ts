import client from './client';
import type { AccessTokenResponse, CsrfResponse, LoginResponse, User } from '../types/auth';

export async function getCsrfToken(): Promise<string> {
  // JSON works across Vercel/VPS origins; document.cookie cannot read the API origin's cookie.
  const { data } = await client.get<CsrfResponse>('/auth/csrf');
  return data.token;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const csrf = await getCsrfToken();
  const { data } = await client.post<LoginResponse>('/auth/login', { email, password }, {
    headers: { 'X-XSRF-TOKEN': csrf },
  });
  return data;
}

let refreshing: Promise<AccessTokenResponse> | null = null;
export function refresh(): Promise<AccessTokenResponse> {
  // A refresh cookie is single-use. StrictMode/subscribers must share one in-flight rotation.
  if (!refreshing) {
    const rotate = async () => {
      const csrf = await getCsrfToken();
      const { data } = await client.post<AccessTokenResponse>('/auth/refresh', undefined, {
        headers: { 'X-XSRF-TOKEN': csrf },
      });
      return data;
    };
    // Cookies are shared across tabs. The lock includes CSRF bootstrap and cookie rotation.
    // Web Locks is available on localhost and supported production HTTPS browsers.
    refreshing = (navigator.locks ? navigator.locks.request('duricare-auth-refresh', rotate) : rotate())
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function getMe(accessToken: string): Promise<User> {
  const { data } = await client.get<User>('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

export async function logout(accessToken: string): Promise<void> {
  const csrf = await getCsrfToken();
  await client.post('/auth/logout', undefined, {
    headers: { Authorization: `Bearer ${accessToken}`, 'X-XSRF-TOKEN': csrf },
  });
}
