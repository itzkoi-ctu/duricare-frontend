// Standalone observation probe; not imported by the production application.
// Do not collect credentials, Authorization values, or cookies.
import axios from 'axios';
import client from '../../src/api/client';

interface Entry {
  method: string;
  url: string;
  bearerPresent: boolean;
  status: number | 'pending';
  requestBody?: unknown;
  responseData?: unknown;
}
const entries: Entry[] = [];
const output = document.createElement('script');
output.type = 'application/json';
output.id = 'farm-network-trace';
document.body.append(output);
const render = () => { output.textContent = JSON.stringify(entries); };
const adapter = axios.getAdapter(client.defaults.adapter);
render();
client.defaults.adapter = async config => {
  const path = config.url ?? '';
  if (!path.startsWith('/farms') && path !== '/overview') return adapter(config);
  const entry: Entry = { method: (config.method ?? 'get').toUpperCase(), url: axios.getUri(config),
    bearerPresent: String(config.headers.get('Authorization') ?? '').startsWith('Bearer '), status: 'pending' };
  if (config.data) entry.requestBody = JSON.parse(String(config.data));
  entries.push(entry); render();
  try {
    const response = await adapter(config);
    entry.status = response.status;
    entry.responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    render(); return response;
  } catch (error: unknown) {
    entry.status = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0;
    render(); throw error;
  }
};
