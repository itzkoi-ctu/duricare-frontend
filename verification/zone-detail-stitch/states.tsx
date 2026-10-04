// Explicitly simulated states, independent of application routes and live data.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AxiosError } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import client from '../../src/api/client';
import '../../src/styles/index.css';
import { AuthProvider } from '../../src/contexts/AuthContext';
import SensorChart from '../../src/components/SensorChart';
import CareLogTimeline from '../../src/components/CareLogTimeline';
import MetricChip from '../../src/components/MetricChip';
import type { CareLog } from '../../src/types/careLog';
import type { MetricStatus } from '../../src/types/overview';

let logMode: 'empty' | 'error' = 'empty';
let failSave = true;
let logs: CareLog[] = [];
const statuses: MetricStatus[] = ['NORMAL', 'LOW', 'HIGH', 'SENSOR_ERROR', 'NO_SIGNAL'];
client.defaults.adapter = async config => {
  const response = { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  if (config.url === '/auth/csrf') return { ...response, data: { token: 'fixture-token' } };
  if (config.url?.startsWith('/auth/')) throw new AxiosError('fixture unauthenticated', 'ERR_BAD_REQUEST', config, undefined, { ...response, status: 401 });
  await new Promise(resolve => setTimeout(resolve, 1500));
  if (config.url === '/care-logs' && config.method === 'get') {
    if (logMode === 'error') throw new AxiosError('RAW_DETAILS_MUST_NOT_RENDER', 'ERR_BAD_RESPONSE', config, undefined, { ...response, status: 503 });
    return { ...response, data: logs };
  }
  if (config.url === '/care-logs' && config.method === 'post') {
    if (failSave) { failSave = false; throw new AxiosError('RAW_DETAILS_MUST_NOT_RENDER', 'ERR_BAD_RESPONSE', config, undefined, { ...response, status: 503 }); }
    const values = JSON.parse(String(config.data));
    logs = [{ ...values, id: 1, zoneCode: 'zoneA', performedAt: new Date().toISOString() }];
    return { ...response, status: 201, data: logs[0] };
  }
  throw new AxiosError('Unexpected fixture request');
};

export default function Fixture() {
  const [logKey, setLogKey] = useState(0);
  const [retried, setRetried] = useState(false);
  return <main className="bg-bg min-h-screen text-text p-4 space-y-5">
    <h1 className="text-lg font-bold">Kiểm chứng trạng thái — dữ liệu mô phỏng, không gửi API thật</h1>
    <div className="flex flex-wrap gap-2"><button className="border p-2" onClick={() => { logMode = 'error'; setLogKey(value => value + 1); }}>Lỗi tải nhật ký</button>
      <button className="border p-2" onClick={() => { logMode = 'empty'; logs = []; setLogKey(value => value + 1); }}>Nhật ký rỗng</button></div>
    <AuthProvider><CareLogTimeline key={logKey} zoneCode="zoneA" zoneId={1} /></AuthProvider>
    <SensorChart title="Biểu đồ đang tải" icon="water_drop" unit="%" color="var(--color-blue)" chart={{ loading: true, error: null, data: [] }} />
    <SensorChart title="Biểu đồ rỗng" icon="water_drop" unit="%" color="var(--color-blue)" chart={{ loading: false, error: null, data: [] }} />
    <SensorChart title="Biểu đồ lỗi" icon="water_drop" unit="%" color="var(--color-blue)" chart={{ loading: false, error: retried ? null : 'RAW_DETAILS_MUST_NOT_RENDER', data: [] }} onRetry={() => setRetried(true)} />
    <div aria-label="Kiểm chứng nhãn trạng thái" className="space-y-3 max-w-[311px]">
      {statuses.map(status => <div key={status} className="grid grid-cols-3 gap-2">{(['temperature', 'humidity', 'soilMoisture'] as const).map(metricKey =>
        <MetricChip key={metricKey} variant="detail" metricKey={metricKey} metric={{ value: 76, unit: metricKey === 'temperature' ? 'C' : '%', status, recordedAt: null, targetMin: 70, targetMax: 80 }} />)}</div>)}
    </div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<MemoryRouter><Fixture /></MemoryRouter>);
