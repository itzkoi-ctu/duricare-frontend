// Temporary verification probe. Not imported by the production application.
// Records header presence only; never records access tokens or cookie values.
import axios from 'axios';
import client from '../../src/api/client';

interface Entry { method: string; url: string; authorization: string; status: number | 'pending'; count?: number }
const entries: Entry[] = [];
const adapter = axios.getAdapter(client.defaults.adapter);
const panel = document.createElement('aside');
panel.setAttribute('aria-label', 'Alerts request trace');
panel.className = 'fixed z-50 bottom-20 left-4 right-4 lg:left-72 rounded-xl border border-border bg-surface p-4 text-text shadow-lg';
const heading = document.createElement('h2');
heading.className = 'text-sm font-bold mb-2';
heading.textContent = 'Live shared-client network trace';
const output = document.createElement('pre');
output.dataset.testid = 'alerts-network-trace';
output.className = 'text-xs overflow-x-auto whitespace-pre-wrap';
panel.append(heading, output);
document.body.append(panel);
const render = () => { output.textContent = JSON.stringify(entries, null, 2); };
render();
client.defaults.adapter = async config => {
  if (config.url !== '/alerts' || config.method !== 'get') return adapter(config);
  const entry: Entry = {
    method: 'GET', url: axios.getUri(config),
    authorization: String(config.headers.get('Authorization') ?? '').startsWith('Bearer ')
      ? 'Bearer [redacted]' : 'absent', status: 'pending',
  };
  entries.push(entry); render();
  try {
    const response = await adapter(config);
    entry.status = response.status;
    if (Array.isArray(response.data)) entry.count = response.data.length;
    render(); return response;
  } catch (error: unknown) {
    entry.status = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0;
    render(); throw error;
  }
};
