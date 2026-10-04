// Synthetic loading/error/empty verification, never imported by production code.
import axios, { AxiosError } from 'axios';
import client from '../../src/api/client';
import { mockOverviewData } from '../../src/fixtures/overviewFixture';
const options = new URLSearchParams(location.search);
const mode = options.get('mode');
const page = options.get('page');
const adapter = axios.getAdapter(client.defaults.adapter);
const farm = { id: 1, name: 'Nông trại kiểm thử', location: 'Cần Thơ', area: 1000, zoneIds: [], latitude: 10, longitude: 105 };
const zone = { id: 1, farmId: 1, farmName: farm.name, code: 'zone-test', name: 'Khu kiểm thử', area: 100, soilType: 'Đất phù sa', representativeTreeId: 1, growthStage: 'KIEN_THIET_CO_BAN' };
const tree = { id: 1, zoneId: 1, zoneCode: zone.code, variety: 'Monthong', plantingDate: '2026-10-03', growthStage: zone.growthStage };
let retried = false;
document.addEventListener('click', event => {
  if (event.target instanceof Element && ['Thử lại', 'Retry'].includes(event.target.closest('button')?.textContent?.trim() ?? '')) retried = true;
}, { capture: true });
client.defaults.adapter = async config => {
  if (config.url === '/overview') return { data: mockOverviewData, status: 200, statusText: 'OK', headers: {}, config };
  if (['/zones', '/trees', '/farms'].some(path => config.url?.startsWith(path))) {
    if (mode === 'loading') return new Promise<Awaited<ReturnType<typeof adapter>>>(() => {});
    if ((mode === 'error' && !retried) || config.method === 'post' || config.method === 'put') {
      throw new AxiosError('Fixture failure', 'ERR_BAD_RESPONSE', config, undefined, { data: {}, status: 503, statusText: 'Unavailable', headers: {}, config });
    }
    const data = config.url === '/farms' ? mode === 'empty' && page !== 'list' ? [] : [farm]
      : config.url === '/zones' ? mode === 'empty' ? [] : [zone]
      : config.url === '/trees' ? [tree] : config.url?.startsWith('/trees/') ? tree : zone;
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  }
  return adapter(config);
};
history.replaceState(null, '', `/settings/zones${page === 'new' ? '/new' : page === 'edit' ? '/zone-test/edit' : ''}?farmId=1&nofixture=true`);
await import('../../src/main');
