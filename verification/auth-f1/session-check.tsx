// Development verification fixture only. Not imported by the app or included in production.
// Deliberately reports presence/keys only: never prints access tokens, cookies or passwords.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AxiosError } from 'axios';
import { BrowserRouter } from 'react-router-dom';
import client from '../../src/api/client';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { useAuth } from '../../src/hooks/useAuth';
import SessionGate from '../../src/components/auth/SessionGate';
import '../../src/styles/index.css';

const mode = new URLSearchParams(location.search).get('mode');
let release: () => void = () => {};
const paused = mode === 'loading' ? new Promise<void>(resolve => { release = resolve; }) : Promise.resolve();
let failed = false;
const calls = { csrf: 0, refresh: 0, me: 0 };
// Keep the existing adapter unchanged; only delay/fail a verification request.
client.interceptors.request.use(async config => {
  if (config.url === '/auth/csrf') {
    calls.csrf++;
    await paused;
    if (mode === 'error' && !failed) {
      failed = true;
      throw new AxiosError('Simulated network failure for verification', 'ERR_NETWORK', config);
    }
  }
  if (config.url === '/auth/refresh') calls.refresh++;
  if (config.url === '/auth/me') calls.me++;
  return config;
});

// This standalone verification entrypoint deliberately mounts its own probe.
// oxlint-disable-next-line react/only-export-components
function Probe() {
  const { user, accessToken } = useAuth();
  const storage = { localKeys: Object.keys(localStorage), sessionKeys: Object.keys(sessionStorage) };
  const hasStoredToken = [localStorage, sessionStorage].some(store => Object.keys(store).some(key => {
    const value = store.getItem(key) ?? '';
    return /token|authorization|jwt/i.test(key) || /^[\w-]+\.[\w-]+\.[\w-]+$/.test(value) || (accessToken !== null && value.includes(accessToken));
  }));
  const report = { user: user?.email ?? null, accessTokenInMemory: accessToken !== null,
    hasStoredToken, ...storage, calls, withCredentials: client.defaults.withCredentials };
  return <main className="max-w-3xl mx-auto p-8 space-y-5 text-text bg-bg">
    <h1 className="text-2xl font-bold">Auth-F1 · Session & storage verification</h1>
    <p>Read-only storage check. Token values are never displayed.</p>
    <pre data-testid="auth-report" className="whitespace-pre-wrap break-all rounded-xl bg-surface border border-border p-5 text-sm">{JSON.stringify(report, null, 2)}</pre>
    <a href="/login" className="text-navy underline">Return to Login</a>
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter>
  {mode === 'loading' && <button className="fixed top-4 left-4 z-50 p-3 rounded-lg bg-surface text-text border border-border" onClick={() => release()}>Continue session check</button>}
  <AuthProvider><SessionGate><Probe /></SessionGate></AuthProvider>
</BrowserRouter></StrictMode>);
