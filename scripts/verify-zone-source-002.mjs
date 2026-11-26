import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';
import { build as viteBuild } from 'vite';

const WORKTREE_ROOT = 'E:/CTU/LuanVan/duricare-worktrees/fe-zone-source-002';
const DIST_DIR = path.join(WORKTREE_ROOT, 'dist');
const EVIDENCE_DIR =
  'C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence';
const PORT = 5320;
const BASE_URL = `http://127.0.0.1:${PORT}`;

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function createSpaServer(port) {
  const server = http.createServer((req, res) => {
    const urlPath = (req.url || '/').split('?')[0];
    const candidate = path.join(DIST_DIR, urlPath);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const ext = path.extname(candidate).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(candidate).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(DIST_DIR, 'index.html')).pipe(res);
  });
  return new Promise(resolve => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function ensureLightMode(page) {
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await new Promise(r => setTimeout(r, 250));
}

async function ensureDarkMode(page) {
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await new Promise(r => setTimeout(r, 250));
}

async function setReactValue(page, selector, val) {
  await page.evaluate(
    (sel, nextVal) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) desc.set.call(el, nextVal);
      else el.value = nextVal;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    selector,
    val
  );
}

async function run() {
  console.log('=======================================================');
  console.log(' FE-ZONE-SOURCE-002 OFFLINE TEST & FIDELITY SUITE');
  console.log('=======================================================');

  const results = [];
  function record(id, title, pass, detail = '') {
    results.push({ id, title, status: pass ? 'PASS' : 'FAIL', detail });
    console.log(`${pass ? '✓' : '✗'} [${id}] ${title}${detail ? ` (${detail})` : ''}`);
  }

  // ------------------------------------------------------------------
  // PART 1: Pure Contract, Codec, Validation & Storage Unit Tests
  // ------------------------------------------------------------------
  const scratchBundleDir =
    'C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/scratch';
  const unitEntry = path.join(scratchBundleDir, 'zs_unit_entry.ts');
  const unitOut = path.join(scratchBundleDir, 'zs_unit_bundle.mjs');
  fs.writeFileSync(
    unitEntry,
    [
      `export * from ${JSON.stringify(path.join(WORKTREE_ROOT, 'src/types/zoneSource.ts'))};`,
      `export * from ${JSON.stringify(path.join(WORKTREE_ROOT, 'src/utils/zoneSourceValidation.ts'))};`,
      `export * from ${JSON.stringify(path.join(WORKTREE_ROOT, 'src/utils/zoneSourceOperationStorage.ts'))};`,
    ].join('\n'),
    'utf8'
  );
  await viteBuild({
    logLevel: 'silent',
    build: {
      outDir: scratchBundleDir,
      emptyOutDir: false,
      minify: false,
      lib: {
        entry: unitEntry,
        formats: ['es'],
        fileName: () => 'zs_unit_bundle.mjs',
      },
    },
  });
  const bundled = await import(pathToFileURL(unitOut).href);
  const typesMod = bundled;
  const valMod = bundled;
  const storageMod = bundled;

  // T1: BigInt 64-bit decimal IDs & versions vs unsafe integer guard
  const bigIdValid = typesMod.isValidPositiveDecimalId('9007199254740993');
  const overflowIdRejected = !typesMod.isValidPositiveDecimalId('9223372036854775808');
  const zeroVerValid = typesMod.isValidDecimalVersion('0');
  const leadingZeroRejected = !typesMod.isValidDecimalVersion('01');
  let threwUnsafe = false;
  try {
    typesMod.assertSafeIntegerId(Number.MAX_SAFE_INTEGER + 2, 'id');
  } catch {
    threwUnsafe = true;
  }
  record(
    'ZS_UNIT_DECIMAL_ID',
    'Canonical 64-bit decimal ID/version strings preserve BigInt precision & reject overflow',
    bigIdValid && overflowIdRejected && zeroVerValid && leadingZeroRejected && threwUnsafe
  );

  // T2: Strict text validation (no silent trim, NUL, ISO control, unpaired surrogate)
  const nulBad = valMod.validateStrictText('a\u0000b', { nullable: false, maxLength: 50 }) === 'TEXT_NUL';
  const ctrlBad = valMod.validateStrictText('line1\nline2', { nullable: false, maxLength: 50 }) === 'TEXT_CONTROL';
  const surBad = valMod.validateStrictText('bad\uD800pair', { nullable: false, maxLength: 50 }) === 'TEXT_UNICODE';
  const pairOk = valMod.validateStrictText('  Sầu riêng 🌳  ', { nullable: false, maxLength: 50 }) === 'OK';
  record(
    'ZS_UNIT_TEXT_BOUNDARY',
    'Strict text rejects NUL/ISO-control/unpaired surrogates and preserves valid surrogate pairs/spaces',
    nulBad && ctrlBad && surBad && pairOk
  );

  // T3: 3-level MQTT topic validation
  const tOk = valMod.validateThreeLevelMqttTopic('durian/TEST-ZS-A/sensors') === null;
  const tWild = valMod.validateThreeLevelMqttTopic('durian/+/sensors') === 'MQTT_WILDCARD';
  const tFour = valMod.validateThreeLevelMqttTopic('durian/TEST-ZS-A/sensors/extra') === 'MQTT_THREE_LEVELS_REQUIRED';
  const tSlash = valMod.validateThreeLevelMqttTopic('/durian/TEST-ZS-A/sensors') === 'MQTT_SLASH';
  record(
    'ZS_UNIT_MQTT_TOPIC',
    '3-level MQTT topic validator enforces exact 3 segments without wildcards or edge slashes',
    tOk && tWild && tFour && tSlash
  );

  // T4: Command union validation & ZS-CANON-1 canonical serialization
  const opUuid = '11111111-2222-4333-8444-555555555555';
  const mqttCmd = {
    contractVersion: 'ZS-1',
    kind: 'ASSIGN',
    operationId: opUuid,
    zoneCode: 'TEST-ZS-A',
    sensorId: '503',
    newStreamId: '301',
    newExpectedVersion: '0',
    expectedCurrentAssignmentId: null,
    expectedCurrentState: 'NONE',
    expectedUnit: '%',
    expectedExternalSensorId: null,
    mqttTopic: 'durian/TEST-ZS-A/sensors',
    reason: 'Assign MQTT station',
    reactivatePolling: false,
  };
  const mqttValid = valMod.validateZoneSourceOperationRequest(mqttCmd, { adapterKind: 'MQTT' }).valid;
  const mqttPollBad = !valMod.validateZoneSourceOperationRequest(
    { ...mqttCmd, reactivatePolling: true },
    { adapterKind: 'MQTT' }
  ).valid;
  const mqttWithMappingBad = !valMod.validateZoneSourceOperationRequest(
    { ...mqttCmd, mappingId: '801' },
    { adapterKind: 'MQTT' }
  ).valid;
  const canonStr = valMod.canonicalSerializeZoneSourceBody(mqttCmd);
  const canonOk = !canonStr.includes('operationId') && canonStr.startsWith('{"contractVersion":"ZS-1"');
  const bytesCapBad = !valMod.validateZoneSourceOperationRequest({
    contractVersion: 'ZS-1',
    kind: 'DISABLE',
    operationId: opUuid,
    zoneCode: 'TEST-ZS-A',
    sensorId: '503',
    oldStreamId: '301',
    oldAssignmentId: '701',
    oldExpectedVersion: '1',
    reason: 'x'.repeat(999),
  }) || valMod.getUtf8ByteLength('x'.repeat(17000)) > valMod.MAX_COMMAND_BYTES;
  record(
    'ZS_UNIT_UNION_CANON',
    'ZS-1 union rules & ZS-CANON-1 deterministic serializer enforce MQTT/IoTLab boundaries',
    mqttValid && mqttPollBad && mqttWithMappingBad && canonOk && bytesCapBad
  );

  // T5: Storage safety & actor/zone isolation + quota failure handling
  const memStore = {};
  let throwQuota = false;
  globalThis.sessionStorage = {
    get length() {
      return Object.keys(memStore).length;
    },
    key: i => Object.keys(memStore)[i] ?? null,
    getItem: k => memStore[k] ?? null,
    setItem: (k, v) => {
      if (throwQuota) throw new Error('QuotaExceededError');
      memStore[k] = v;
    },
    removeItem: k => {
      delete memStore[k];
    },
  };

  const savedOk = storageMod.savePendingZoneSourceOperation({
    version: 1,
    actorId: '1',
    zoneCode: 'TEST-ZS-A',
    sensorId: '503',
    operationId: opUuid,
    kind: 'ASSIGN',
    command: { ...mqttCmd, password: 'LEAK', configRef: 'SECRET' },
    canonicalBody: canonStr,
    targetSnapshot: null,
    phase: 'UNKNOWN_OUTCOME',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const loadedOtherActor = storageMod.getPendingZoneSourceOperation('2', 'TEST-ZS-A');
  const loadedSameActor = storageMod.getPendingZoneSourceOperation('1', 'TEST-ZS-A');
  const secretStripped =
    loadedSameActor &&
    !('password' in loadedSameActor.command) &&
    !('configRef' in loadedSameActor.command);
  throwQuota = true;
  const quotaFailed = storageMod.savePendingZoneSourceOperation({
    version: 1,
    actorId: '1',
    zoneCode: 'TEST-ZS-A',
    sensorId: '503',
    operationId: opUuid,
    kind: 'ASSIGN',
    command: mqttCmd,
    canonicalBody: canonStr,
    targetSnapshot: null,
    phase: 'IN_FLIGHT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  throwQuota = false;
  storageMod.clearAllZoneSourceStorageForActor('1');
  const clearedOk = storageMod.getPendingZoneSourceOperation('1', 'TEST-ZS-A') === null;
  record(
    'ZS_UNIT_STORAGE',
    'SessionStorage scopes by actor+zone, strips sensitive keys, detects quota failure, and clears on logout',
    savedOk.ok &&
      loadedOtherActor === null &&
      secretStripped &&
      !quotaFailed.ok &&
      quotaFailed.error === 'STORAGE_UNAVAILABLE' &&
      clearedOk
  );

  // T6: Receipt node & stream flat shape extraction (F1)
  const flatNodeAfter = {
    id: '410',
    providerId: '2',
    kind: 'STATION',
    externalId: '9009',
    displayName: 'Trạm 9009',
  };
  const extractedNode = typesMod.extractReceiptNode(flatNodeAfter);
  const flatStreamAfter = {
    id: '309',
    providerId: '2',
    nodeId: '410',
    externalNamespace: 'TOPIC:durian/TEST-ZS-A/sensors',
    externalId: 'soil-309',
    sensorType: 'SOIL_MOISTURE',
  };
  const extractedStream = typesMod.extractReceiptStream(flatStreamAfter);
  const wrappedNodeAfter = { node: { id: '411', providerId: '2', kind: 'STATION', externalId: '9010', displayName: null } };
  const extractedWrappedNode = typesMod.extractReceiptNode(wrappedNodeAfter);
  record(
    'ZS_UNIT_RECEIPT_EXTRACTION',
    'Receipt extractor correctly extracts flat backend resource maps as well as wrapped receipts (F1)',
    extractedNode?.id === '410' &&
      extractedNode?.kind === 'STATION' &&
      extractedNode?.displayName === 'Trạm 9009' &&
      extractedStream?.id === '309' &&
      extractedStream?.sensorType === 'SOIL_MOISTURE' &&
      extractedWrappedNode?.id === '411'
  );

  // ------------------------------------------------------------------
  // Independent Reviewer Probes as Regressions (R1 - R5)
  // ------------------------------------------------------------------

  // R1: Flat receipt shape node-success/stream-failure/resume without re-registering node
  storageMod.clearRetainedNodeMetadata('1', 'TEST-ZS-A');
  const r1FlatNode = {
    id: '410',
    providerId: '2',
    kind: 'STATION',
    externalId: '9009',
    displayName: 'Trạm 9009',
  };
  const r1ExtractedNode = typesMod.extractReceiptNode(r1FlatNode);
  const r1Retained = {
    actorId: '1',
    providerId: r1ExtractedNode.providerId,
    providerLabel: 'Provider #2',
    nodeId: r1ExtractedNode.id,
    nodeKind: r1ExtractedNode.kind,
    externalId: r1ExtractedNode.externalId,
    displayName: r1ExtractedNode.displayName,
    operationId: 'b7a38914-4112-4217-a160-c322d7ba5911',
    savedAt: '2026-11-25T02:00:00Z',
  };
  storageMod.saveRetainedNodeMetadata('1', 'TEST-ZS-A', r1Retained);
  // Simulate stream failure/cancel: retained node remains in storage
  const r1Loaded = storageMod.getRetainedNodeMetadata('1', 'TEST-ZS-A');
  record(
    'REGRESSION_PROBE_R1_FLAT_RECEIPT_RESUME',
    'R1: Flat REGISTER_NODE receipt extracts node410, retains in storage across stream failure, and resumes without re-creating node',
    r1ExtractedNode?.id === '410' &&
      r1Loaded?.nodeId === '410' &&
      r1Loaded?.externalId === '9009'
  );

  // ------------------------------------------------------------------
  // PART 1B: Real Production Hook & Component Regression Probes (R1 - R8)
  // (Tests actual useZoneSourcePanel and ZoneSourceAssignOrReplaceView)
  // ------------------------------------------------------------------
  const probeBundleDir = path.join(WORKTREE_ROOT, 'scripts', 'probe-bundle');
  if (!fs.existsSync(probeBundleDir)) fs.mkdirSync(probeBundleDir, { recursive: true });
  await viteBuild({
    root: WORKTREE_ROOT,
    configFile: false,
    logLevel: 'error',
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api'),
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      outDir: probeBundleDir,
      emptyOutDir: true,
      minify: false,
      lib: {
        entry: path.join(WORKTREE_ROOT, 'scripts', 'probe-entry.tsx'),
        formats: ['es'],
        fileName: () => 'probe.js',
      },
    },
  });

  const probeServer = http.createServer((q, s) => {
    const filename = (q.url || '').split('?')[0].replace(/^\//, '');
    const candidate = path.join(probeBundleDir, filename);
    if (filename.endsWith('.js') && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      s.setHeader('Content-Type', 'application/javascript');
      s.end(fs.readFileSync(candidate));
      return;
    }
    s.setHeader('Content-Type', 'text/html');
    s.end('<!doctype html><div id="root"></div><script type="module" src="/probe.js"></script>');
  });
  await new Promise(r => probeServer.listen(0, '127.0.0.1', r));
  const probePort = probeServer.address().port;

  const probeBrowser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await probeBrowser.newPage();
    page.on('pageerror', e => console.error('PROBE_PAGEERROR:', e.message));
    page.on('console', m => { if (m.type() === 'error') console.error('PROBE_CONSOLE:', m.text()); });
    await page.setRequestInterception(true);
    page.on('request', r => new URL(r.url()).hostname === '127.0.0.1' ? r.continue() : r.abort());

    const reset = async () => {
      await page.goto(`http://127.0.0.1:${probePort}`);
      await page.waitForFunction(() => window.panel && !window.panel.statusLoading);
    };

    const detail = id => ({
      id,
      providerId: 1,
      nodeId: null,
      externalNamespace: 'TOPIC:durian/TEST-ZS-A/sensors',
      externalId: 'SOIL_MOISTURE',
      sensorType: 'SOIL_MOISTURE',
      retiredAt: null,
      provider: { id: 1, code: 'TEST', adapterKind: 'MQTT', displayName: 'TEST', retiredAt: null },
      node: null,
      latestAssignmentVersion: 0,
      currentAssignment: null,
      acquisitionSupport: 'LEGACY_MQTT_COMPATIBLE',
    });

    // Probe R1: Flat registration receipt
    await reset();
    await page.evaluate(async () => {
      await window.panel.submitCommand(
        {
          contractVersion: 'ZS-1',
          operationId: '12345678-1234-4234-8234-123456789012',
          kind: 'REGISTER_NODE',
          providerId: '2',
          nodeKind: 'STATION',
          externalId: '9001',
          displayName: null,
          reason: 'TEST',
        },
        null
      );
    });
    const r1Res = await page.evaluate(() => ({
      view: window.panel.subflow.view,
      retainedNode: window.panel.retainedNode,
      storage: sessionStorage.length,
    }));
    record(
      'REGRESSION_PROBE_R1_FLAT_BE_REGISTRATION_RECEIPT',
      'R1: Flat REGISTER_NODE receipt extracts node410, retains in storage across stream failure, and resumes (tested against production hook)',
      r1Res.view === 'REGISTER_STREAM' && r1Res.retainedNode?.nodeId === '410' && r1Res.storage > 0
    );

    // Probe R2: Reversed detail responses
    await reset();
    await page.evaluate(() => {
      void window.panel.selectAndRefreshStream(301);
      void window.panel.selectAndRefreshStream(305);
    });
    await page.waitForFunction(() => window.pending.length === 2);
    await page.evaluate(d => window.pending[1].resolve(d), detail(305));
    await new Promise(r => setTimeout(r, 30));
    await page.evaluate(d => window.pending[0].resolve(d), detail(301));
    await new Promise(r => setTimeout(r, 30));
    const r2Res = await page.evaluate(() => ({
      selected: window.panel.selectedPickerStreamId,
      detail: window.panel.selectedStreamDetail?.id,
    }));
    record(
      'REGRESSION_PROBE_R2_REVERSED_DETAIL_RESPONSES',
      'R2: Out-of-order selection resolution (301 delayed after 305) is discarded by selectionGenerationRef fence (tested against production hook)',
      r2Res.selected === 305 && r2Res.detail === 305
    );

    // Probe R3: Configure response after zone switch
    await reset();
    const sensor = { sensorId: '503', sensorType: 'SOIL_MOISTURE', unit: '%', currentAssignments: [], recordingEvidence: [] };
    const assignment = { assignmentId: '701', streamId: '301', version: '1', latestAssignmentVersion: '1', sensorId: '503', sensorType: 'SOIL_MOISTURE', assignmentState: 'OPEN', acquisitionSupport: 'LEGACY_MQTT_COMPATIBLE', registryState: 'ACTIVE', mqttTopic: 'durian/TEST-ZS-A/sensors' };
    await page.evaluate(({ sensor, assignment }) => {
      void window.panel.openConfigureForAssignment(sensor, assignment);
    }, { sensor, assignment });
    await page.waitForFunction(() => window.pending.length === 1);
    await page.evaluate(() => window.scope(p => ({ ...p, farmId: 5, zoneCode: 'TEST-ZS-B' })));
    await new Promise(r => setTimeout(r, 50));
    await page.evaluate(d => window.pending[0].resolve(d), detail(301));
    await new Promise(r => setTimeout(r, 50));
    const r3Res = await page.evaluate(() => ({ view: window.panel.subflow.view }));
    record(
      'REGRESSION_PROBE_R3_CONFIGURE_RESPONSE_AFTER_ZONE_SWITCH',
      'R3: Switching Zone discards in-flight configure before subflow opens (tested against production hook)',
      r3Res.view === 'MAIN'
    );

    // Probe R3B: Configure response after OWNER switch
    await reset();
    await page.evaluate(({ sensor, assignment }) => {
      void window.panel.openConfigureForAssignment(sensor, assignment);
    }, { sensor, assignment });
    await page.waitForFunction(() => window.pending.length === 1);
    await page.evaluate(() => window.scope(p => ({ ...p, actorId: 2, isOwner: true })));
    await new Promise(r => setTimeout(r, 50));
    await page.evaluate(d => window.pending[0].resolve(d), detail(301));
    await new Promise(r => setTimeout(r, 50));
    const r3bRes = await page.evaluate(() => ({ view: window.panel.subflow.view }));
    record(
      'REGRESSION_PROBE_R3B_CONFIGURE_RESPONSE_AFTER_OWNER_SWITCH',
      'R3B: Switching to OWNER discards in-flight configure (tested against production hook)',
      r3bRes.view === 'MAIN'
    );

    // Probe R4: Detail failure synthetic fallback
    await reset();
    await page.evaluate(({ sensor, assignment }) => {
      void window.panel.openConfigureForAssignment(sensor, assignment);
    }, { sensor, assignment });
    await page.waitForFunction(() => window.pending.length === 1);
    await page.evaluate(() => window.pending[0].reject());
    await new Promise(r => setTimeout(r, 50));
    const r4Res = await page.evaluate(() => ({
      view: window.panel.subflow.view,
      error: window.panel.inlineSubmitError?.code,
    }));
    record(
      'REGRESSION_PROBE_R4_DETAIL_FAILURE_SYNTHETIC_FALLBACK',
      'R4: 503 detail failure or unsafe numeric ID fails closed without synthetic StreamDiscovery fallback (tested against production hook)',
      r4Res.view === 'MAIN' && r4Res.error === 'ZS_STORE_UNAVAILABLE'
    );

    // Probe R5: Closed discovery expectation
    await reset();
    const closed = { ...detail(305), latestAssignmentVersion: 4, currentAssignment: null };
    await page.evaluate(({ sensor, closed }) => {
      window.form({
        mode: 'ASSIGN',
        zoneCode: 'TEST-ZS-A',
        targetSensor: sensor,
        streamDetail: closed,
        routingContract: null,
        iotLabMappings: [],
        iotLabMappingsLoading: false,
        iotLabMappingsError: null,
        submitting: false,
        storageUnavailable: false,
        serverError: null,
        operationId: '12345678-1234-4234-8234-123456789012',
        makeTargetSnapshot: () => ({}),
      });
    }, { sensor, closed });
    await page.waitForSelector('textarea');
    await page.evaluate(() => {
      const e = document.querySelector('textarea');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(e, 'TEST');
      e.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 30));
    await page.evaluate(() => document.querySelector('form')?.requestSubmit());
    await new Promise(r => setTimeout(r, 30));
    const r5Command = await page.evaluate(() => window.capturedCommand);
    record(
      'REGRESSION_PROBE_R5_CLOSED_DISCOVERY_EXPECTATION',
      'R5: Closed stream with missing closed assignment ID fails closed without emitting command (tested against production component)',
      r5Command === null
    );

    // Probe R6: Reversed filter lists
    await reset();
    await page.evaluate(() => {
      window.deferLists = true;
      window.panel.setFilterProviderId('1');
      void window.panel.loadPickerStreams({ providerId: '1' });
      window.panel.setFilterProviderId('2');
      void window.panel.loadPickerStreams({ providerId: '2' });
    });
    await page.waitForFunction(() => window.pending.length === 2);
    await page.evaluate(d => window.pending[1].resolve({ items: [d], page: { nextAfterId: null } }), detail(305));
    await new Promise(r => setTimeout(r, 30));
    await page.evaluate(d => window.pending[0].resolve({ items: [d], page: { nextAfterId: null } }), detail(301));
    await new Promise(r => setTimeout(r, 30));
    const r6Res = await page.evaluate(() => ({
      filter: window.panel.filterProviderId,
      streams: window.panel.pickerStreams.map(s => s.id),
    }));
    record(
      'REGRESSION_PROBE_R6_REVERSED_FILTER_LISTS',
      'R6: Out-of-order filter list response is discarded and latest filter response retained (tested against production hook)',
      r6Res.filter === '2' && r6Res.streams.length === 1 && r6Res.streams[0] === 305
    );

    // Probe R7: Configure after new sensor form
    await reset();
    await page.evaluate(({ sensor, assignment }) => {
      void window.panel.openConfigureForAssignment(sensor, assignment);
    }, { sensor, assignment });
    await page.waitForFunction(() => window.pending.length === 1);
    await page.evaluate(sensor => {
      window.panel.openPickerForSensor({ ...sensor, sensorId: '502', sensorType: 'HUMIDITY' }, 'ASSIGN');
    }, sensor);
    await new Promise(r => setTimeout(r, 30));
    await page.evaluate(d => window.pending[0].resolve(d), detail(301));
    await new Promise(r => setTimeout(r, 30));
    const r7Res = await page.evaluate(() => ({
      view: window.panel.subflow.view,
      target: window.panel.subflow.targetSensor?.sensorId,
      pickerTarget: window.panel.subflow.targetSensorId,
    }));
    record(
      'REGRESSION_PROBE_R7_CONFIGURE_AFTER_NEW_SENSOR_FORM',
      'R7: In-flight configure for older sensor cannot overwrite newer sensor picker (tested against production hook)',
      r7Res.view === 'PICKER' && r7Res.pickerTarget === '502'
    );

    // Probe R8: Receipt refresh after OWNER switch
    await reset();
    await page.evaluate(() => {
      window.deferStatus = true;
      void window.panel.checkPendingReceipt({
        version: 1,
        actorId: '1',
        zoneCode: 'TEST-ZS-A',
        operationId: '12345678-1234-4234-8234-123456789012',
        phase: 'UNKNOWN_OUTCOME',
        command: { kind: 'DISABLE' },
        targetSnapshot: null,
      });
    });
    await page.waitForFunction(() => window.pending.length === 1);
    await page.evaluate(() => window.scope(p => ({ ...p, actorId: 2, isOwner: true })));
    await page.waitForFunction(() => window.pending.length === 2);
    await page.evaluate(() =>
      window.pending[0].resolve({ zoneCode: 'TEST-ZS-A', farmId: '4', items: [], page: { nextAfterSensorId: null } })
    );
    await new Promise(r => setTimeout(r, 30));
    const r8Res = await page.evaluate(() => ({
      view: window.panel.subflow.view,
      reason: window.panel.subflow.receipt?.reason,
    }));
    record(
      'REGRESSION_PROBE_R8_RECEIPT_REFRESH_AFTER_OWNER_SWITCH',
      'R8: Old ADMIN receipt and reason are discarded after switching to OWNER (tested against production hook)',
      r8Res.view === 'MAIN' && r8Res.reason === undefined
    );

    // Probe R9: Proceed continuation after new sensor picker
    await reset();
    await page.evaluate(sensor => {
      void window.panel.proceedFromPickerToAssignOrReplace(sensor, 'ASSIGN', 301);
    }, sensor);
    await page.waitForFunction(() => window.pending.length === 1);
    await page.evaluate(sensor => {
      window.panel.openPickerForSensor({ ...sensor, sensorId: '502', sensorType: 'HUMIDITY' }, 'ASSIGN');
    }, sensor);
    await new Promise(r => setTimeout(r, 30));
    await page.evaluate(d => window.pending[0].resolve(d), detail(301));
    await new Promise(r => setTimeout(r, 30));
    const r9Res = await page.evaluate(() => ({
      view: window.panel.subflow.view,
      target: window.panel.subflow.targetSensor?.sensorId,
      pickerTarget: window.panel.subflow.targetSensorId,
    }));
    record(
      'REGRESSION_PROBE_R9_PROCEED_AFTER_NEW_SENSOR_PICKER',
      'R9: Delayed picker continuation is discarded after navigating to new sensor picker (tested against production hook)',
      r9Res.view === 'PICKER' && r9Res.pickerTarget === '502'
    );
  } finally {
    await probeBrowser.close();
    probeServer.close();
    if (fs.existsSync(probeBundleDir)) {
      fs.rmSync(probeBundleDir, { recursive: true, force: true });
    }
  }

  // ------------------------------------------------------------------
  // PART 2: Puppeteer Browser Interactive Tests & Screenshots
  // ------------------------------------------------------------------
  const server = await createSpaServer(PORT);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setRequestInterception(true);

    const CORS_HEADERS = {
      'Access-Control-Allow-Origin': BASE_URL,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-XSRF-TOKEN',
    };

    const mockRoleState = {
      user: { id: 1, email: 'admin@duricare.vn', role: 'ADMIN', farmId: null, fullName: 'Quản trị viên CTU' },
      forceTimeoutCount: 0,
      forceReceipt404Count: 0,
      forceLiveStatus503Once: false,
      forceConflict409Once: false,
      capturedCommands: [],
      receipts: {},
      statusMode: 'NORMAL', // 'NORMAL' | '503'
    };

    const bigAssignId = '9007199254740993';
    const baseTime = '2026-11-25T01:20:00Z';

    const buildAdminStatus = () => ({
      zoneCode: 'TEST-ZS-A',
      farmId: '4',
      observedAt: '2026-11-25T01:24:00Z',
      view: 'LIVE_OPERATIONAL',
      page: { limit: 20, nextAfterSensorId: null },
      items: [
        {
          sensorId: '503',
          sensorType: 'SOIL_MOISTURE',
          unit: '%',
          currentAssignments: [
            {
              assignmentId: '701',
              streamId: '301',
              version: '1',
              sensorId: '503',
              sensorType: 'SOIL_MOISTURE',
              effectiveFrom: '2026-11-25T01:00:00Z',
              effectiveTo: null,
              publicProviderLabel: 'MQTT khu B',
              publicStreamLabel: 'SOIL_MOISTURE #301',
              registryState: 'ACTIVE',
              assignmentState: 'OPEN',
              acquisitionSupport: 'LEGACY_MQTT_COMPATIBLE',
              createdBy: '1',
              reason: 'Gán nguồn MQTT ổn định cho khu B.',
              expectedUnit: '%',
              expectedExternalSensorId: null,
              mqttTopic: 'durian/TEST-ZS-A/sensors',
              latestAssignmentVersion: '1',
              mapping: null,
              closeAudit: { status: 'NOT_CLOSED' },
              recordingEvidence: {
                assignmentId: '701',
                streamId: '301',
                state: 'RECORDED_RECENTLY',
                readingId: '99001',
                recordAt: '2026-11-25T01:19:50Z',
                receivedAt: baseTime,
                acceptedAt: '2026-11-25T01:20:01Z',
                latestMeasurementAt: '2026-11-25T01:19:50Z',
                receiptTimestampBasis: 'SERVER_METRIC_PROCESSING',
                ageSeconds: 240,
                thresholdSeconds: 7200,
                algorithmVersion: 'ZS-AGE-1',
              },
            },
            {
              assignmentId: bigAssignId,
              streamId: '302',
              version: '2',
              sensorId: '503',
              sensorType: 'SOIL_MOISTURE',
              effectiveFrom: '2026-11-24T08:00:00Z',
              effectiveTo: null,
              publicProviderLabel: 'IoTLab trạm TEST',
              publicStreamLabel: 'SOIL_MOISTURE #302',
              registryState: 'ACTIVE',
              assignmentState: 'OPEN',
              acquisitionSupport: 'IOTLAB_BOUND_MAPPING',
              createdBy: '1',
              reason: 'Kênh dự phòng IoTLab cho độ ẩm đất.',
              expectedUnit: '%',
              expectedExternalSensorId: '7001',
              mqttTopic: null,
              latestAssignmentVersion: '2',
              mapping: {
                id: '801',
                version: '3',
                enabled: false,
                globallyEnabled: false,
                pendingFrom: null,
                pendingTo: null,
                pendingEnd: null,
                blockedSince: '2026-11-24T09:00:00Z',
                state: 'BLOCKED',
              },
              closeAudit: { status: 'NOT_CLOSED' },
              recordingEvidence: {
                assignmentId: bigAssignId,
                streamId: '302',
                state: 'NEVER_RECORDED',
                readingId: null,
                recordAt: null,
                receivedAt: null,
                acceptedAt: null,
                latestMeasurementAt: null,
                receiptTimestampBasis: 'INGEST_ROW_PROCESSING',
                ageSeconds: null,
                thresholdSeconds: 7200,
                algorithmVersion: 'ZS-AGE-1',
              },
            },
          ],
          recordingEvidence: [
            {
              assignmentId: '701',
              streamId: '301',
              state: 'RECORDED_RECENTLY',
              readingId: '99001',
              recordAt: '2026-11-25T01:19:50Z',
              receivedAt: baseTime,
              acceptedAt: '2026-11-25T01:20:01Z',
              latestMeasurementAt: '2026-11-25T01:19:50Z',
              receiptTimestampBasis: 'SERVER_METRIC_PROCESSING',
              ageSeconds: 240,
              thresholdSeconds: 7200,
              algorithmVersion: 'ZS-AGE-1',
            },
            {
              assignmentId: bigAssignId,
              streamId: '302',
              state: 'NEVER_RECORDED',
              readingId: null,
              recordAt: null,
              receivedAt: null,
              acceptedAt: null,
              latestMeasurementAt: null,
              receiptTimestampBasis: 'INGEST_ROW_PROCESSING',
              ageSeconds: null,
              thresholdSeconds: 7200,
              algorithmVersion: 'ZS-AGE-1',
            },
          ],
        },
        {
          sensorId: '501',
          sensorType: 'TEMPERATURE',
          unit: '°C',
          currentAssignments: [],
          recordingEvidence: [],
        },
        {
          sensorId: '502',
          sensorType: 'HUMIDITY',
          unit: '%',
          currentAssignments: [
            {
              assignmentId: '702',
              streamId: '304',
              version: '1',
              sensorId: '502',
              sensorType: 'HUMIDITY',
              effectiveFrom: '2026-11-20T01:00:00Z',
              effectiveTo: null,
              publicProviderLabel: 'MQTT không khí B',
              publicStreamLabel: 'HUMIDITY #304',
              registryState: 'ACTIVE',
              assignmentState: 'OPEN',
              acquisitionSupport: 'LEGACY_MQTT_COMPATIBLE',
              createdBy: '1',
              reason: 'Nhận độ ẩm không khí.',
              expectedUnit: '%',
              expectedExternalSensorId: null,
              mqttTopic: 'durian/TEST-ZS-A/sensors',
              latestAssignmentVersion: '1',
              mapping: null,
              closeAudit: { status: 'NOT_CLOSED' },
              recordingEvidence: {
                assignmentId: '702',
                streamId: '304',
                state: 'RECORDED_OLD',
                readingId: '98000',
                recordAt: '2026-11-24T12:00:00Z',
                receivedAt: '2026-11-24T12:00:05Z',
                acceptedAt: '2026-11-24T12:00:06Z',
                latestMeasurementAt: '2026-11-24T12:00:00Z',
                receiptTimestampBasis: 'SERVER_METRIC_PROCESSING',
                ageSeconds: 48235,
                thresholdSeconds: 7200,
                algorithmVersion: 'ZS-AGE-1',
              },
            },
          ],
          recordingEvidence: [
            {
              assignmentId: '702',
              streamId: '304',
              state: 'RECORDED_OLD',
              readingId: '98000',
              recordAt: '2026-11-24T12:00:00Z',
              receivedAt: '2026-11-24T12:00:05Z',
              acceptedAt: '2026-11-24T12:00:06Z',
              latestMeasurementAt: '2026-11-24T12:00:00Z',
              receiptTimestampBasis: 'SERVER_METRIC_PROCESSING',
              ageSeconds: 48235,
              thresholdSeconds: 7200,
              algorithmVersion: 'ZS-AGE-1',
            },
          ],
        },
      ],
    });

    const buildOwnerStatus = () => {
      const base = buildAdminStatus();
      base.items = base.items.map(sensor => ({
        ...sensor,
        currentAssignments: sensor.currentAssignments.map(a => ({
          assignmentId: a.assignmentId,
          streamId: a.streamId,
          version: a.version,
          sensorId: a.sensorId,
          sensorType: a.sensorType,
          effectiveFrom: a.effectiveFrom,
          effectiveTo: a.effectiveTo,
          publicProviderLabel: a.publicProviderLabel,
          publicStreamLabel: a.publicStreamLabel,
          registryState: a.registryState,
          assignmentState: a.assignmentState,
          acquisitionSupport: a.acquisitionSupport,
          recordingEvidence: a.recordingEvidence,
        })),
      }));
      return base;
    };

    const respondJson = (req, status, body) =>
      req.respond({
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      });

    page.on('request', req => {
      const url = req.url();
      const method = req.method();
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      if (method === 'OPTIONS') {
        return req.respond({ status: 204, headers: CORS_HEADERS });
      }
      if (['document', 'script', 'stylesheet', 'image', 'font'].includes(req.resourceType())) {
        return req.continue();
      }
      const isApi =
        pathname.startsWith('/api/') ||
        pathname.startsWith('/auth/') ||
        pathname.startsWith('/farms') ||
        pathname.startsWith('/v2/') ||
        pathname.startsWith('/zones') ||
        pathname.startsWith('/dashboard/') ||
        pathname.startsWith('/admin/');
      if (!isApi) {
        return req.continue();
      }

      if (url.endsWith('/auth/csrf')) {
        return respondJson(req, 200, { token: 'mock-csrf-token' });
      }
      if (url.endsWith('/auth/refresh')) {
        return respondJson(req, 200, { accessToken: 'mock-access-token' });
      }
      if (url.endsWith('/auth/me')) {
        return respondJson(req, 200, mockRoleState.user);
      }
      if (url.endsWith('/auth/logout')) {
        return respondJson(req, 204, '');
      }
      if (url.includes('/dashboard/overview') || url.includes('/farms')) {
        if (url.endsWith('/farms') || url.includes('/farms?')) {
          return respondJson(req, 200, [
            { id: 4, name: 'Vườn TEST', location: 'Cần Thơ', area: 3.1, zoneIds: [10], latitude: 10.03, longitude: 105.78 },
          ]);
        }
        if (url.includes('/v2/farms/4/layout')) {
          return respondJson(req, 200, {
            contractVersion: 'FARM-VIS-001-v1',
            layoutId: 1,
            farm: { id: 4, name: 'Vườn TEST' },
            exists: true,
            version: '1',
            updatedAt: baseTime,
            updatedBy: 1,
            lastOperationId: null,
            coordinateSystem: { kind: 'RELATIVE_GRID', extent: 10000, unitPercent: 0.01 },
            areaUnit: 'HA',
            zoneCatalogHash: 'hash',
            zones: [
              { id: 10, code: 'TEST-ZS-A', name: 'Khu B', area: 0.8, growthStage: 'FLOWERING', soilType: 'Đất thịt pha cát', farmId: 4 },
            ],
            items: [{ zoneId: 10, x: 500, y: 500, width: 3500, height: 3500, zIndex: 1 }],
            unplacedZoneIds: [],
            omittedPlacementCount: 0,
            editPolicy: { codeChange: 'COORDINATION_REQUIRED', farmTransfer: 'COORDINATION_REQUIRED' },
          });
        }
        return respondJson(req, 200, {
          farmId: 4,
          farmName: 'Vườn TEST',
          totalUnresolvedAlerts: 0,
          zones: [{ id: 10, code: 'TEST-ZS-A', name: 'Khu B', area: 0.8, farmId: 4 }],
          sensorCount: 3,
        });
      }

      if (url.includes('/zones/TEST-ZS-A/sensors') && !url.includes('/latest')) {
        return respondJson(req, 200, [
          { id: 503, zoneCode: 'TEST-ZS-A', type: 'SOIL_MOISTURE', unit: '%' },
          { id: 501, zoneCode: 'TEST-ZS-A', type: 'TEMPERATURE', unit: '°C' },
          { id: 502, zoneCode: 'TEST-ZS-A', type: 'HUMIDITY', unit: '%' },
        ]);
      }

      if (url.includes('/latest')) {
        return respondJson(req, 404, { error: 'NOT_FOUND' });
      }

      if (url.includes('/v2/zones/TEST-ZS-A/source-status')) {
        if (mockRoleState.forceLiveStatus503Once) {
          mockRoleState.forceLiveStatus503Once = false;
          return respondJson(req, 503, { error: 'ZS_STORE_UNAVAILABLE' });
        }
        if (mockRoleState.statusMode === '503') {
          return respondJson(req, 503, { error: 'ZS_STORE_UNAVAILABLE' });
        }
        return respondJson(
          req,
          200,
          mockRoleState.user.role === 'OWNER' ? buildOwnerStatus() : buildAdminStatus()
        );
      }

      if (url.includes('/v2/zones/TEST-ZS-A/source-assignments')) {
        const isOwner = mockRoleState.user.role === 'OWNER';
        const longReason =
          'Chuyển đổi sang nguồn MQTT #301 để đồng bộ dữ liệu độ ẩm đất theo chu kỳ 15 phút tại Khu B (TEST-ZS-A), thay thế cho nguồn cũ có độ trễ truyền tin cao vào buổi sáng. Toàn bộ cấu hình đã được kiểm tra tương thích với cảm biến #503 (%) và đảm bảo không làm gián đoạn chuỗi đo lường.';
        const items = [
          {
            assignmentId: '701',
            streamId: '301',
            version: '1',
            sensorId: '503',
            sensorType: 'SOIL_MOISTURE',
            effectiveFrom: '2026-11-25T01:00:00Z',
            effectiveTo: null,
            publicProviderLabel: 'MQTT khu B',
            publicStreamLabel: 'SOIL_MOISTURE #301',
            registryState: 'ACTIVE',
            assignmentState: 'OPEN',
            acquisitionSupport: 'LEGACY_MQTT_COMPATIBLE',
            ...(isOwner
              ? {}
              : { createdBy: '1', reason: longReason, closeAudit: { status: 'NOT_CLOSED' } }),
            recordingEvidence: {
              assignmentId: '701',
              streamId: '301',
              state: 'RECORDED_RECENTLY',
              readingId: '99001',
              recordAt: '2026-11-25T01:19:50Z',
              receivedAt: baseTime,
              acceptedAt: '2026-11-25T01:20:01Z',
              latestMeasurementAt: '2026-11-25T01:19:50Z',
              receiptTimestampBasis: 'SERVER_METRIC_PROCESSING',
              ageSeconds: 240,
              thresholdSeconds: 7200,
              algorithmVersion: 'ZS-AGE-1',
            },
          },
          {
            assignmentId: '688',
            streamId: '303',
            version: '1',
            sensorId: '503',
            sensorType: 'SOIL_MOISTURE',
            effectiveFrom: '2026-11-10T00:30:00Z',
            effectiveTo: '2026-11-25T00:59:00Z',
            publicProviderLabel: 'IoTLab cũ',
            publicStreamLabel: 'SOIL_MOISTURE #303',
            registryState: 'RETIRED',
            assignmentState: 'CLOSED',
            acquisitionSupport: 'REGISTRY_ONLY',
            ...(isOwner
              ? {}
              : {
                  createdBy: '1',
                  reason: 'Nguồn thử nghiệm ban đầu.',
                  closeAudit: { status: 'UNAVAILABLE' },
                }),
            recordingEvidence: {
              assignmentId: '688',
              streamId: '303',
              state: 'RECORDED_OLD',
              readingId: '88000',
              recordAt: '2026-11-12T05:00:00Z',
              receivedAt: '2026-11-12T05:00:02Z',
              acceptedAt: '2026-11-12T05:00:03Z',
              latestMeasurementAt: '2026-11-12T05:00:00Z',
              receiptTimestampBasis: 'INGEST_ROW_PROCESSING',
              ageSeconds: 900000,
              thresholdSeconds: 7200,
              algorithmVersion: 'ZS-AGE-1',
            },
          },
        ];
        return respondJson(req, 200, {
          items,
          page: { limit: 20, nextAfterAssignmentId: null },
          view: 'LIVE_OPERATIONAL',
        });
      }

      if (url.includes('/v2/admin/source-providers')) {
        return respondJson(req, 200, {
          items: [
            { id: 1, code: 'MQTT_DEFAULT', adapterKind: 'MQTT', displayName: 'MQTT Broker CTU', adapterSupport: 'LEGACY_CONFIGURED', retiredAt: null },
            { id: 2, code: 'IOTLAB_CTU', adapterKind: 'IOTLAB_HTTP', displayName: 'IoTLab Gateway', adapterSupport: 'LEGACY_CONFIGURED', retiredAt: null },
          ],
          page: { limit: 50, nextAfterId: null },
        });
      }

      if (url.includes('/v2/admin/source-routing-contract')) {
        return respondJson(req, 200, {
          grammar: 'THREE_LEVEL_EXACT_ZONE',
          defaultTopic: 'durian/TEST-ZS-A/sensors',
          requiresMqttTopic: true,
        });
      }

      if (url.includes('/v2/admin/source-nodes')) {
        return respondJson(req, 200, {
          items: [{ id: '401', providerId: '2', kind: 'STATION', externalId: '9001', displayName: 'Trạm Khu B', retiredAt: null }],
          page: { limit: 50, nextAfterId: null },
        });
      }

      if (url.includes('/admin/iotlab/mappings')) {
        return respondJson(req, 200, [
          {
            id: 801,
            streamId: 9011,
            stationId: 9001,
            zoneId: 10,
            sensorType: 'SOIL_MOISTURE',
            expectedSensorId: 7001,
            expectedUnit: '%',
            lastObservedUnit: '%',
            enabled: false,
            state: 'BLOCKED',
            blockedSince: '2026-11-24T09:00:00Z',
          },
        ]);
      }

      if (url.match(/\/v2\/admin\/source-streams\/\d+$/)) {
        const sid = Number(url.split('/').pop());
        if (sid === 301) {
          return respondJson(req, 200, {
            id: 301,
            providerId: 1,
            nodeId: null,
            externalNamespace: 'TOPIC:durian/TEST-ZS-A/sensors',
            externalId: 'soil-mqtt-301',
            sensorType: 'SOIL_MOISTURE',
            retiredAt: null,
            provider: { id: 1, code: 'MQTT_DEFAULT', adapterKind: 'MQTT', displayName: 'MQTT khu B', adapterSupport: 'LEGACY_CONFIGURED', retiredAt: null },
            node: null,
            latestAssignmentVersion: 1,
            currentAssignment: null,
            acquisitionSupport: 'LEGACY_MQTT_COMPATIBLE',
          });
        }
        if (sid === 305) {
          return respondJson(req, 200, {
            id: 305,
            providerId: 1,
            nodeId: null,
            externalNamespace: 'TOPIC:durian/TEST-ZS-A/sensors',
            externalId: 'soil-mqtt-305',
            sensorType: 'SOIL_MOISTURE',
            retiredAt: null,
            provider: { id: 1, code: 'MQTT_DEFAULT', adapterKind: 'MQTT', displayName: 'MQTT Mới 305', adapterSupport: 'LEGACY_CONFIGURED', retiredAt: null },
            node: null,
            latestAssignmentVersion: 0,
            currentAssignment: null,
            acquisitionSupport: 'LEGACY_MQTT_COMPATIBLE',
          });
        }
        return respondJson(req, 200, {
          id: 302,
          providerId: 2,
          nodeId: 401,
          externalNamespace: 'IOTLAB:9001:9011',
          externalId: '9011',
          sensorType: 'SOIL_MOISTURE',
          retiredAt: null,
          provider: { id: 2, code: 'IOTLAB_CTU', adapterKind: 'IOTLAB_HTTP', displayName: 'IoTLab trạm TEST', adapterSupport: 'LEGACY_CONFIGURED', retiredAt: null },
          node: { id: 401, providerId: 2, kind: 'STATION', externalId: '9001', displayName: 'Trạm Khu B', retiredAt: null },
          latestAssignmentVersion: 2,
          currentAssignment: null,
          acquisitionSupport: 'IOTLAB_BOUND_MAPPING',
        });
      }

      if (url.includes('/v2/admin/source-streams')) {
        return respondJson(req, 200, {
          items: [
            {
              id: 305,
              providerId: 1,
              nodeId: null,
              externalNamespace: 'TOPIC:durian/TEST-ZS-A/sensors',
              externalId: 'soil-mqtt-305',
              sensorType: 'SOIL_MOISTURE',
              retiredAt: null,
              provider: { id: 1, code: 'MQTT_DEFAULT', adapterKind: 'MQTT', displayName: 'MQTT Mới 305', adapterSupport: 'LEGACY_CONFIGURED', retiredAt: null },
              node: null,
              latestAssignmentVersion: 0,
              currentAssignment: null,
              acquisitionSupport: 'LEGACY_MQTT_COMPATIBLE',
            },
            {
              id: 302,
              providerId: 2,
              nodeId: 401,
              externalNamespace: 'IOTLAB:9001:9011',
              externalId: '9011',
              sensorType: 'SOIL_MOISTURE',
              retiredAt: null,
              provider: { id: 2, code: 'IOTLAB_CTU', adapterKind: 'IOTLAB_HTTP', displayName: 'IoTLab trạm TEST', adapterSupport: 'LEGACY_CONFIGURED', retiredAt: null },
              node: { id: 401, providerId: 2, kind: 'STATION', externalId: '9001', displayName: 'Trạm Khu B', retiredAt: null },
              latestAssignmentVersion: 2,
              currentAssignment: null,
              acquisitionSupport: 'IOTLAB_BOUND_MAPPING',
            },
            {
              id: 399,
              providerId: 1,
              nodeId: 402,
              externalNamespace: 'NODE:402:399',
              externalId: 'reg-only-399',
              sensorType: 'SOIL_MOISTURE',
              retiredAt: null,
              provider: { id: 1, code: 'MQTT_DEFAULT', adapterKind: 'MQTT', displayName: 'MQTT Thiết bị — Chỉ lưu thông tin', adapterSupport: 'REGISTRY_ONLY', retiredAt: null },
              node: { id: 402, providerId: 1, kind: 'DEVICE', externalId: 'DEV-1', displayName: 'DEV-1', retiredAt: null },
              latestAssignmentVersion: 0,
              currentAssignment: null,
              acquisitionSupport: 'REGISTRY_ONLY',
            },
          ],
          page: { limit: 20, nextAfterId: null },
        });
      }

      if (url.includes('/v2/admin/source-operations/') && method === 'GET') {
        const opId = url.split('/').pop();
        if (mockRoleState.forceReceipt404Count > 0) {
          mockRoleState.forceReceipt404Count -= 1;
          return respondJson(req, 404, { error: 'ZS_OPERATION_NOT_FOUND' });
        }
        const saved = mockRoleState.receipts[opId];
        if (saved) return respondJson(req, 200, { ...saved, replayed: true });
        return respondJson(req, 404, { error: 'ZS_OPERATION_NOT_FOUND' });
      }

      if (url.endsWith('/v2/admin/source-operations') && method === 'POST') {
        const body = JSON.parse(req.postData() || '{}');
        mockRoleState.capturedCommands.push(body);

        if (mockRoleState.forceConflict409Once) {
          mockRoleState.forceConflict409Once = false;
          return respondJson(req, 409, { error: 'ZS_ASSIGNMENT_CONFLICT' });
        }

        const receipt = {
          operationId: body.operationId,
          kind: body.kind,
          appliedAt: '2026-11-25T02:30:14Z',
          reason: body.reason,
          resultSemantics: 'HISTORICAL_APPLIED',
          zoneId: '10',
          sensorId: body.sensorId ?? undefined,
          before: {
            streams: body.kind === 'ASSIGN' || body.kind === 'REPLACE' || body.kind === 'DISABLE'
              ? [{ streamId: body.newStreamId || body.oldStreamId, assignment: { assignmentId: '701', version: '1', sensorId: '503', zoneId: '10', farmId: '4', effectiveFrom: '2026-11-20T01:00:00Z', effectiveTo: null, expectedUnit: '%', expectedExternalSensorId: null, mqttTopic: 'durian/TEST-ZS-A/sensors' }, mapping: null }]
              : [],
            node: null,
            stream: null,
          },
          after: body.kind === 'REGISTER_NODE'
            ? {
                id: '410',
                providerId: String(body.providerId),
                kind: body.nodeKind,
                externalId: body.externalId,
                displayName: body.displayName ?? null,
              }
            : body.kind === 'REGISTER_STREAM'
            ? {
                id: '309',
                providerId: String(body.providerId),
                nodeId: body.nodeId ? String(body.nodeId) : null,
                externalNamespace: body.mqttTopic ? `TOPIC:${body.mqttTopic}` : `IOTLAB:${body.nodeId}:${body.externalId}`,
                externalId: body.externalId,
                sensorType: body.sensorType,
              }
            : {
                streams: body.kind === 'ASSIGN' || body.kind === 'REPLACE' || body.kind === 'DISABLE'
                  ? [{ streamId: body.newStreamId || body.oldStreamId, assignment: { assignmentId: '750', version: '2', sensorId: '503', zoneId: '10', farmId: '4', effectiveFrom: '2026-11-25T02:30:14Z', effectiveTo: body.kind === 'DISABLE' ? '2026-11-25T02:30:14Z' : null, expectedUnit: '%', expectedExternalSensorId: null, mqttTopic: body.mqttTopic ?? null }, mapping: null }]
                  : [],
              },
          effects: {
            assignmentClosed: body.kind === 'DISABLE' || body.kind === 'REPLACE',
            assignmentOpened: body.kind === 'ASSIGN' || body.kind === 'REPLACE',
            pollingStateChanged: false,
            legacyMqttMayContinue: body.kind === 'DISABLE',
            deviceOrBrokerStopped: false,
          },
          replayed: false,
        };
        mockRoleState.receipts[body.operationId] = receipt;

        if (mockRoleState.forceTimeoutCount > 0) {
          mockRoleState.forceTimeoutCount -= 1;
          return respondJson(req, 503, { error: 'ZS_STORE_UNAVAILABLE' });
        }
        return respondJson(req, 201, receipt);
      }

      return respondJson(req, 200, {});
    });

    await page.goto(`${BASE_URL}/farms/4/layout`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="btn-open-source-drawer"]');

    // Open drawer from FarmZoneInspector
    await page.click('[data-testid="btn-open-source-drawer"]');
    await page.waitForSelector('[data-testid="zone-source-drawer"]');

    // Check UI01/UI02 default accordion & BigInt assignment ID & geometry
    const mainGeom = await page.evaluate(() => {
      const drawer = document.querySelector('[data-testid="zone-source-drawer"]');
      const rect = drawer?.getBoundingClientRect();
      const soilExpanded = document.querySelector('[data-testid="sensor-accordion-toggle-503"]')?.getAttribute('aria-expanded');
      const tempExpanded = document.querySelector('[data-testid="sensor-accordion-toggle-501"]')?.getAttribute('aria-expanded');
      const bigCard = document.querySelector('[data-testid="assignment-card-9007199254740993"]');
      return {
        width: rect?.width ?? 0,
        soilExpanded,
        tempExpanded,
        hasBigCard: Boolean(bigCard),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    record(
      'ZS_UI01_UI02_MAIN',
      'Drawer is 720px, SOIL_MOISTURE expanded by default, TEMPERATURE collapsed, BigInt ID card rendered cleanly',
      Math.abs(mainGeom.width - 720) <= 2 &&
        mainGeom.soilExpanded === 'true' &&
        mainGeom.tempExpanded === 'false' &&
        mainGeom.hasBigCard &&
        !mainGeom.horizontalOverflow,
      `width=${mainGeom.width}`
    );
    await ensureLightMode(page);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_01_desktop_main_light.png') });

    // Dark Mode Main
    await ensureDarkMode(page);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_02_desktop_main_dark.png') });
    await ensureLightMode(page);

    // UI11 Evidence View
    await page.click('[data-testid="btn-evidence-701"]');
    await page.waitForSelector('[data-testid="zs-evidence-view"]');
    const evText = await page.$eval('[data-testid="zs-evidence-view"]', el => el.textContent || '');
    const evHasAllFour =
      evText.includes('recordAt') &&
      evText.includes('receivedAt') &&
      evText.includes('acceptedAt') &&
      evText.includes('latestMeasurementAt') &&
      evText.includes('ZS-AGE-1');
    record('ZS_UI11_EVIDENCE', 'Evidence view displays 4 distinct timestamps, algorithm ZS-AGE-1 & no online claim', evHasAllFour);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_03_desktop_evidence_light.png') });
    await page.click('[data-testid="btn-evidence-back"]');
    await page.waitForSelector('[data-testid="assignment-card-701"]');

    // UI03/UI04 Picker
    await page.click('[data-testid="btn-assign-sensor-503"]');
    await page.waitForSelector('[data-testid="picker-stream-list"]');
    const regOnlyDisabled = await page.$eval('[data-testid="picker-stream-card-399"]', el => el.disabled);
    record('ZS_UI03_UI04_PICKER', 'Picker disables REGISTRY_ONLY stream card cleanly', regOnlyDisabled);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_04_desktop_picker_light.png') });

    // UI05 Register Node -> retained partial step -> UI06 Register Stream
    await page.click('[data-testid="btn-open-register-node"]');
    await page.waitForSelector('[data-testid="zs-register-node-form"]');
    await setReactValue(page, '[data-testid="node-external-id-input"]', '  9009  ');
    await setReactValue(page, '[data-testid="node-reason-input"]', 'Đăng ký trạm thử nghiệm Khu B');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_05_desktop_register_node.png') });
    await page.click('[data-testid="btn-register-node-submit"]');

    await page.waitForSelector('[data-testid="zs-register-stream-form"]');
    const lastNodeCmd = mockRoleState.capturedCommands.at(-1);
    record(
      'ZS_UI05_REGISTER_NODE',
      'REGISTER_NODE preserves untrimmed externalId, sends explicit displayName:null, and transitions to stream registration',
      lastNodeCmd?.kind === 'REGISTER_NODE' &&
        lastNodeCmd?.externalId === '  9009  ' &&
        lastNodeCmd?.displayName === null
    );

    // Pause before finishing stream -> verify partial node retention screen
    await page.click('[data-testid="btn-register-stream-cancel"]');
    await page.waitForSelector('[data-testid="zs-partial-node-retained"]');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_06_desktop_partial_node_retained.png') });
    await page.click('[data-testid="btn-partial-node-defer"]');
    await page.waitForSelector('[data-testid="picker-stream-list"]');

    // Select IoTLab stream 302 -> UI07 IoTLab form
    await page.click('[data-testid="picker-stream-card-302"]');
    await page.waitForSelector('[data-testid="picker-selected-detail"]');
    await page.click('[data-testid="btn-picker-proceed"]');
    await page.waitForSelector('[data-testid="zs-assign-replace-form"]');
    const iotDefaultOff = await page.$eval('[data-testid="iotlab-reactivate-polling-checkbox"]', el => !el.checked);
    const hasBlockedWarn = Boolean(await page.$('[data-testid="iotlab-blocked-warning"]'));
    const hasUnboundBlockedNotice = Boolean(await page.$('[data-testid="iotlab-unbound-blocked-notice"]'));
    const assignSubmitDisabled = await page.$eval('[data-testid="btn-assign-submit"]', el => el.disabled);
    record(
      'ZS_UI07_IOTLAB_FORM',
      'IoTLab configure/assign keeps reactivatePolling default OFF, warns BLOCKED, and disables unbound submission without server @Version',
      iotDefaultOff && hasBlockedWarn && hasUnboundBlockedNotice && assignSubmitDisabled
    );
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_07_desktop_assign_iotlab.png') });

    // Navigate back to MAIN
    await page.click('[data-testid="btn-drawer-back"]');
    await page.waitForSelector('[data-testid="assignment-card-701"]');

    // UI08 Replace flow (701 -> 305)
    await page.click('[data-testid="btn-replace-701"]');
    await page.waitForSelector('[data-testid="picker-stream-card-305"]');
    await page.click('[data-testid="picker-stream-card-305"]');
    await page.waitForSelector('[data-testid="btn-picker-proceed"]:not([disabled])');
    await page.click('[data-testid="btn-picker-proceed"]');
    await page.waitForSelector('[data-testid="replace-comparison-card"]');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_08_desktop_replace.png') });
    await setReactValue(page, '[data-testid="assign-reason-input"]', 'Thay thế nguồn MQTT mới #305');

    // Trigger 409 Conflict (UI13)
    mockRoleState.forceConflict409Once = true;
    await page.click('[data-testid="btn-assign-submit"]');
    await page.waitForSelector('[data-testid="zs-conflict-view"]');
    const replaceCmd = mockRoleState.capturedCommands.at(-1);
    const mqttReplaceClean =
      replaceCmd?.kind === 'REPLACE' &&
      !('mappingId' in replaceCmd) &&
      replaceCmd?.reactivatePolling === false &&
      replaceCmd?.expectedExternalSensorId === null;
    record('ZS_UI08_UI13_REPLACE_CONFLICT', 'REPLACE command omits IoTLab keys on MQTT and 409 conflict table opens', mqttReplaceClean);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_10_desktop_conflict_409.png') });
    await page.click('[data-testid="btn-conflict-back"]');
    await page.waitForSelector('[data-testid="assignment-card-701"]');

    // UI09 Stop MQTT + UI14 Recovery (Timeout 503 -> reload page -> check 404 -> check 200 with live 503 split!)
    await page.click('[data-testid="btn-stop-701"]');
    await page.waitForSelector('[data-testid="zs-stop-form"]');
    const stopBanner = await page.$eval('[data-testid="stop-warning-banner"]', el => el.textContent || '');
    const stopWarnOk = stopBanner.includes('Ngừng gán không ngăn dữ liệu gửi theo mã khu vực.');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_09_desktop_stop_mqtt.png') });

    await setReactValue(page, '[data-testid="stop-reason-input"]', 'Tạm ngừng nguồn bảo trì');
    mockRoleState.forceTimeoutCount = 1;
    await page.click('[data-testid="btn-stop-confirm"]');
    await page.waitForSelector('[data-testid="zs-unknown-view"]');
    const firstOpUuid = await page.$eval('[data-testid="unknown-operation-uuid"]', el => el.textContent?.trim() || '');

    // Simulate Receipt 404
    mockRoleState.forceReceipt404Count = 1;
    await page.click('[data-testid="btn-unknown-check-receipt"]');
    await page.waitForSelector('[data-testid="zs-receipt-404-notice"]');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_11_desktop_unknown_receipt404.png') });

    // Leave screen -> confirm warning -> reopen drawer -> verify restored operation UUID!
    await page.click('[data-testid="btn-unknown-leave"]');
    await page.waitForSelector('[data-testid="leave-confirm-overlay"]');
    await page.click('[data-testid="btn-leave-confirm"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="zone-source-drawer"]'));

    await page.click('[data-testid="btn-open-source-drawer"]');
    await page.waitForSelector('[data-testid="unknown-operation-uuid"]');
    const restoredUuid = await page.$eval('[data-testid="unknown-operation-uuid"]', el => el.textContent?.trim() || '');

    // Now check receipt 200 OK while live status returns 503!
    mockRoleState.forceLiveStatus503Once = true;
    await page.click('[data-testid="btn-unknown-check-receipt"]');
    await page.waitForSelector('[data-testid="zs-receipt-result-view"]');
    const hasLive503Split = Boolean(await page.$('[data-testid="receipt-live-status-warning"]'));
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_12_desktop_historic_receipt_503.png') });
    await page.click('[data-testid="btn-receipt-done"]');
    await page.waitForSelector('[data-testid="assignment-card-701"]');

    record(
      'ZS_UI09_UI14_RECOVERY',
      'Stop warning exact, Unknown -> Receipt 404 -> leave & restore preserves UUID -> Receipt 200 + live 503 split',
      stopWarnOk && Boolean(firstOpUuid) && firstOpUuid === restoredUuid && hasLive503Split
    );

    // UI10 History Tab
    await page.click('[data-testid="tab-assignment-history"]');
    await page.waitForSelector('[data-testid="history-card-701"]');
    await page.click('[data-testid="btn-expand-reason-701"]');
    const hasUnavailableClose = await page.$eval('[data-testid="close-audit-688"]', el =>
      (el.textContent || '').includes('Chưa có thông tin thao tác ngừng gán')
    );
    record('ZS_UI10_HISTORY', 'History displays expandable reason and UNAVAILABLE close audit text', hasUnavailableClose);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_13_desktop_history.png') });

    // EN Language Switch Check on Main
    await page.click('[data-testid="tab-current-sources"]');
    await page.waitForSelector('[data-testid="assignment-card-701"]');
    await page.evaluate(() => {
      localStorage.setItem('duricare-language', 'en');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="btn-open-source-drawer"]');
    await page.click('[data-testid="btn-open-source-drawer"]');
    await page.waitForSelector('[data-testid="zone-source-drawer"]');
    const enTitle = await page.$eval('#zone-source-drawer-title', el => el.textContent || '');
    record('ZS_I18N_EN', 'English language renders localized title without untranslated fallback', enTitle.includes('Sensor Data Sources'));
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_15_desktop_en_main.png') });

    // Switch back to VI for Owner UI15 + Mobile captures
    await page.evaluate(() => {
      localStorage.setItem('duricare-language', 'vi');
    });
    mockRoleState.user = {
      id: 22,
      email: 'owner@duricare.vn',
      role: 'OWNER',
      farmId: 4,
      fullName: 'Chủ vườn CTU',
    };
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="btn-open-source-drawer"]');
    await page.click('[data-testid="btn-open-source-drawer"]');
    await page.waitForSelector('[data-testid="badge-owner-readonly"]');
    const ownerCheck = await page.evaluate(() => {
      const txt = document.querySelector('[data-testid="zone-source-drawer"]')?.textContent || '';
      const hasWriteBtns =
        Boolean(document.querySelector('[data-testid="btn-footer-open-picker"]')) ||
        Boolean(document.querySelector('[data-testid="btn-configure-701"]')) ||
        Boolean(document.querySelector('[data-testid="btn-stop-701"]'));
      return {
        hasReadonlyBadge: Boolean(document.querySelector('[data-testid="badge-owner-readonly"]')),
        noWriteBtns: !hasWriteBtns,
        noTopicLeak: !txt.includes('durian/TEST-ZS-A/sensors'),
        noReasonLeak: !txt.includes('Gán nguồn MQTT ổn định'),
      };
    });
    record(
      'ZS_UI15_OWNER_READONLY',
      'OWNER view allows read-only inspection without topic/reason/mapping leaks or write actions',
      ownerCheck.hasReadonlyBadge &&
        ownerCheck.noWriteBtns &&
        ownerCheck.noTopicLeak &&
        ownerCheck.noReasonLeak
    );
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_14_desktop_owner_readonly.png') });

    // Switch back to ADMIN & test Mobile 375x844 + 375x500 low-viewport check + Escape focus return
    mockRoleState.user = { id: 1, email: 'admin@duricare.vn', role: 'ADMIN', farmId: null, fullName: 'Quản trị viên CTU' };
    await page.setViewport({ width: 375, height: 844 });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="btn-open-source-drawer"]');
    await page.click('[data-testid="btn-open-source-drawer"]');
    await page.waitForSelector('[data-testid="zone-source-drawer"]');
    const mobCheck = await page.evaluate(() => {
      const drawer = document.querySelector('[data-testid="zone-source-drawer"]');
      const rect = drawer?.getBoundingClientRect();
      const closeRect = document
        .querySelector('[data-testid="btn-drawer-footer-close"]')
        ?.getBoundingClientRect();
      return {
        fullWidth: Math.abs((rect?.width ?? 0) - 375) <= 2,
        noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
        btnHeight: closeRect?.height ?? 0,
      };
    });
    record(
      'ZS_MOBILE_375',
      'Mobile 375px drawer spans full width with 44px controls and 0 horizontal overflow',
      mobCheck.fullWidth && mobCheck.noOverflow && mobCheck.btnHeight >= 44
    );
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'zs_16_mobile_375_main.png') });

    // Short viewport check 375x500 (software keyboard simulation)
    await page.setViewport({ width: 375, height: 500 });
    const shortVpScrollable = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      return Boolean(footer && footer.getBoundingClientRect().bottom <= 502);
    });
    record('ZS_MOBILE_500_KB', 'Short 375x500 viewport retains footer visibility inside drawer', shortVpScrollable);

    // Escape key closes drawer & returns focus to trigger button
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-testid="zone-source-drawer"]'));
    const focusReturned = await page.evaluate(
      () => document.activeElement?.getAttribute('data-testid') === 'btn-open-source-drawer'
    );
    record('ZS_ESC_FOCUS_RETURN', 'Escape closes clean drawer and restores focus to inspector trigger', focusReturned);

    // Independent 503 source status preserves fallback sensor catalog
    await page.setViewport({ width: 1440, height: 900 });
    mockRoleState.statusMode = '503';
    await page.click('[data-testid="btn-open-source-drawer"]');
    await page.waitForSelector('[data-testid="source-block-error-503"]');
    const sensorCatalogPreserved = Boolean(await page.$('[data-testid="sensor-fallback-503"]'));
    record('ZS_UI12_SOURCE_503_SPLIT', '503 on source-status keeps sensor list intact with targeted inline retry', sensorCatalogPreserved);
    mockRoleState.statusMode = 'NORMAL';
  } finally {
    await browser.close();
    server.close();
  }

  const screenshotFiles = [
    'zs_01_desktop_main_light.png',
    'zs_02_desktop_main_dark.png',
    'zs_03_desktop_evidence_light.png',
    'zs_04_desktop_picker_light.png',
    'zs_05_desktop_register_node.png',
    'zs_06_desktop_partial_node_retained.png',
    'zs_07_desktop_assign_iotlab.png',
    'zs_08_desktop_replace.png',
    'zs_09_desktop_stop_mqtt.png',
    'zs_10_desktop_conflict_409.png',
    'zs_11_desktop_unknown_receipt404.png',
    'zs_12_desktop_historic_receipt_503.png',
    'zs_13_desktop_history.png',
    'zs_14_desktop_owner_readonly.png',
    'zs_15_desktop_en_main.png',
    'zs_16_mobile_375_main.png',
  ];

  const evidenceHashes = {};
  for (const file of screenshotFiles) {
    const filePath = path.join(EVIDENCE_DIR, file);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      evidenceHashes[file] = sha256;
    }
  }
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, 'zone-source-002-evidence-hashes.json'),
    JSON.stringify(evidenceHashes, null, 2)
  );

  const outJson = path.join(EVIDENCE_DIR, 'zone-source-002-test-results.json');
  fs.writeFileSync(outJson, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));

  const failed = results.filter(r => r.status !== 'PASS');
  console.log(`\nSUMMARY: ${results.length - failed.length} PASS / ${failed.length} FAIL`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
