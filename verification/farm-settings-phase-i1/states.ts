// Synthetic UI-state checks only; separate from live screenshots and save proof.
import axios, { AxiosError } from 'axios';
import client from '../../src/api/client';
import { mockOverviewData } from '../../src/fixtures/overviewFixture';
const mode = new URLSearchParams(location.search).get('mode');
const adapter = axios.getAdapter(client.defaults.adapter);
const farm = { id: 1, name: 'Nông trại kiểm thử', location: 'Cần Thơ', area: 1, zoneIds: [], latitude: null, longitude: null };
let failed = false;
document.addEventListener('click', event => {
  if (event.target instanceof Element && ['Thử lại', 'Retry'].includes(event.target.closest('button')?.textContent?.trim() ?? '')) failed = true;
}, { capture: true });
client.defaults.adapter = async config => {
  if (config.url === '/overview') return { data: mockOverviewData, status: 200, statusText: 'OK', headers: {}, config };
  if (config.url?.startsWith('/farms')) {
    if (mode === 'loading') return new Promise(() => {});
    if ((mode === 'error' && !failed) || config.method === 'put') {
      throw new AxiosError('UI verification error', 'ERR_BAD_RESPONSE', config, undefined,
        { data: {}, status: 503, statusText: 'Unavailable', headers: {}, config });
    }
    return { data: config.url === '/farms' ? mode === 'empty' ? [] : [farm] : farm,
      status: 200, statusText: 'OK', headers: {}, config };
  }
  return adapter(config);
};
history.replaceState(null, '', `/settings/farm?nofixture=true${mode === 'empty' ? '' : '&farmId=1'}`);
await import('../../src/main');
