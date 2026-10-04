import axios, { type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getAuthSessionBridge } from './authSessionBridge';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

type RetryConfig = InternalAxiosRequestConfig & { _authRetry?: boolean };
function authPath(config: InternalAxiosRequestConfig): string {
  return (config.url ?? '').split('?')[0].replace(/\/+$/, '');
}
function publicAuthRequest(config: InternalAxiosRequestConfig): boolean {
  const path = authPath(config);
  return ['/auth/login', '/auth/refresh', '/auth/csrf'].some(endpoint => path.endsWith(endpoint));
}

client.interceptors.request.use(async config => {
  const token = getAccessToken();
  if (token && !publicAuthRequest(config) && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  const path = authPath(config);
  const unsafe = !['get', 'head', 'options'].includes((config.method ?? 'get').toLowerCase());
  if (unsafe && ['/auth/refresh', '/auth/logout'].some(endpoint => path.endsWith(endpoint))
      && !config.headers.has('X-XSRF-TOKEN')) {
    const { getCsrfToken } = await import('./auth');
    config.headers.set('X-XSRF-TOKEN', await getCsrfToken());
  }
  return config;
});

let recovering: Promise<boolean> | null = null;
function recoverSession(): Promise<boolean> {
  if (!recovering) {
    const bridge = getAuthSessionBridge();
    const previousToken = bridge?.getAccessToken();
    if (!bridge || !previousToken) return Promise.resolve(false);
    recovering = (async () => {
      try {
        const { refresh } = await import('./auth');
        const { accessToken } = await refresh();
        // Ignore late refresh results if logout/login replaced the session while it was pending.
        return bridge.replaceAccessToken(accessToken, previousToken);
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status === 401) bridge.invalidate(previousToken);
        throw error;
      }
    })().finally(() => { recovering = null; });
  }
  return recovering;
}

client.interceptors.response.use(response => response, async (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) throw error;
  const config = error.config as RetryConfig;
  if (publicAuthRequest(config)) throw error;
  const bridge = getAuthSessionBridge();
  const token = getAccessToken();
  if (!token) throw error;
  const sentToken = config.headers.get('Authorization');
  if (config._authRetry) {
    // A fresh token was also rejected. Fail closed, without starting another refresh loop.
    // A late failure must not log out a different session that has since replaced it.
    if (sentToken === `Bearer ${token}`) bridge?.invalidate(token);
    throw error;
  }
  config._authRetry = true;
  // A concurrent recovery may have finished before this old request's 401 arrived.
  if (sentToken === `Bearer ${token}`) {
    try { if (!await recoverSession()) throw error; }
    catch { throw error; } // Preserve the original request's error for its existing caller.
  }
  const replacement = getAccessToken();
  if (!replacement) throw error;
  config.headers.set('Authorization', `Bearer ${replacement}`);
  return client.request(config);
});

export default client;
