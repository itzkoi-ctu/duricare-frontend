import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useZoneSourcePanel } from '../src/hooks/useZoneSourcePanel';
import Assign from '../src/components/zoneSource/ZoneSourceAssignOrReplaceView';
import client from '../src/api/client';
import { AxiosError } from 'axios';

const g = window as any;
g.pending = [];
g.calls = [];
g.capturedCommand = null;
g.formProps = null;
g.deferStatus = false;
g.deferLists = false;
g.assignmentsHandler = null;

client.defaults.adapter = async (config: any) => {
  g.calls.push({ method: config.method, url: config.url, data: config.data });
  const response = (data: any, status = 200) => ({
    data,
    status,
    statusText: 'TEST',
    headers: {},
    config,
  });

  if (config.url.endsWith('/source-status')) {
    if (g.deferStatus) {
      return await new Promise(resolve =>
        g.pending.push({ url: config.url, resolve: (data: any) => resolve(response(data)) })
      );
    }
    return response({
      zoneCode: 'TEST-ZS-A',
      farmId: '4',
      items: [],
      page: { nextAfterSensorId: null },
    });
  }

  if (config.url.endsWith('/source-streams') && g.deferLists) {
    return await new Promise(resolve =>
      g.pending.push({ url: config.url, resolve: (data: any) => resolve(response(data)) })
    );
  }

  if (config.url.includes('/source-assignments')) {
    if (typeof g.assignmentsHandler === 'function') {
      const custom = await g.assignmentsHandler(config);
      if (custom) return response(custom.data ?? custom, custom.status ?? 200);
    }
  }

  if (/source-operations\//.test(config.url)) {
    return response({
      operationId: '12345678-1234-4234-8234-123456789012',
      kind: 'DISABLE',
      appliedAt: '2026-11-25T00:00:00Z',
      reason: 'ADMIN PRIVATE REASON',
      resultSemantics: 'HISTORICAL_APPLIED',
      before: { streams: [{ streamId: '301', assignment: { mqttTopic: 'durian/TEST-ZS-A/sensors' } }] },
      after: { streams: [] },
      effects: {},
      replayed: false,
    });
  }

  if (config.url.endsWith('/source-operations') && config.method === 'post') {
    const c = JSON.parse(config.data);
    return response(
      {
        operationId: c.operationId,
        kind: c.kind,
        appliedAt: '2026-11-25T00:00:00Z',
        reason: c.reason,
        resultSemantics: 'HISTORICAL_APPLIED',
        before: {},
        after: {
          id: '410',
          providerId: '2',
          kind: 'STATION',
          externalId: '9001',
          displayName: null,
        },
        effects: {},
        replayed: false,
      },
      201
    );
  }

  if (/source-streams\/\d+$/.test(config.url)) {
    return await new Promise((resolve, reject) =>
      g.pending.push({
        url: config.url,
        resolve: (data: any) => resolve(response(data)),
        reject: () =>
          reject(
            new AxiosError(
              'TEST_UNAVAILABLE',
              'ERR_BAD_RESPONSE',
              config,
              null,
              response({ error: 'ZS_STORE_UNAVAILABLE' }, 503)
            )
          ),
      })
    );
  }

  return response({ items: [], page: { nextAfterId: null } });
};

function App() {
  const [scope, setScope] = useState({
    isOpen: true,
    zoneCode: 'TEST-ZS-A',
    farmId: 4,
    actorId: 1,
    isOwner: false,
    onClose: () => {},
  });
  const [form, setForm] = useState<any>(null);
  g.scope = setScope;
  g.form = setForm;
  g.panel = useZoneSourcePanel(scope);

  return form
    ? React.createElement(Assign, {
        ...form,
        onSubmit: (c: any) => (g.capturedCommand = c),
        onDirtyChange: () => {},
        onCancel: () => {},
      })
    : React.createElement('div', null, 'TEST HOOK');
}

createRoot(document.getElementById('root')!).render(React.createElement(App));
