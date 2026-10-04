// Standalone verification observer, never imported by production code.
// Record authorization presence only; never tokens, credentials or cookies.
import axios from 'axios';
import client from '../../src/api/client';
import { getTree } from '../../src/api/trees';
import { getSensors } from '../../src/api/zones';
import type { Zone } from '../../src/types/zone';
interface Entry { method: string; url: string; bearerPresent: boolean; status: number | 'pending'; requestBody?: unknown; responseData?: unknown }
const entries: Entry[] = [];
const output = document.createElement('script'); output.id = 'zone-management-network-trace'; output.type = 'application/json'; document.body.append(output);
const render = () => { output.textContent = JSON.stringify(entries); };
const adapter = axios.getAdapter(client.defaults.adapter);
render();
client.defaults.adapter = async config => {
  if (!['/zones', '/farms', '/trees', '/overview'].some(path => config.url?.startsWith(path))) return adapter(config);
  const entry: Entry = { method: (config.method ?? 'get').toUpperCase(), url: axios.getUri(config),
    bearerPresent: String(config.headers.get('Authorization') ?? '').startsWith('Bearer '), status: 'pending' };
  if (config.data) entry.requestBody = JSON.parse(String(config.data));
  entries.push(entry); render();
  try {
    const response = await adapter(config); entry.status = response.status;
    entry.responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    render();
    if (entry.method === 'POST' && config.url === '/zones') {
      const zone = entry.responseData as Zone;
      // Read only: observe the tree and sensor metadata after creation through the UI.
      void Promise.all([getTree(zone.representativeTreeId!), getSensors(zone.code)]).then(([tree, sensors]) => {
        const proof = document.createElement('script'); proof.id = 'zone-provisioning-proof'; proof.type = 'application/json';
        proof.textContent = JSON.stringify({ zone, tree, sensors }); document.body.append(proof);
      }).catch(() => {});
    }
    return response;
  } catch (error: unknown) { entry.status = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0; render(); throw error; }
};
