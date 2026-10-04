// Synthetic mutation-state checks only. Never imported by production, never sends a real PATCH.
import axios, { AxiosError } from 'axios';
import client from '../../src/api/client';
import { mockOverviewData } from '../../src/fixtures/overviewFixture';
import type { GrowthStage } from '../../src/types/zone';
const mode = new URLSearchParams(location.search).get('mode');
const adapter = axios.getAdapter(client.defaults.adapter);
let stage: GrowthStage = 'KIEN_THIET_CO_BAN';
let updated = false;
let failedOnce = false;
const failure = (config: Parameters<typeof adapter>[0]) => new AxiosError('Fixture failure', 'ERR_BAD_RESPONSE', config, undefined,
  { data: {}, status: 503, statusText: 'Unavailable', headers: {}, config });
client.defaults.adapter = async config => {
  const response = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config });
  if (config.url?.startsWith('/trees/') && config.method === 'patch') {
    if (mode === 'loading') return new Promise<Awaited<ReturnType<typeof adapter>>>(() => {});
    if (mode === 'error' && !failedOnce) { failedOnce = true; throw failure(config); }
    stage = JSON.parse(String(config.data)).growthStage as GrowthStage; updated = true;
    return response({ id: 5, zoneId: 6, zoneCode: 'stage-test', variety: 'Ri6', plantingDate: '2026-10-03', growthStage: stage });
  }
  if (config.url === '/zones') return response([{ id: 6, farmId: 3, farmName: 'Nông trại kiểm thử', code: 'stage-test', name: 'Khu kiểm thử trạng thái', area: 100, soilType: 'Đất phù sa', representativeTreeId: mode === 'empty' ? null : 5, growthStage: stage }]);
  if (config.url === '/alerts') return response([]);
  if (config.url?.startsWith('/zones/')) return response(config.url.endsWith('/latest')
    ? { id: 1, value: 76, recordAt: new Date().toISOString() } : []);
  if (config.url === '/overview') {
    if (mode === 'refresh-error' && updated) throw failure(config);
    const zone = mockOverviewData.zones[0];
    return response({ ...mockOverviewData, farmName: 'Nông trại kiểm thử', zones: [{ ...zone, code: 'stage-test', growthStage: stage,
      metrics: { ...zone.metrics, soilMoisture: { ...zone.metrics.soilMoisture, targetMin: stage === 'RA_HOA' ? 70 : 65, targetMax: 80 } } }] });
  }
  return adapter(config);
};
history.replaceState(null, '', '/zones/stage-test?farmId=3&nofixture=true');
await import('../../src/main');
