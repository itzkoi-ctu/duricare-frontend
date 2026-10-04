// Standalone dev verification only; uses actual API modules and AuthProvider.
// No credentials, tokens or cookies are rendered or saved in the trace.
import { StrictMode, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import client from '../../src/api/client';
import * as authApi from '../../src/api/auth';
import { getAuthSessionBridge } from '../../src/api/authSessionBridge';
import { getUnresolvedAlerts } from '../../src/api/alerts';
import { getZones } from '../../src/api/zones';
import { getOverview } from '../../src/api/overview';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { useAuth } from '../../src/hooks/useAuth';
import SessionGate from '../../src/components/auth/SessionGate';
import LoginPage from '../../src/pages/LoginPage';
import ThemeToggle from '../../src/components/layout/ThemeToggle';
import '../../src/styles/index.css';

interface Entry { id: number; method: string; path: string; status: number | 'pending'; bearer: boolean; csrf: boolean; retry: boolean }
let entries: Entry[] = [];
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };
const clearTrace = () => { entries = []; notify(); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const adapter = axios.getAdapter(client.defaults.adapter);
client.defaults.adapter = async config => {
  const item: Entry = { id: entries.length + 1, method: (config.method ?? 'get').toUpperCase(),
    path: config.url ?? '', status: 'pending', bearer: config.headers.has('Authorization'),
    csrf: config.headers.has('X-XSRF-TOKEN'), retry: !!(config as typeof config & {_authRetry?: boolean})._authRetry };
  entries = [...entries, item]; notify();
  try {
    const response = await adapter(config);
    entries = entries.map(entry => entry.id === item.id ? { ...entry, status: response.status } : entry);
    notify(); return response;
  } catch (error: unknown) {
    entries = entries.map(entry => entry.id === item.id ? { ...entry, status: axios.isAxiosError(error) ? error.response?.status ?? 0 : 0 } : entry);
    notify(); throw error;
  }
};

// oxlint-disable-next-line react/only-export-components
function Trace() {
  const rows = useSyncExternalStore(subscribe, () => entries);
  return <section className="rounded-2xl bg-surface border border-border p-4 space-y-3 overflow-x-auto">
    <h2 className="font-bold">Actual network trace (token values redacted)</h2>
    <p className="text-sm" data-testid="refresh-count">Refresh POSTs: {rows.filter(row => row.path === '/auth/refresh').length}</p>
    <table className="text-xs w-full text-left"><thead><tr><th className="p-2">Method / path</th><th>Status</th><th>Bearer</th><th>CSRF</th><th>Retry</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id} className="border-t border-border"><td className="p-2">{row.method} {row.path}</td><td>{row.status}</td><td>{String(row.bearer)}</td><td>{String(row.csrf)}</td><td>{String(row.retry)}</td></tr>)}</tbody></table>
    <pre data-testid="network-report" className="sr-only">{JSON.stringify(rows)}</pre>
  </section>;
}

// oxlint-disable-next-line react/only-export-components
function Check() {
  const { user, isAuthenticated } = useAuth();
  const [result, setResult] = useState('Ready');
  const [busy, setBusy] = useState(false);
  async function run(mode: 'single' | 'parallel' | 'invalid') {
    clearTrace(); setBusy(true); setResult('Pending');
    try {
      const bridge = getAuthSessionBridge();
      const token = bridge?.getAccessToken();
      if (!bridge || !token) throw new Error('Login first');
      if (mode === 'invalid') {
        // Revoke and clear cookie server-side but keep React's session to simulate cookie loss.
        await authApi.logout(token);
        clearTrace();
      }
      bridge.replaceAccessToken('auth-f2-invalid-access-token', token);
      if (mode === 'parallel') {
        await Promise.all([getUnresolvedAlerts(), getZones(), getOverview()]);
      } else await getUnresolvedAlerts();
      setResult('Recovered without an error');
    } catch { setResult('Original request rejected'); }
    finally { setBusy(false); }
  }
  return <main className="max-w-5xl mx-auto p-5 md:p-8 space-y-5 bg-bg text-text min-h-dvh">
    <header className="flex justify-between gap-3 items-center"><h1 className="text-xl md:text-2xl font-bold">Auth-F2 · Live recovery check</h1><ThemeToggle /></header>
    <p data-testid="session-user">{user?.email ?? 'Signed out'} · Authenticated: {String(isAuthenticated)}</p>
    {!isAuthenticated ? <Link to="/login" className="text-navy underline">Login</Link> : <div className="flex flex-wrap gap-3">
      {(['single', 'parallel', 'invalid'] as const).map(mode => <button key={mode} disabled={busy} onClick={() => { void run(mode); }} className="min-h-11 px-4 bg-navy text-surface dark:text-bg rounded-xl cursor-pointer disabled:opacity-60">{mode === 'single' ? 'Corrupt token: one request' : mode === 'parallel' ? 'Corrupt token: three requests' : 'Revoke cookie and request'}</button>)}
    </div>}
    <p role="status" data-testid="result">{result}</p>
    <Trace />
  </main>;
}

// oxlint-disable-next-line react/only-export-components
function LoginWithTrace() {
  const { user, accessToken } = useAuth();
  return <><LoginPage /><div className="p-5 max-w-5xl mx-auto text-text"><p data-testid="signed-out-state">User: {user === null ? 'null' : 'present'} · Token: {accessToken === null ? 'null' : 'present'}</p><Trace /></div></>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><AuthProvider><SessionGate>
  <Routes><Route path="/login" element={<LoginWithTrace />} /><Route path="*" element={<Check />} /></Routes>
</SessionGate></AuthProvider></BrowserRouter></StrictMode>);
