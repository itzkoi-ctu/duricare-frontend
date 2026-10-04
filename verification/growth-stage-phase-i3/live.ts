// Standalone live observer; never imported by the production application.
// All requests use the real adapter. Tokens, cookies and credentials are never recorded.
import axios from 'axios';
import client from '../../src/api/client';
const options = new URLSearchParams(location.search);
const zoneCode = options.get('zone') ?? 'UI-I2-20261003';
const farmId = options.get('farmId') ?? '3';
interface Entry { method: string; url: string; bearerPresent: boolean; status: number | 'pending'; requestBody?: unknown; responseData?: unknown }
const entries: Entry[] = [];
const output = document.createElement('script'); output.id = 'growth-stage-network-trace'; output.type = 'application/json'; document.body.append(output);
const render = () => { output.textContent = JSON.stringify(entries); };
const adapter = axios.getAdapter(client.defaults.adapter);
render();
client.defaults.adapter = async config => {
  if (!['/zones', '/trees', '/overview'].some(path => config.url?.startsWith(path))) return adapter(config);
  const entry: Entry = { method: (config.method ?? 'get').toUpperCase(), url: axios.getUri(config),
    bearerPresent: String(config.headers.get('Authorization') ?? '').startsWith('Bearer '), status: 'pending' };
  if (config.data) entry.requestBody = JSON.parse(String(config.data));
  entries.push(entry); render();
  try {
    const response = await adapter(config); entry.status = response.status;
    entry.responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    render(); return response;
  } catch (error: unknown) { entry.status = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0; render(); throw error; }
};
history.replaceState(null, '', `/zones/${encodeURIComponent(zoneCode)}?farmId=${encodeURIComponent(farmId)}&nofixture=true`);
await import('../../src/main');
