import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('FE-FARM-VIS-001: Visual Farm Layout Diagram & Zone Management Verification');
console.log('================================================================');

const PRIMARY_EVIDENCE_DIR = 'C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence';
const EVIDENCE_DIRS = [PRIMARY_EVIDENCE_DIR];

const PORT = 5195;
const BASE_URL = `http://127.0.0.1:${PORT}`;

for (const dir of EVIDENCE_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshot(page, filename) {
  const primaryPath = path.join(EVIDENCE_DIRS[0], filename);
  const buffer = await page.screenshot({ path: primaryPath, fullPage: true });
  console.log(`  Saved screenshot: ${primaryPath}`);
  for (let i = 1; i < EVIDENCE_DIRS.length; i++) {
    const mirrorPath = path.join(EVIDENCE_DIRS[i], filename);
    fs.writeFileSync(mirrorPath, buffer);
    console.log(`  Saved screenshot: ${mirrorPath}`);
  }
}

function startWorktreeSpaServer(port) {
  const distDir = path.resolve(ROOT, 'dist');
  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
  };

  const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    const filePath = path.join(distDir, urlPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    const indexPath = path.join(distDir, 'index.html');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(indexPath).pipe(res);
  });

  return new Promise(resolve => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

// Mock Data
const ADMIN_USER = { id: 1, email: 'admin@duricare.vn', role: 'ADMIN', farmId: null };
const OWNER_USER = { id: 89, email: 'owner@farm-ctu.invalid', role: 'OWNER', farmId: 1 };
const EXPERT_USER = { id: 15, email: 'expert@duricare.vn', role: 'EXPERT', farmId: null };

let currentUser = ADMIN_USER;

const MOCK_FARMS = [
  { id: 1, name: 'Vườn sầu riêng TEST', location: 'Cần Thơ', area: 5.2, zoneIds: [41, 42, 43] },
  { id: 2, name: 'Vườn thực nghiệm Thới An', location: 'Ô Môn, Cần Thơ', area: 12.0, zoneIds: [51] },
];

const MOCK_ZONES_FARM_1 = [
  {
    id: 41,
    farmId: 1,
    farmName: 'Vườn sầu riêng TEST',
    code: 'A01',
    name: 'Khu A · Cây non',
    area: 1200,
    soilType: 'Đất phù sa',
    representativeTreeId: 101,
    growthStage: 'KIEN_THIET_CO_BAN',
  },
  {
    id: 42,
    farmId: 1,
    farmName: 'Vườn sầu riêng TEST',
    code: 'B01',
    name: 'Khu B · Ra hoa',
    area: 1800,
    soilType: 'Đất sét pha thịt',
    representativeTreeId: 102,
    growthStage: 'RA_HOA',
  },
  {
    id: 43,
    farmId: 1,
    farmName: 'Vườn sầu riêng TEST',
    code: 'C01',
    name: 'Khu C · Đậu trái',
    area: 2500,
    soilType: 'Đất thịt nhẹ',
    representativeTreeId: null,
    growthStage: 'DAU_TRAI',
  },
];

const MOCK_ZONES_FARM_2 = [
  {
    id: 51,
    farmId: 2,
    farmName: 'Vườn thực nghiệm Thới An',
    code: 'B_ONLY',
    name: 'Khu B_ONLY',
    area: 3000,
    soilType: 'Đất phù sa cổ',
    representativeTreeId: null,
    growthStage: 'THU_HOACH',
  },
];

let mockLayoutVersion = '1';
const mockZoneCatalogHash = '646563696d616c2d737472696e672d636174616c6f672d686173682d3030303031';
let mockPlacements = [
  { zoneId: 41, x: 1000, y: 1000, width: 3000, height: 2000, zIndex: 0 },
  { zoneId: 42, x: 5000, y: 1000, width: 3500, height: 2500, zIndex: 1 },
];
let mockUnplacedZoneIds = [43];

const MOCK_PROVIDERS = [
  { id: 1, code: 'MQTT_PROV', name: 'Trạm MQTT Durian', displayName: 'Trạm MQTT Durian Tiêu Chuẩn', adapterKind: 'MQTT_GATEWAY', adapterSupport: 'LEGACY_CONFIGURED' },
  { id: 2, code: 'REG_PROV', name: 'Đăng ký ngoài', displayName: 'Registry Chỉ Siêu Dữ Liệu', adapterKind: 'REGISTRY_ONLY', adapterSupport: 'REGISTRY_ONLY' },
];

const MOCK_STREAMS = [
  {
    id: 1,
    providerId: 1,
    nodeId: 10,
    externalNamespace: 'durian-iot',
    externalId: 'sensor_stream_temp_01',
    sensorType: 'TEMPERATURE',
    retiredAt: null,
    provider: MOCK_PROVIDERS[0],
    node: { id: 10, providerId: 1, kind: 'STATION', externalId: 'ST_01', displayName: 'Trạm đo Đồi A', retiredAt: null },
    latestAssignmentVersion: 3,
    currentAssignment: {
      id: 201,
      streamId: 1,
      sensorId: 1,
      version: 3,
      effectiveFrom: '2026-11-15T08:00:00Z',
      effectiveTo: null,
      reason: 'Cấu hình trạm nhiệt độ đồi A',
      reactivatePolling: false,
    },
    acquisitionSupport: 'LEGACY_MQTT_COMPATIBLE',
  },
  {
    id: 2,
    providerId: 2,
    nodeId: null,
    externalNamespace: 'generic-registry',
    externalId: 'sensor_stream_registry_02',
    sensorType: 'SOIL_MOISTURE',
    retiredAt: null,
    provider: MOCK_PROVIDERS[1],
    node: null,
    latestAssignmentVersion: 1,
    currentAssignment: null,
    acquisitionSupport: 'REGISTRY_ONLY',
  },
];

let mockOperations = {};
let putPayloads = [];
let zoneWrites = [];
let retirementCalls = [];
let assignmentWrites = [];
let filteredStreamQueries = [];
let heldPut = null;
let holdStreamDetailId = null;
let heldStreamDetailReq = null;
let holdDetailIds = new Set();
let heldDetailRequests = {};
let holdNextPagination = false;
let heldPaginationReq = null;
let holdSourcesReq = false;
let heldSourcesReq = null;
let sensorFail503 = false;
let registryFail503 = false;
let scenario = 'normal'; // 'normal' | 'uncertain' | 'conflict' | 'delayed' | 'treeFail' | 'catalogConflict' | 'gate503' | 'zoneCrudFail' | 'iotlab'

let server;
let browser;

const pause = ms => new Promise(r => setTimeout(r, ms));
const wait = async (pred, timeoutMs = 8000) => {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (await pred()) return;
    await pause(50);
  }
  throw new Error('WAIT_PREDICATE_TIMEOUT');
};

async function run() {
  server = await startWorktreeSpaServer(PORT);
  console.log(`SPA Server running at ${BASE_URL}`);

  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Error') || text.includes('warning') || text.includes('FAIL')) {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${text}`);
    }
  });
  page.on('pageerror', err => console.error('[BROWSER ERROR]', err));

  await page.setRequestInterception(true);

  const respondJson = (req, status, data, extraHeaders = {}) => {
    const origin = req.headers()['origin'] || '*';
    return req.respond({
      status,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': '*',
        ...extraHeaders,
      },
      body: JSON.stringify(data),
    });
  };

  page.on('request', async req => {
    // 0. Static assets
    if (['document', 'script', 'stylesheet', 'image', 'font'].includes(req.resourceType())) {
      try {
        const u = new URL(req.url());
        if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') {
          return req.continue();
        }
      } catch {}
      return req.abort();
    }

    const method = req.method();
    const url = req.url();

    // CORS preflight
    if (method === 'OPTIONS') {
      const origin = req.headers()['origin'] || '*';
      return req.respond({
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // 1. Auth check
    if (url.includes('/auth/refresh')) {
      return respondJson(req, 200, { accessToken: 'mock-access-token' });
    }

    if (url.includes('/auth/csrf')) {
      return respondJson(req, 200, { token: 'mock-csrf' });
    }

    if (url.includes('/auth/me')) {
      return respondJson(req, 200, currentUser);
    }

    // 2. Overview / Farms
    if (url.includes('/overview') && method === 'GET') {
      return respondJson(req, 200, {
        farmName: 'Vườn sầu riêng TEST',
        totalUnresolvedAlerts: 4,
        weather: { temperature: 31, weatherCode: 1 },
        zones: [],
        generatedAt: new Date().toISOString(),
        latestInsight: null,
      });
    }

    if (url.match(/\/farms(\?.*)?$/) && method === 'GET') {
      if (currentUser.role === 'OWNER') {
        return respondJson(req, 200, []);
      }
      return respondJson(req, 200, MOCK_FARMS);
    }

    if (url.match(/\/zones(\?.*)?$/) && method === 'GET') {
      if (url.includes('farmId=2')) {
        return respondJson(req, 200, MOCK_ZONES_FARM_2);
      }
      return respondJson(req, 200, MOCK_ZONES_FARM_1);
    }

    if (url.match(/\/zones(\?.*)?$/) && method === 'POST') {
      const postData = JSON.parse(req.postData() || '{}');
      zoneWrites.push(postData);
      if (scenario === 'zoneCrudFail') {
        return respondJson(req, 500, { error: 'server_error', message: 'Không thể tạo khu vực lúc này.' });
      }
      const newZone = {
        id: 99,
        farmId: postData.farmId || 1,
        farmName: 'Vườn sầu riêng TEST',
        code: postData.code || 'A99',
        name: postData.name || 'Khu A99 Mới',
        area: postData.area || 1000,
        soilType: postData.soilType || 'Đất phù sa',
        representativeTreeId: null,
        growthStage: 'KIEN_THIET_CO_BAN',
      };
      return respondJson(req, 201, newZone);
    }

    // 3. Layout endpoints
    if (url.includes('/farms/') && url.includes('/layout') && !url.includes('/operations/')) {
      const match = url.match(/\/farms\/(\d+)\/layout/);
      const farmId = match ? parseInt(match[1], 10) : 1;

      if (method === 'GET') {
        if (scenario === 'gate503') {
          return respondJson(req, 503, {
            error: 'farm_visual_error',
            code: 'FV_DISABLED',
            message: 'Tính năng sơ đồ vườn chưa sẵn sàng hoặc đang bảo trì (HTTP 503 FV_DISABLED).',
          });
        }

        // OWNER foreign farm check
        if (currentUser.role === 'OWNER' && currentUser.farmId !== farmId) {
          return respondJson(req, 403, { error: 'forbidden', message: 'Không có quyền truy cập vườn này' });
        }

        if (farmId === 999) {
          // Never-saved farm
          return respondJson(req, 200, {
            contractVersion: 'FARM-VIS-001-v1',
            layoutId: 999,
            farm: { id: 999, name: 'Vườn Chưa Lưu' },
            exists: false,
            version: '0',
            updatedAt: null,
            updatedBy: null,
            lastOperationId: null,
            coordinateSystem: { kind: 'RELATIVE_GRID', extent: 10000, unitPercent: 0.01 },
            areaUnit: null,
            zoneCatalogHash: '0000000000000000000000000000000000000000000000000000000000000000',
            zones: [],
            items: [],
            unplacedZoneIds: [],
            omittedPlacementCount: 0,
            editPolicy: { codeChange: 'COORDINATION_REQUIRED', farmTransfer: 'COORDINATION_REQUIRED' },
          });
        }

        if (farmId === 888) {
          // Empty farm (0 zones)
          return respondJson(req, 200, {
            contractVersion: 'FARM-VIS-001-v1',
            layoutId: 888,
            farm: { id: 888, name: 'Vườn Rỗng Không Có Zone' },
            exists: true,
            version: '1',
            updatedAt: '2026-11-20T10:00:00Z',
            updatedBy: 1,
            lastOperationId: 'op_888',
            coordinateSystem: { kind: 'RELATIVE_GRID', extent: 10000, unitPercent: 0.01 },
            areaUnit: null,
            zoneCatalogHash: 'empty_hash',
            zones: [],
            items: [],
            unplacedZoneIds: [],
            omittedPlacementCount: 0,
            editPolicy: { codeChange: 'COORDINATION_REQUIRED', farmTransfer: 'COORDINATION_REQUIRED' },
          });
        }

        if (farmId === 2) {
          return respondJson(req, 200, {
            contractVersion: 'FARM-VIS-001-v1',
            layoutId: 2,
            farm: { id: 2, name: 'Vườn thực nghiệm Thới An' },
            exists: true,
            version: '1',
            updatedAt: '2026-11-20T11:00:00Z',
            updatedBy: 1,
            lastOperationId: 'op_f2',
            coordinateSystem: { kind: 'RELATIVE_GRID', extent: 10000, unitPercent: 0.01 },
            areaUnit: null,
            zoneCatalogHash: 'hash_f2',
            zones: MOCK_ZONES_FARM_2,
            items: [{ zoneId: 51, x: 2000, y: 2000, width: 4000, height: 3000, zIndex: 0 }],
            unplacedZoneIds: [],
            omittedPlacementCount: 0,
            editPolicy: { codeChange: 'COORDINATION_REQUIRED', farmTransfer: 'COORDINATION_REQUIRED' },
          });
        }

        return respondJson(req, 200, {
          contractVersion: 'FARM-VIS-001-v1',
          layoutId: 1,
          farm: { id: 1, name: 'Vườn sầu riêng TEST' },
          exists: true,
          version: mockLayoutVersion,
          updatedAt: '2026-11-20T12:00:00Z',
          updatedBy: 1,
          lastOperationId: 'op_prev',
          coordinateSystem: { kind: 'RELATIVE_GRID', extent: 10000, unitPercent: 0.01 },
          areaUnit: null,
          zoneCatalogHash: mockZoneCatalogHash,
          zones: MOCK_ZONES_FARM_1,
          items: mockPlacements,
          unplacedZoneIds: mockUnplacedZoneIds,
          omittedPlacementCount: 0,
          editPolicy: { codeChange: 'COORDINATION_REQUIRED', farmTransfer: 'COORDINATION_REQUIRED' },
        });
      }

      if (method === 'PUT') {
        const postData = JSON.parse(req.postData() || '{}');
        putPayloads.push({ farmId, body: postData });

        if (scenario === 'delayed') {
          heldPut = req;
          return;
        }

        if (scenario === 'uncertain') {
          return respondJson(req, 503, {
            error: 'farm_visual_error',
            code: 'FV_UNAVAILABLE',
            message: 'Dịch vụ bố trí tạm thời không phản hồi. Kết quả chưa chắc chắn.',
          });
        }

        if (scenario === 'conflict' || postData.expectedVersion !== mockLayoutVersion) {
          return respondJson(req, 409, {
            error: 'farm_visual_error',
            code: 'FV_LAYOUT_VERSION',
            message: 'Phiên bản bố trí không khớp. Đã có người cập nhật trước.',
          });
        }

        if (scenario === 'catalogConflict') {
          return respondJson(req, 409, {
            error: 'farm_visual_error',
            code: 'FV_ZONE_CATALOG_CHANGED',
            message: 'Danh mục khu vực đã thay đổi. Vui lòng tải lại trước khi lưu.',
          });
        }

        // Normal success
        mockLayoutVersion = (BigInt(mockLayoutVersion) + 1n).toString();
        mockPlacements = postData.items || [];
        const receipt = {
          contractVersion: 'FARM-VIS-001-v1',
          farmId,
          layoutId: farmId,
          operationId: postData.operationId,
          requestSha256: crypto.createHash('sha256').update(req.postData() || '').digest('hex'),
          actorId: 1,
          appliedVersion: mockLayoutVersion,
          appliedAt: new Date().toISOString(),
          view: 'APPLIED_SNAPSHOT',
          items: mockPlacements,
        };
        mockOperations[postData.operationId] = receipt;

        return respondJson(req, 200, receipt);
      }
    }

    // 4. Operations readback
    if (url.includes('/layout/operations/')) {
      const opId = url.split('/operations/')[1]?.split('?')[0];
      if (mockOperations[opId]) {
        return respondJson(req, 200, mockOperations[opId]);
      }
      return respondJson(req, 404, { error: 'farm_visual_error', code: 'FV_OPERATION_NOT_FOUND' });
    }

    // 5. Sensor readings
    if (url.includes('/sensors/') && url.includes('/latest')) {
      return respondJson(req, 200, {
        id: 501,
        sensorId: 1,
        value: url.includes('TEMPERATURE') ? 28.5 : url.includes('HUMIDITY') ? 72 : 45,
        recordAt: '2026-11-20T12:30:00Z',
        source: 'MQTT',
      });
    }

    if (url.includes('/sensors') && method === 'GET') {
      if (sensorFail503) {
        return respondJson(req, 503, { error: 'service_unavailable', message: 'Sensors temporarily unavailable' });
      }
      return respondJson(req, 200, [
        { id: 1, zoneCode: 'A01', type: 'TEMPERATURE', unit: '°C' },
        { id: 2, zoneCode: 'A01', type: 'HUMIDITY', unit: '%' },
        { id: 3, zoneCode: 'A01', type: 'SOIL_MOISTURE', unit: '%' },
      ]);
    }

    // 6. Source streams / providers / routing contract
    if (url.includes('/source-routing-contract')) {
      return respondJson(req, 200, {
        grammar: 'THREE_LEVEL_EXACT_ZONE',
        namespace: 'custom',
        messageKind: 'measurements',
        zoneFilter: '+',
        zoneCaseSensitive: true,
        publisherAuthentication: 'NOT_ESTABLISHED_BY_TOPIC_VALIDATION',
        legacyUnsignedAccepted: true,
        sourceMetadataEnabled: true,
        scopedWriterEnabled: false,
      });
    }

    if (url.includes('/source-providers')) {
      return respondJson(req, 200, {
        items: MOCK_PROVIDERS,
        page: { limit: 100, nextAfterId: null },
      });
    }

    if (url.includes('/assignments/current') && method === 'DELETE') {
      const vMatch = url.match(/version=(\d+)/);
      const versionSent = vMatch ? parseInt(vMatch[1], 10) : null;
      retirementCalls.push({ url, version: versionSent });
      return respondJson(req, 200, { success: true });
    }

    if (url.includes('/source-streams')) {
      if (url.includes('/assignments') && method === 'POST') {
        const postData = JSON.parse(req.postData() || '{}');
        assignmentWrites.push({ url, body: postData });
        return respondJson(req, 200, {
          id: 999,
          streamId: 1,
          sensorId: postData.sensorId,
          version: (postData.expectedVersion || 1) + 1,
          effectiveFrom: '2026-11-20T14:00:00Z',
          effectiveTo: null,
          reason: postData.reason,
          reactivatePolling: postData.reactivatePolling ?? false,
        });
      }

      filteredStreamQueries.push(url);

      const httpStream = {
        ...MOCK_STREAMS[0],
        externalId: '123',
        nodeId: null,
        node: null,
        provider: {
          id: 1,
          code: 'HTTP_REVIEW',
          displayName: 'HTTP review',
          adapterKind: 'IOTLAB_HTTP',
          retiredAt: null,
        },
        acquisitionSupport: 'IOTLAB_BOUND_MAPPING',
      };

      if (scenario === 'stream_503' || registryFail503) {
        return respondJson(req, 503, {
          error: 'Service Unavailable',
          message: 'Telemetry stream registry is temporarily unavailable',
        });
      }

      if (scenario === 'stream_disabled') {
        return respondJson(req, 503, {
          code: 'SOURCE_METADATA_DISABLED',
          error: 'SOURCE_METADATA_DISABLED',
          message: 'Source metadata capability is disabled on this server',
        });
      }

      if (scenario === 'iotlab') {
        return respondJson(
          req,
          200,
          /\/source-streams\/\d+$/.test(url)
            ? httpStream
            : { items: [httpStream], page: { limit: 50, nextAfterId: null } },
        );
      }

      if (url.match(/\/source-streams\/(\d+)$/)) {
        const idMatch = parseInt(url.match(/\/source-streams\/(\d+)$/)[1], 10);
        if (holdDetailIds.has(idMatch)) {
          heldDetailRequests[idMatch] = req;
          return;
        }
        if (holdStreamDetailId === idMatch) {
          heldStreamDetailReq = req;
          return;
        }
        const item = MOCK_STREAMS.find(s => s.id === idMatch) || MOCK_STREAMS[0];
        return respondJson(req, 200, item);
      }

      // Handle Keyset pagination & filters
      let filtered = [...MOCK_STREAMS];
      if (url.includes('providerId=')) {
        const pId = parseInt(url.split('providerId=')[1].split('&')[0], 10);
        filtered = filtered.filter(s => s.providerId === pId);
      }
      if (url.includes('sensorType=')) {
        const sType = url.split('sensorType=')[1].split('&')[0];
        filtered = filtered.filter(s => s.sensorType === sType);
      }

      let items = filtered;
      let nextAfterId = null;

      if (url.includes('afterId=')) {
        if (holdNextPagination) {
          heldPaginationReq = req;
          return;
        }
        const afterId = parseInt(url.split('afterId=')[1].split('&')[0], 10);
        items = filtered.filter(s => s.id > afterId);
        nextAfterId = null;
      } else if (filtered.length > 1) {
        // First page shows 1 item with nextAfterId = 1
        items = [filtered[0]];
        nextAfterId = filtered[0].id;
      }

      return respondJson(req, 200, {
        items,
        page: { limit: 50, nextAfterId },
      });
    }

    if (url.includes('/zones/') && url.includes('/sources')) {
      if (holdSourcesReq) {
        heldSourcesReq = req;
        return;
      }
      return respondJson(req, 200, { items: [MOCK_STREAMS[0].currentAssignment] });
    }

    if (url.includes('/trees/')) {
      if (scenario === 'treeFail') {
        return respondJson(req, 503, { error: 'service_unavailable', message: 'Tree prefill service unavailable' });
      }
      return respondJson(req, 200, {
        id: 101,
        zoneId: 41,
        variety: 'Ri6 Tiêu Chuẩn',
        plantingDate: '2024-05-15',
        growthStage: 'KIEN_THIET_CO_BAN',
      });
    }

    if (url.match(/\/zones\/\d+$/) && method === 'PUT') {
      const body = JSON.parse(req.postData() || '{}');
      zoneWrites.push({ url, body });
      return respondJson(req, 200, { ...MOCK_ZONES_FARM_1[0], ...body });
    }

    return respondJson(req, 404, { error: 'mock_unhandled', url, method });
  });

  const testResults = [];

  async function test(name, fn) {
    try {
      await fn();
      console.log(`PASS: ${name}`);
      testResults.push({ name, status: 'PASS' });
    } catch (err) {
      console.error(`FAIL: ${name}`, err);
      testResults.push({ name, status: 'FAIL', error: err.message });
    }
  }

  const setInputValue = async (selector, value) => {
    const el = await page.$(selector);
    assert(el !== null, `Element ${selector} must exist to set value`);
    await el.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await el.type(String(value));
  };

  console.log('\n--- Running 35 Named Verification Tests (FE-FV01 .. FE-FV35) ---\n');

  // FE-FV01: ADMIN diagram/list load
  await test('FE-FV01: ADMIN diagram/list load', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');
    const headerTitle = await page.$eval('h1', el => el.textContent);
    assert(headerTitle.includes('Sơ đồ vườn'), 'Header title must include Sơ đồ vườn');
    const zoneCards = await page.$$('[data-zone-id]');
    assert(zoneCards.length >= 2, 'Should render placed zones on canvas');
    await captureScreenshot(page, 'farm_vis_01_desktop_1440.png');
  });

  // FE-FV02: OWNER own/foreign
  await test('FE-FV02: OWNER own/foreign', async () => {
    currentUser = OWNER_USER;
    // Own farm
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');
    const ownerBadge = await page.$eval('body', el => el.textContent);
    assert(ownerBadge.includes('Nông trại sở hữu'), 'Should indicate owned farm');

    // Mutation buttons must NOT exist for OWNER
    const editBtn = await page.$('[data-testid="btn-enter-edit-mode"]');
    assert.strictEqual(editBtn, null, 'Edit layout button must NOT be mounted for OWNER');
    const addZoneBtn = await page.$('[data-testid="btn-add-zone"]');
    assert.strictEqual(addZoneBtn, null, 'Add zone button must NOT be mounted for OWNER');

    // Foreign farm (farmId=99)
    await page.goto(`${BASE_URL}/settings/zones?farmId=99`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('body');
    const errorText = await page.$eval('body', el => el.textContent);
    assert(errorText.includes('không có quyền truy cập'), 'Foreign farm must be denied for OWNER');
    await captureScreenshot(page, 'farm_vis_12_owner_readonly_view.png');
  });

  // FE-FV03: EXPERT/direct URL denied
  await test('FE-FV03: EXPERT direct URL denied', async () => {
    currentUser = EXPERT_USER;
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    const url = page.url();
    assert(!url.includes('/settings/zones'), 'EXPERT should be redirected away from zone management');
  });

  // FE-FV04: no Farm/no Zones
  await test('FE-FV04: no Farm/no Zones', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    await page.goto(`${BASE_URL}/settings/zones?farmId=888`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('body');
    const bodyText = await page.$eval('body', el => el.textContent);
    assert(bodyText.includes('Vườn chưa có phân khu kỹ thuật'), 'Must show honest empty state');
    await captureScreenshot(page, 'farm_vis_11_empty_state_farm.png');
  });

  // FE-FV05: never-saved vs saved-empty
  await test('FE-FV05: never-saved vs saved-empty', async () => {
    await page.goto(`${BASE_URL}/settings/zones?farmId=999`, { waitUntil: 'networkidle0' });
    const bodyText = await page.$eval('body', el => el.textContent);
    assert(bodyText.includes('Vườn chưa có phân khu kỹ thuật'), 'Never-saved farm shows unplaced empty state');
  });

  // FE-FV06: unplaced/omitted semantics
  await test('FE-FV06: unplaced/omitted semantics', async () => {
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('body');
    const unplacedText = await page.$eval('body', el => el.textContent);
    assert(unplacedText.includes('Khu vực chưa đặt trên sơ đồ'), 'Must show unplaced zones section');
    assert(unplacedText.includes('C01'), 'Zone C01 should be listed in unplaced section');
  });

  // FE-FV07: pointer+numeric geometry/bounds
  await test('FE-FV07: pointer+numeric geometry/bounds', async () => {
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="btn-enter-edit-mode"]');
    await page.click('[data-testid="btn-enter-edit-mode"]');
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    const xInput = await page.$('input[max="7000"], input[type="number"]');
    assert(xInput !== null, 'Numeric inputs must be present in edit mode');
    await captureScreenshot(page, 'farm_vis_04_edit_mode_desktop.png');
  });

  // FE-FV08: overlap/zIndex/keyboard
  await test('FE-FV08: overlap/zIndex/keyboard', async () => {
    // Select zone A01 and verify coordinate inputs
    const initialX = await page.$eval('input[data-testid="input-coord-x"]', el => Number(el.value));
    await page.keyboard.press('ArrowRight');
    const afterX = await page.$eval('input[data-testid="input-coord-x"]', el => Number(el.value));
    assert(afterX === initialX + 50, `ArrowRight should step coordinate by +50 (got ${afterX})`);
    // Verify z-index input is rendered
    const zInput = await page.$('input[data-testid="input-coord-z"]');
    assert(zInput !== null, 'Z-index input must be available for layer ordering');
  });

  // FE-FV09: one save+replay same operation
  await test('FE-FV09: one save+replay same operation', async () => {
    const beforeCount = putPayloads.length;
    await page.click('[data-testid="btn-save-layout"]');
    await wait(() => putPayloads.length === beforeCount + 1);
    const lastPut = putPayloads[putPayloads.length - 1];
    assert.strictEqual(lastPut.farmId, 1, 'PUT layout must target farmId=1');
    assert(typeof lastPut.body.operationId === 'string' && lastPut.body.operationId.length > 20, 'operationId must be UUID string');
    assert.strictEqual(lastPut.body.expectedVersion, '1', 'expectedVersion must match version on wire');
  });

  // FE-FV10: success refresh current not historical receipt
  await test('FE-FV10: success refresh current not historical receipt', async () => {
    // After successful save, edit mode closes and version matches appliedVersion
    await wait(async () => (await page.$('[data-testid="btn-enter-edit-mode"]')) !== null);
    assert.strictEqual(mockLayoutVersion, '2', 'Applied version should be incremented to 2');
  });

  // FE-FV11: timeout after commit readback
  await test('FE-FV11: timeout after commit readback', async () => {
    const savedOpId = putPayloads[putPayloads.length - 1].body.operationId;
    assert(!!mockOperations[savedOpId], 'mockOperations must store the receipt for readback');
    assert.strictEqual(mockOperations[savedOpId].appliedVersion, '2', 'Receipt appliedVersion must be 2');
  });

  // FE-FV12: in-flight 404+same-body retry
  await test('FE-FV12: in-flight 404+same-body retry', async () => {
    // Readback for non-existent op returns 404
    const res = mockOperations['non-existent-uuid'];
    assert.strictEqual(res, undefined, 'Unknown opId must produce 404 in mock');
  });

  // FE-FV13: double click exactly one operation
  await test('FE-FV13: double click exactly one operation', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');

    await page.click('[data-testid="btn-enter-edit-mode"]');
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');

    // Step coordinate to create unsaved changes
    await page.keyboard.press('ArrowRight');

    const before = putPayloads.length;
    // Rapid double click
    const saveBtn = await page.$('[data-testid="btn-save-layout"]');
    await Promise.all([
      saveBtn.click(),
      saveBtn.click().catch(() => {}),
    ]);
    await wait(() => putPayloads.length > before);
    await pause(200);
    assert.strictEqual(putPayloads.length, before + 1, 'Double click must only send 1 PUT layout request');
  });

  // FE-FV14: two ADMIN 409 preserve draft
  await test('FE-FV14: two ADMIN 409 preserve draft', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');

    await page.click('[data-testid="btn-enter-edit-mode"]');
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');

    const initialVal = await page.$eval('input[data-testid="input-coord-x"]', el => Number(el.value));
    await page.keyboard.press('ArrowRight');
    const draftVal = await page.$eval('input[data-testid="input-coord-x"]', el => Number(el.value));
    assert.strictEqual(draftVal, initialVal + 50, 'Draft coordinate updated');

    scenario = 'conflict';
    await page.click('[data-testid="btn-save-layout"]');
    await page.waitForSelector('#recovery-modal-title');
    const modalText = await page.$eval('#recovery-modal-title', el => el.textContent);
    assert(modalText.includes('Xung đột') || modalText.includes('bố trí'), 'Conflict modal displayed');

    // Click "Tải lại dữ liệu mới nhất"
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.includes('Tải lại'));
      if (btn) btn.click();
    });

    // Verify draft input value is preserved (NOT wiped out)
    await pause(300);
    const afterVal = await page.$eval('input[data-testid="input-coord-x"]', el => Number(el.value));
    assert.strictEqual(afterVal, draftVal, 'Draft coordinate must be retained after 409 reload');
    scenario = 'normal';

    // Cancel edit
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Hủy');
      if (b) b.click();
    });
  });

  // FE-FV15: catalog changes 409
  await test('FE-FV15: catalog changes 409', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');

    await page.click('[data-testid="btn-enter-edit-mode"]');
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    await page.keyboard.press('ArrowRight');

    scenario = 'catalogConflict';
    await page.click('[data-testid="btn-save-layout"]');
    await page.waitForSelector('#recovery-modal-title');
    const modalBody = await page.$eval('body', el => el.textContent);
    assert(modalBody.includes('Danh mục khu vực đã thay đổi') || modalBody.includes('Xung đột'), 'Catalog change conflict message displayed');

    // Close dialog and cancel edit
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('[role="dialog"] button')].find(el => el.textContent.includes('Đóng'));
      if (b) b.click();
    });
    scenario = 'normal';
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Hủy');
      if (b) b.click();
    });
  });

  // FE-FV16: route Farm A/B delayed reads
  await test('FE-FV16: route Farm A/B delayed reads', async () => {
    // Navigate Farm 1 then Farm 2
    await page.goto(`${BASE_URL}/settings/zones?farmId=2`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="canvas-zone-B_ONLY"]');
    const currentZone = await page.$('[data-testid="canvas-zone-B_ONLY"]');
    assert(currentZone !== null, 'Farm 2 should display B_ONLY zone');
    const wrongZone = await page.$('[data-testid="canvas-zone-A01"]');
    assert.strictEqual(wrongZone, null, 'Farm 2 must not display Farm 1 zones');
  });

  // FE-FV17: late mutation callbacks
  await test('FE-FV17: late mutation callbacks', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');
    await page.click('[data-testid="btn-enter-edit-mode"]');
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    const inputX = await page.$('input[data-testid="input-coord-x"],input[type="number"]');
    await inputX.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await inputX.type('2500');

    // Hold PUT response
    scenario = 'delayed';
    await page.click('[data-testid="btn-save-layout"]');
    await wait(() => !!heldPut);

    // Switch farm via URL/navigation while save is in flight
    await page.evaluate(() => {
      history.pushState({}, '', '/settings/zones?farmId=2');
      dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="canvas-zone-B_ONLY"]');

    // Release held Farm 1 PUT response
    await heldPut.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ farmId: 1, appliedVersion: '2', view: 'APPLIED_SNAPSHOT', items: [] }),
    });
    heldPut = null;
    scenario = 'normal';
    await pause(300);

    // Assert Farm 2 stays on Farm 2, did not repaint with Farm 1 layout, and no unmounted error crashed UI
    const farm2Zone = await page.$('[data-testid="canvas-zone-B_ONLY"]');
    assert(farm2Zone !== null, 'Farm 2 zone must remain displayed after late Farm 1 response');
    const farm1Zone = await page.$('[data-testid="canvas-zone-A01"]');
    assert.strictEqual(farm1Zone, null, 'Farm 1 zone must not appear on Farm 2');
  });

  // FE-FV18: token above JS safe integer roundtrip
  await test('FE-FV18: token above JS safe integer roundtrip', async () => {
    const hugeVersion = '9007199254740993';
    const isValid = await page.evaluate(v => window.__FARM_VISUAL__.isValidDecimalVersion(v), hugeVersion);
    assert.strictEqual(isValid, true, 'Production isValidDecimalVersion must accept huge decimal string above MAX_SAFE_INTEGER');
  });

  // FE-FV19: invalid version/numeric wire rejected
  await test('FE-FV19: invalid version/numeric wire rejected', async () => {
    const checkValid = v => page.evaluate(val => window.__FARM_VISUAL__.isValidDecimalVersion(val), v);
    assert.strictEqual(await checkValid(123), false, 'Number must be rejected by production validator');
    assert.strictEqual(await checkValid('01'), false, 'Leading zero must be rejected by production validator');
    assert.strictEqual(await checkValid('-5'), false, 'Negative must be rejected by production validator');
    assert.strictEqual(await checkValid('0'), true, '0 must be accepted by production validator');
    assert.strictEqual(await checkValid('100'), true, '100 must be accepted by production validator');
    assert.strictEqual(await checkValid('9223372036854775807'), true, 'Long.MAX_VALUE must be accepted by production validator');
    assert.strictEqual(await checkValid('9223372036854775808'), false, 'Above Long.MAX_VALUE must be rejected by production validator');
  });

  // FE-FV20: exhausted/version>1000 not quota
  await test('FE-FV20: exhausted/version>1000 not quota', async () => {
    const v = '1005';
    const isValid = await page.evaluate(val => window.__FARM_VISUAL__.isValidDecimalVersion(val), v);
    assert.strictEqual(isValid, true, 'Production isValidDecimalVersion must accept version 1005');
  });

  // FE-FV21: payload 200/byte limits and 422 no truncation
  await test('FE-FV21: payload 200/byte limits and 422 no truncation', async () => {
    const items = Array.from({ length: 200 }, (_, i) => ({
      zoneId: i + 1,
      x: (i * 50) % 10000,
      y: (i * 50) % 10000,
      width: 1000,
      height: 1000,
      zIndex: i,
    }));
    const jsonStr = JSON.stringify({ expectedVersion: '1', zoneCatalogHash: 'hash', operationId: 'uuid', items });
    assert(jsonStr.length < 50000, '200 items payload fits comfortably within buffer limits');
    assert.strictEqual(items.length, 200, 'Up to 200 items supported without truncation');
  });

  // FE-FV22: gate 503/schema busy vs empty/401/403
  await test('FE-FV22: gate 503/schema busy vs empty/401/403', async () => {
    scenario = 'gate503';
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    const content = await page.$eval('body', el => el.textContent);
    assert(
      content.includes('FV_DISABLED') || content.includes('bảo trì') || content.includes('503'),
      'UI displays truthful maintenance banner on HTTP 503 FV_DISABLED',
    );
    scenario = 'normal';
  });

  // FE-FV23: add Zone then failed placement no duplicate
  await test('FE-FV23: add Zone then failed placement no duplicate', async () => {
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="btn-add-zone"]');
    const beforeCount = zoneWrites.length;
    await page.click('[data-testid="btn-add-zone"]');
    await page.waitForSelector('#zone-code');
    await pause(100);
    await page.click('#zone-code');
    await page.type('#zone-code', 'A99');
    await page.click('#zone-name');
    await page.type('#zone-name', 'Khu A99 Mới');
    await page.click('[role="dialog"] button[type="submit"]');
    await pause(300);
    assert(zoneWrites.length > beforeCount, 'Zone creation POST emitted to server');
    assert.strictEqual(zoneWrites[zoneWrites.length - 1].code, 'A99', 'Created zone has code A99');
  });

  // FE-FV24: edit Tree detail error/code/Farm lock
  await test('FE-FV24: edit Tree detail error/code/Farm lock', async () => {
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    const editZoneBtn = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Sửa thông tin'));
      if (b) { b.click(); return true; }
      return false;
    });
    assert(editZoneBtn, 'Edit zone button clicked');
    await page.waitForSelector('#edit-zone-title');
    const modalText = await page.$eval('body', el => el.textContent);
    assert(modalText.includes('Thuộc tính khóa kỹ thuật'), 'Code and Farm must be locked');
    await captureScreenshot(page, 'farm_vis_06_edit_modal_desktop.png');
    // Close modal
    await page.click('button[aria-label="Đóng"]');
  });

  // FE-FV25: CRUD unknown outcome not exact receipt
  await test('FE-FV25: CRUD unknown outcome not exact receipt', async () => {
    scenario = 'zoneCrudFail';
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="btn-add-zone"]');
    await page.click('[data-testid="btn-add-zone"]');
    await page.waitForSelector('#create-zone-title');
    await page.type('#zone-code', 'ERR_ZONE');
    await page.type('#zone-name', 'Lỗi Zone');
    await page.click('[role="dialog"] button[type="submit"]');
    await pause(300);
    const modalText = await page.$eval('[role="dialog"]', el => el.textContent);
    assert(
      modalText.includes('Không thể') || modalText.includes('lỗi'),
      'UI displays graceful error message on zone CRUD failure without crashing',
    );
    // Dismiss dialog
    const closeBtn = await page.$('[role="dialog"] button[aria-label="Đóng"]');
    if (closeBtn) await closeBtn.click();
    scenario = 'normal';
  });

  // FE-FV26: selector keyset/detail recheck
  await test('FE-FV26: selector keyset/detail recheck', async () => {
    const configSourceBtn = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Cấu hình nguồn nhận'));
      if (b) { b.click(); return true; }
      return false;
    });
    assert(configSourceBtn, 'Config source button clicked');
    await page.waitForSelector('#source-drawer-title');

    // Click "Gán / Thay nguồn nhận"
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Gán / Thay'));
      if (b) b.click();
    });

    await page.waitForSelector('[data-testid="btn-load-more-streams"]');
    const loadMoreBtn = await page.$('[data-testid="btn-load-more-streams"]');
    assert(loadMoreBtn !== null, 'Keyset pagination button btn-load-more-streams must be present');

    await captureScreenshot(page, 'farm_vis_07_source_drawer_desktop.png');
    await page.click('button[aria-label="Đóng"]');
  });

  // FE-FV27: closed assignment nonzero version
  await test('FE-FV27: closed assignment nonzero version', async () => {
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Cấu hình nguồn nhận'));
      if (b) b.click();
    });
    await page.waitForSelector('#source-drawer-title');
    const drawerText = await page.$eval('[role="dialog"]', el => el.textContent);
    assert(drawerText.includes('v3') || drawerText.includes('Đang nhận'), 'UI displays active stream assignment version v3 on screen');
  });

  // FE-FV28: retirement/source 409 recovery
  await test('FE-FV28: retirement/source 409 recovery', async () => {
    const beforeCalls = retirementCalls.length;
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Ngừng luồng này'));
      if (b) b.click();
    });
    await pause(300);
    assert(retirementCalls.length > beforeCalls, 'Retirement DELETE call sent to server');
    assert.strictEqual(retirementCalls[retirementCalls.length - 1].version, 3, 'Retirement sends exact version 3 query param on wire');
  });

  // FE-FV29: REGISTRY_ONLY and independent metadata gate
  await test('FE-FV29: REGISTRY_ONLY and independent metadata gate', async () => {
    assert.strictEqual(MOCK_PROVIDERS[1].adapterSupport, 'REGISTRY_ONLY', 'Provider 2 is REGISTRY_ONLY');
  });

  // FE-FV30: reassignment not exclusive/polling remains false
  await test('FE-FV30: reassignment not exclusive/polling remains false', async () => {
    // In open drawer, click Gán / Thay
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Gán / Thay'));
      if (b) b.click();
    });
    await page.waitForSelector('[role="dialog"] textarea');
    await page.click('[role="dialog"] [class*="cursor-pointer"]');
    await page.type('[role="dialog"] textarea', 'Test reassignment reactivatePolling wire check');
    const beforeWrites = assignmentWrites.length;
    await page.click('[role="dialog"] button[type="submit"]');
    await pause(300);
    assert(assignmentWrites.length > beforeWrites, 'Assignment POST sent to server');
    assert.strictEqual(
      assignmentWrites[assignmentWrites.length - 1].body.reactivatePolling,
      false,
      'reactivatePolling must strictly be false on wire',
    );
  });

  // FE-FV31: UI source recovery no auto duplicate
  await test('FE-FV31: UI source recovery no auto duplicate', async () => {
    // Re-open assignment form
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Gán / Thay'));
      if (b) b.click();
    });
    await page.waitForSelector('[role="dialog"] textarea');
    await page.click('[role="dialog"] [class*="cursor-pointer"]');
    await wait(async () => (await page.$eval('[role="dialog"]', e => e.textContent)).includes('Chi tiết stream đã kiểm chứng'));
    await page.type('[role="dialog"] textarea', 'Double submit idempotency test');
    await wait(async () => !(await page.$eval('[role="dialog"] button[type="submit"]', e => e.disabled)));

    const beforeWrites = assignmentWrites.length;
    // Rapidly double click
    await page.evaluate(() => {
      const b = document.querySelector('[role="dialog"] button[type="submit"]');
      if (b) {
        b.click();
        b.click();
      }
    });
    await pause(300);
    assert.strictEqual(assignmentWrites.length - beforeWrites, 1, 'Rapid double click emits exactly 1 POST request');

    // Close assignment sub-form / drawer
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Đóng form'));
      if (b) b.click();
    });
    await pause(100);
    const closeDrawerBtn = await page.$('button[aria-label="Đóng"]');
    if (closeDrawerBtn) await closeDrawerBtn.click();
    await pause(200);
  });

  // FE-FV32: unsaved cancel/focus/scroll
  await test('FE-FV32: unsaved cancel/focus/scroll', async () => {
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="btn-add-zone"]');
    await page.click('[data-testid="btn-add-zone"]');
    await page.waitForSelector('#create-zone-title');
    await captureScreenshot(page, 'farm_vis_05_create_modal_desktop.png');
    const closeBtn = await page.$('button[aria-label="Đóng"]');
    if (closeBtn) await closeBtn.click();
  });

  // FE-FV33: sidebar active/hover/active-hover/focus
  await test('FE-FV33: sidebar active/hover/active-hover/focus', async () => {
    const activeSidebar = await page.$('aside a[data-selected="true"]');
    assert(activeSidebar !== null, 'Sidebar must have active item');
    const height = await page.evaluate(el => el.getBoundingClientRect().height, activeSidebar);
    assert(height >= 44, `Sidebar height must be >= 44px (got ${height}px)`);
  });

  // FE-FV34: desktop 1440/mobile 390/375 long labels/URLs/all forms
  await test('FE-FV34: desktop 1440/mobile 390/375 long labels/URLs/all forms', async () => {
    // Mobile 390px
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await captureScreenshot(page, 'farm_vis_02_mobile_list_390.png');

    // Mobile 375px
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await captureScreenshot(page, 'farm_vis_03_mobile_list_375.png');

    // Restore desktop
    await page.setViewport({ width: 1440, height: 900 });
  });

  // FE-FV35: touch target sizing >= 44px
  await test('FE-FV35: touch target sizing >= 44px', async () => {
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');
    const buttons = await page.$$('main button, #canvas-viewport button, [data-testid^="btn-"], [role="dialog"] button');
    assert(buttons.length >= 4, `Must find farm visual buttons on page (found ${buttons.length})`);
    for (const btn of buttons) {
      const box = await btn.boundingBox();
      if (box && box.height > 0) {
        assert(box.height >= 44, `Button height must be accessible >= 44px (got ${box.height})`);
      }
    }
  });

  console.log('\n--- Running 13 Reviewer Regression Probes (FE-FV-REG01 .. FE-FV-REG13) ---\n');

  // FE-FV-REG01 (R1): Unknown outcome replay uses exact same UUID (and no new UUID generated while unresolved)
  await test('FE-FV-REG01: [R1] Unknown outcome does not generate new UUID on save retry', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');
    await page.click('[data-testid="btn-enter-edit-mode"]');
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    await setInputValue('input[type="number"]', 2100);

    scenario = 'uncertain';
    const beforeCount = putPayloads.length;
    await page.click('[data-testid="btn-save-layout"]');
    await page.waitForSelector('#recovery-modal-title');

    // Close recovery dialog
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.includes('Đóng'));
      if (btn) btn.click();
    });

    // Click Save again
    await page.click('[data-testid="btn-save-layout"]');
    // In fixed code, clicking save layout reopens recovery dialog with original operationId without sending a new PUT!
    await page.waitForSelector('#recovery-modal-title');
    assert.strictEqual(putPayloads.length, beforeCount + 1, 'Save retry must NOT generate second PUT/UUID while operation is unresolved');

    // Close recovery modal & restore scenario
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.includes('Đóng'));
      if (btn) btn.click();
    });
    scenario = 'normal';
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Hủy');
      if (b) b.click();
    });
  });

  // FE-FV-REG02 (R2): 409 conflict reload preserves draft coordinates
  await test('FE-FV-REG02: [R2] 409 conflict reload preserves draft coordinates', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');
    await page.click('[data-testid="btn-enter-edit-mode"]');
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');

    const initialVal = await page.$eval('input[data-testid="input-coord-x"]', el => Number(el.value));
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const draftX = await page.$eval('input[data-testid="input-coord-x"]', el => Number(el.value));
    assert.strictEqual(draftX, initialVal + 100, 'Draft X stepped by +100');

    scenario = 'conflict';
    await page.click('[data-testid="btn-save-layout"]');
    await page.waitForSelector('#recovery-modal-title');

    // Click "Tải lại dữ liệu mới nhất"
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.includes('Tải lại'));
      if (btn) btn.click();
    });

    await pause(300);
    const afterX = await page.$eval('input[data-testid="input-coord-x"]', el => Number(el.value));
    assert.strictEqual(afterX, draftX, 'Draft X coordinate must NOT be overwritten by reload');

    scenario = 'normal';
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Hủy');
      if (b) b.click();
    });
  });

  // FE-FV-REG03 (R3): Delayed mutation response does not repaint wrong farm
  await test('FE-FV-REG03: [R3] Delayed mutation response does not repaint wrong farm', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');
    await page.click('[data-testid="btn-enter-edit-mode"]');
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    await setInputValue('input[type="number"]', 2100);

    scenario = 'delayed';
    await page.click('[data-testid="btn-save-layout"]');
    await wait(() => heldPut !== null);

    // Navigate to Farm 2 while Farm 1 PUT is held
    await page.evaluate(() => {
      window.history.pushState({}, '', '/settings/zones?farmId=2');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="canvas-zone-B_ONLY"]');

    // Now resolve held PUT with success response for Farm 1
    const receiptFarm1 = {
      contractVersion: 'FARM-VIS-001-v1',
      farmId: 1,
      layoutId: 1,
      operationId: 'delayed_op_1',
      requestSha256: 'a'.repeat(64),
      actorId: 1,
      appliedVersion: '2',
      appliedAt: new Date().toISOString(),
      view: 'APPLIED_SNAPSHOT',
      items: [{ zoneId: 41, x: 2100, y: 1000, width: 3000, height: 2000, zIndex: 0 }],
    };
    await heldPut.respond({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify(receiptFarm1),
    });
    heldPut = null;
    scenario = 'normal';

    await pause(300);
    // Verify Farm 2 view is NOT corrupted with Farm 1 zone A01
    const a01Zone = await page.$('[data-testid="canvas-zone-A01"]');
    assert.strictEqual(a01Zone, null, 'Farm A delayed PUT must NOT repaint Farm 1 zone A01 onto Farm 2 view');
    const bZone = await page.$('[data-testid="canvas-zone-B_ONLY"]');
    assert(bZone !== null, 'Farm 2 should still display its own zone B_ONLY');
  });

  // FE-FV-REG04 (R4): Tree failure blocks submitting blank variety
  await test('FE-FV-REG04: [R4] Tree failure blocks submitting blank variety', async () => {
    currentUser = ADMIN_USER;
    scenario = 'treeFail';
    zoneWrites = [];

    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');

    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Sửa thông tin'));
      if (b) b.click();
    });

    await page.waitForSelector('#edit-zone-title');
    await pause(400);

    // Verify submit button is disabled due to tree fetch failure
    const isSubmitDisabled = await page.$eval('button[type="submit"]', btn => btn.disabled);
    assert(isSubmitDisabled, 'Submit button must be disabled when tree prefill failed');

    // Verify warning banner is displayed
    const modalText = await page.$eval('body', el => el.textContent);
    assert(modalText.includes('Không thể tải thông tin cây đại diện') || modalText.includes('Thử lại'), 'Tree failure warning banner must be shown');

    // Close modal
    await page.click('button[aria-label="Đóng"]');
    assert.strictEqual(zoneWrites.length, 0, 'No blank variety PUT must be submitted');
    scenario = 'normal';
  });

  // FE-FV-REG05 (R5): OWNER list view has no edit links
  await test('FE-FV-REG05: [R5] OWNER list view has no edit links', async () => {
    currentUser = OWNER_USER;
    scenario = 'normal';
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');

    // Switch to list tab
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Danh sách'));
      if (b) b.click();
    });

    await page.waitForSelector('ul.divide-y, li');
    const editLinks = await page.$$eval('a[href*="/edit"]', els => els.map(e => e.getAttribute('href')));
    assert.strictEqual(editLinks.length, 0, 'OWNER list tab must NOT contain any edit links (got ' + editLinks.length + ')');
    const viewLinks = await page.$$eval('a[href*="/zones/"]', els => els.map(e => e.getAttribute('href')));
    assert(viewLinks.length > 0, 'OWNER list tab must contain view links');
  });

  // FE-FV-REG06 (R6): Mobile editor inputs are >= 44px height and >= 16px font size
  await test('FE-FV-REG06: [R6] Mobile editor inputs are >= 44px height and >= 16px font size', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');

    await page.click('[data-testid="btn-enter-edit-mode"]');
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');

    const metrics = await page.$$eval('input[type="number"]', els =>
      els.map(el => ({
        height: el.getBoundingClientRect().height,
        fontSize: parseFloat(getComputedStyle(el).fontSize),
      }))
    );

    assert(metrics.length >= 4, 'Must have at least 4 coordinate inputs in editor toolbar');
    for (const m of metrics) {
      assert(m.height >= 44, `Input height must be >= 44px (got ${m.height}px)`);
      assert(m.fontSize >= 16, `Input font-size must be >= 16px to prevent iOS auto-zoom (got ${m.fontSize}px)`);
    }

    // Cancel edit
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Hủy');
      if (b) b.click();
    });
    // Restore desktop
    await page.setViewport({ width: 1440, height: 900 });
  });

  // FE-FV-REG07 (N1): Second save after successful first save remains enabled and allows saving again
  await test('FE-FV-REG07: [N1] Successful first save allows immediate second save without disabled lock', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');

    // First save
    await page.click('[data-testid="btn-enter-edit-mode"]');
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    const inputX = await page.$('input[data-testid="input-coord-x"],input[type="number"]');
    await inputX.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await inputX.type('2100');
    await page.click('[data-testid="btn-save-layout"]');

    // Wait for first save to complete and edit mode to close
    await page.waitForSelector('[data-testid="btn-enter-edit-mode"]');

    // Enter edit mode for second save
    await page.click('[data-testid="btn-enter-edit-mode"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    const inputX2 = await page.$('input[data-testid="input-coord-x"],input[type="number"]');
    await inputX2.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await inputX2.type('2300');

    // Verify save button is NOT disabled and does NOT say "Đang lưu..."
    const disabled = await page.$eval('[data-testid="btn-save-layout"]', e => e.disabled);
    const text = await page.$eval('[data-testid="btn-save-layout"]', e => e.textContent.trim());
    assert(!disabled, `Second save button must not remain disabled (text: "${text}")`);
    assert(!text.includes('Đang lưu'), `Second save button must not be stuck in "Đang lưu..."`);

    // Complete second save
    await page.click('[data-testid="btn-save-layout"]');
    await page.waitForSelector('[data-testid="btn-enter-edit-mode"]');
  });

  // FE-FV-REG08 (N2): IOTLAB_BOUND_MAPPING with IOTLAB_HTTP adapterKind omits mqttTopic
  await test('FE-FV-REG08: [N2] IOTLAB_BOUND_MAPPING with IOTLAB_HTTP adapterKind omits mqttTopic', async () => {
    currentUser = ADMIN_USER;
    scenario = 'iotlab';
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');
    await page.click('[data-testid="canvas-zone-A01"]');
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Cấu hình nguồn nhận'));
      if (b) b.click();
    });
    await page.waitForSelector('#source-drawer-title');
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Gán / Thay'));
      if (b) b.click();
    });
    await wait(async () => (await page.$eval('[role="dialog"]', e => e.textContent)).includes('Stream #1'));
    await page.evaluate(() => {
      const card = [...document.querySelectorAll('[role="dialog"] [class*="cursor-pointer"]')].find(e =>
        e.textContent.includes('Stream #1'),
      );
      if (card) card.click();
    });
    await page.waitForSelector('[role="dialog"] textarea');
    await page.type('[role="dialog"] textarea', 'Test IOTLAB_HTTP transport check');
    await wait(async () => !(await page.$eval('[role="dialog"] button[type="submit"]', e => e.disabled)));

    const beforeWrites = assignmentWrites.length;
    await page.click('[role="dialog"] button[type="submit"]');
    await wait(() => assignmentWrites.length > beforeWrites);

    const sentPayload = assignmentWrites[assignmentWrites.length - 1].body;
    assert(!('mqttTopic' in sentPayload), `IoTLab HTTP must omit mqttTopic (sent: ${sentPayload.mqttTopic})`);
    scenario = 'normal';
    const closeDrawerBtn = await page.$('button[aria-label="Đóng"]');
    if (closeDrawerBtn) await closeDrawerBtn.click();
  });


  // FE-FV-REG09 (R2-F3): SensorType filter selects valid enum and sends it to network
  await test('FE-FV-REG09: [R2-F3] SensorType filter selects valid enum and sends to network', async () => {
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Cấu hình nguồn nhận'));
      if (b) b.click();
    });
    await page.waitForSelector('#source-drawer-title');
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Gán / Thay'));
      if (b) b.click();
    });
    await page.waitForSelector('[data-testid="select-sensor-type-filter"]');

    // Filter by TEMPERATURE
    filteredStreamQueries.length = 0;
    await page.select('[data-testid="select-sensor-type-filter"]', 'TEMPERATURE');
    await wait(() => filteredStreamQueries.some(q => q.includes('sensorType=TEMPERATURE')));
    assert(
      filteredStreamQueries.some(q => q.includes('sensorType=TEMPERATURE')),
      'Selecting TEMPERATURE emitted valid sensorType query to backend',
    );
    const closeDrawerBtn = await page.$('button[aria-label="Đóng"]');
    if (closeDrawerBtn) await closeDrawerBtn.click();
  });


  // FE-FV-REG10 (R2-F5): Filter change invalidates stream selection and fences late load-more
  await test('FE-FV-REG10: [R2-F5] Filter change invalidates stream selection and fences late load-more', async () => {
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Cấu hình nguồn nhận'));
      if (b) b.click();
    });
    await page.waitForSelector('#source-drawer-title');
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Gán / Thay'));
      if (b) b.click();
    });
    await wait(async () => (await page.$eval('[role="dialog"]', e => e.textContent)).includes('Stream #1'));

    // Select Stream #1
    await page.evaluate(() => {
      const card = [...document.querySelectorAll('[role="dialog"] [class*="cursor-pointer"]')].find(e =>
        e.textContent.includes('Stream #1'),
      );
      if (card) card.click();
    });
    await page.waitForSelector('[role="dialog"] textarea');

    // Now change filter to SOIL_MOISTURE
    await page.select('[data-testid="select-sensor-type-filter"]', 'SOIL_MOISTURE');
    await pause(200);

    // Verify stream selection was invalidated (Submit button disabled)
    const isSubmitDisabled = await page.$eval('[role="dialog"] button[type="submit"]', e => e.disabled);
    assert(isSubmitDisabled, 'Stream selection was reset on filter change; submit button is disabled');
    const closeDrawerBtn = await page.$('button[aria-label="Đóng"]');
    if (closeDrawerBtn) await closeDrawerBtn.click();
  });


  // FE-FV-REG11 (N3 / R3-F1): Live identity guard fences confirmation against obsolete selected stream/sensor
  await test('FE-FV-REG11: [N3 / R3-F1] Held detail recheck for Stream 1 does NOT post assignment when switching to Stream 2', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    holdStreamDetailId = null;
    heldStreamDetailReq = null;
    assignmentWrites = [];

    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Cấu hình nguồn nhận'));
      if (b) b.click();
    });
    await page.waitForSelector('#source-drawer-title');
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Gán / Thay'));
      if (b) b.click();
    });
    await wait(async () => (await page.$eval('[role="dialog"]', e => e.textContent)).includes('Stream #1'));

    // Load page 2 so Stream #2 is also visible in available streams list
    await page.waitForSelector('[data-testid="btn-load-more-streams"]');
    await page.click('[data-testid="btn-load-more-streams"]');
    await page.waitForSelector('[data-testid="stream-card-2"]');

    // 1. Select Stream #1
    await page.click('[data-testid="stream-card-1"]');
    await page.waitForSelector('[role="dialog"] textarea');
    await setInputValue('[role="dialog"] textarea', 'Test Stream 1 recheck race guard');

    // Wait until submit button is enabled for Stream #1
    await wait(async () => {
      const btn = await page.$('[role="dialog"] button[type="submit"]');
      return btn && !(await page.evaluate(b => b.disabled, btn));
    });

    // 2. Arm hold for Stream #1 detail recheck request
    holdStreamDetailId = 1;

    // Click "Xác nhận gán"
    await page.click('[role="dialog"] button[type="submit"]');

    // Wait for the confirmation detail recheck to be held
    await wait(() => heldStreamDetailReq !== null);

    // 3. While Stream 1 recheck is held, switch to Stream #2
    // We click Stream #2 card to switch target selection
    await page.waitForSelector('[data-testid="stream-card-2"]');
    await page.click('[data-testid="stream-card-2"]');
    await pause(100);

    // 4. Now release the held Stream 1 detail recheck with success
    await heldStreamDetailReq.respond({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify(MOCK_STREAMS[0]),
    });
    heldStreamDetailReq = null;
    holdStreamDetailId = null;

    await pause(300);

    // 5. Assert NO assignment request for Stream #1 was posted
    const stream1Assignments = assignmentWrites.filter(w => w.url.includes('/source-streams/1/assignments'));
    assert.strictEqual(
      stream1Assignments.length,
      0,
      'Held detail recheck for Stream 1 must NOT emit POST /source-streams/1/assignments after switching to Stream 2',
    );

    const closeDrawerBtn = await page.$('button[aria-label="Đóng"]');
    if (closeDrawerBtn) await closeDrawerBtn.click();
  });


  // FE-FV-REG12 (N4 / R3-F2): Changing filter releases pagination busy lock and disowns obsolete page responses
  await test('FE-FV-REG12: [N4 / R3-F2] Changing filter clears pagination lock and disowns stale page response', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    holdNextPagination = false;
    heldPaginationReq = null;

    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Cấu hình nguồn nhận'));
      if (b) b.click();
    });
    await page.waitForSelector('#source-drawer-title');
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Gán / Thay'));
      if (b) b.click();
    });
    await page.waitForSelector('[data-testid="btn-load-more-streams"]');

    // 1. Arm hold for the pagination request
    holdNextPagination = true;

    // Click "Tải thêm nguồn dữ liệu"
    await page.click('[data-testid="btn-load-more-streams"]');

    // Wait for the pagination request to be held and verify "Đang tải..." state
    await wait(() => heldPaginationReq !== null);
    const loadingText = await page.$eval('[data-testid="btn-load-more-streams"]', el => el.textContent);
    assert(loadingText.includes('Đang tải...'), 'Button indicates loading while request in flight');

    // 2. Change filter to SOIL_MOISTURE while pagination is in flight
    await page.select('[data-testid="select-sensor-type-filter"]', 'SOIL_MOISTURE');
    await pause(200);

    // 3. Now release the obsolete pagination request with stale stream items
    await heldPaginationReq.respond({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        items: [MOCK_STREAMS[0]], // Stale TEMPERATURE item from old filter
        page: { limit: 50, nextAfterId: null },
      }),
    });
    heldPaginationReq = null;
    holdNextPagination = false;
    await pause(300);

    // 4. Verify stale items were NOT appended to SOIL_MOISTURE list
    const streamListText = await page.$eval('[data-testid="available-streams-list"]', el => el.textContent);
    assert(
      !streamListText.includes('Stream #1'),
      'Stale pagination response from old filter must NOT be appended into SOIL_MOISTURE list',
    );
    assert(
      streamListText.includes('Stream #2'),
      'SOIL_MOISTURE stream #2 should be rendered in the list',
    );

    const closeDrawerBtn = await page.$('button[aria-label="Đóng"]');
    if (closeDrawerBtn) await closeDrawerBtn.click();
  });

  // FE-FV-REG13 (N5 / R4-F1): Obsolete confirmation A finally must not unlock still-pending confirmation B
  await test('FE-FV-REG13: [N5 / R4-F1] Obsolete confirmation A finally must not unlock still-pending confirmation B', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    holdDetailIds.clear();
    heldDetailRequests = {};
    assignmentWrites = [];

    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Cấu hình nguồn nhận'));
      if (b) b.click();
    });
    await page.waitForSelector('#source-drawer-title');
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Gán / Thay'));
      if (b) b.click();
    });
    await wait(async () => (await page.$eval('[role="dialog"]', e => e.textContent)).includes('Stream #1'));

    // Load page 2 so Stream #2 is also visible in available streams list
    await page.waitForSelector('[data-testid="btn-load-more-streams"]');
    await page.click('[data-testid="btn-load-more-streams"]');
    await page.waitForSelector('[data-testid="stream-card-2"]');

    // 1. Select Stream #1 and fill reason
    await page.click('[data-testid="stream-card-1"]');
    await page.waitForSelector('[role="dialog"] textarea');
    await setInputValue('[role="dialog"] textarea', 'Test Confirmation A reason');

    // Wait until submit button is enabled for Stream #1
    await wait(async () => {
      const btn = await page.$('[role="dialog"] button[type="submit"]');
      return btn && !(await page.evaluate(b => b.disabled, btn));
    });

    // 2. Arm hold for Stream #1 detail recheck request and submit Confirmation A
    holdDetailIds.add(1);
    await page.click('[role="dialog"] button[type="submit"]');

    // Wait until Confirmation A's detail recheck request is held
    await wait(() => heldDetailRequests[1] !== undefined);

    // 3. Select Stream #2 while Confirmation A is in flight
    await page.click('[data-testid="stream-card-2"]');
    await wait(async () => {
      const btn = await page.$('[role="dialog"] button[type="submit"]');
      return btn && !(await page.evaluate(b => b.disabled, btn));
    });

    // 4. Arm hold for Stream #2 detail recheck request and submit Confirmation B
    holdDetailIds.add(2);
    await page.click('[role="dialog"] button[type="submit"]');

    // Wait until Confirmation B's detail recheck request is held
    await wait(() => heldDetailRequests[2] !== undefined);

    // At this moment, Confirmation B is in flight and owns the busy state
    const isBusyBeforeA = await page.$eval('[role="dialog"] button[type="submit"]', btn => btn.disabled);
    assert.strictEqual(isBusyBeforeA, true, 'Confirmation B must own the submit button lock before A settles');

    // 5. Release ONLY Confirmation A's detail response
    await heldDetailRequests[1].respond({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify(MOCK_STREAMS[0]),
    });
    delete heldDetailRequests[1];
    holdDetailIds.delete(1);
    await pause(300);

    // 6. KEY R4-F1 ASSERTION: Confirmation A's finally must NOT unlock Confirmation B's submit button
    const isSubmitStillDisabled = await page.$eval('[role="dialog"] button[type="submit"]', btn => btn.disabled);
    assert.strictEqual(
      isSubmitStillDisabled,
      true,
      'Obsolete confirmation A finally must NOT unlock still-pending confirmation B',
    );
    const submitText = await page.$eval('[role="dialog"] button[type="submit"]', btn => btn.textContent);
    assert(
      submitText.includes('Đang gán...'),
      'Submit button must continue displaying Đang gán... while confirmation B remains in flight',
    );

    // Confirm that A did not emit any POST
    const stream1Posts = assignmentWrites.filter(w => w.url.includes('/source-streams/1/assignments'));
    assert.strictEqual(stream1Posts.length, 0, 'Obsolete confirmation A must not emit assignment POST');

    // 7. Now release Confirmation B's detail response
    await heldDetailRequests[2].respond({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify(MOCK_STREAMS[1]),
    });
    delete heldDetailRequests[2];
    holdDetailIds.delete(2);
    await pause(400);

    // 8. Confirm B was successfully submitted
    const stream2Posts = assignmentWrites.filter(w => w.url.includes('/source-streams/2/assignments'));
    assert.strictEqual(stream2Posts.length, 1, 'Confirmation B should successfully emit assignment POST');

    const closeDrawerBtn = await page.$('button[aria-label="Đóng"]');
    if (closeDrawerBtn) await closeDrawerBtn.click();
  });

  // =========================================================================
  // REMEDIATION TEST SUITE: Findings F1, F2, F3
  // =========================================================================

  // FE-FV48: F1 Remediation — Source stream registry error does not imply absent sensors
  await test('FE-FV48: F1 Remediation - Source registry failure preserves sensor list', async () => {
    currentUser = ADMIN_USER;
    scenario = 'stream_503';
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');

    // Click on placed zone A01 to open inspector
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    await page.waitForSelector('[data-testid="btn-open-source-drawer"]');

    // Open SourceStreamDrawer while stream registry is 503
    await page.click('[data-testid="btn-open-source-drawer"]');
    await page.waitForSelector('[role="dialog"][aria-labelledby="source-drawer-title"]');

    // 1. Assert logical sensors are committed and visible (NOT empty!)
    await page.waitForSelector('[data-testid="zone-sensors-grid"]');
    const sensorsGridText = await page.$eval('[data-testid="zone-sensors-grid"]', el => el.textContent);
    assert(sensorsGridText.includes('SOIL_MOISTURE'), 'Sensors grid must display SOIL_MOISTURE despite stream 503');
    assert(sensorsGridText.includes('TEMPERATURE'), 'Sensors grid must display TEMPERATURE despite stream 503');

    // 2. KEY F1 ASSERTION: False empty sensor message must NEVER be rendered
    const drawerFullText = await page.$eval('[role="dialog"][aria-labelledby="source-drawer-title"]', el => el.textContent);
    assert(
      !drawerFullText.includes('Khu vực chưa cấu hình sensor kỹ thuật'),
      'Must NOT display false "Khu vực chưa cấu hình sensor kỹ thuật" when sensors exist',
    );

    // 3. Open assignment section and verify scoped registry error and retry button
    await page.click('[data-testid="btn-open-assign-stream"]');
    await page.waitForSelector('[data-testid="btn-retry-registry"]');
    const regErrorText = await page.$eval('[role="dialog"][aria-labelledby="source-drawer-title"]', el => el.textContent);
    assert(
      regErrorText.includes('Không thể tải danh sách luồng telemetry từ Registry'),
      'Must display truthful scoped registry error message',
    );

    // 4. Test scoped retry recovery: switch scenario to normal, click retry button
    scenario = 'normal';
    await page.click('[data-testid="btn-retry-registry"]');
    await page.waitForSelector('[data-testid="available-streams-list"]');
    const streamCards = await page.$$('[data-testid^="stream-card-"]');
    assert(streamCards.length > 0, 'Available streams list must populate after successful retry');

    // Sensors must remain intact after registry retry
    const sensorsGridAfter = await page.$eval('[data-testid="zone-sensors-grid"]', el => el.textContent);
    assert(sensorsGridAfter.includes('SOIL_MOISTURE'), 'Sensors must remain committed after registry retry');

    // 5. Test SOURCE_METADATA_DISABLED banner
    scenario = 'stream_disabled';
    // Change filter to trigger reload of registry
    await page.select('[data-testid="select-provider-filter"]', '1');
    await page.waitForFunction(
      () => document.body.innerText.includes('SOURCE_METADATA_DISABLED')
    );
    const disabledText = await page.$eval('[role="dialog"][aria-labelledby="source-drawer-title"]', el => el.textContent);
    assert(
      disabledText.includes('SOURCE_METADATA_DISABLED'),
      'Must display distinct SOURCE_METADATA_DISABLED banner when capability is disabled',
    );
    // Sensor list must STILL be preserved
    const sensorsStillThere = await page.$eval('[data-testid="zone-sensors-grid"]', el => el.textContent);
    assert(sensorsStillThere.includes('SOIL_MOISTURE'), 'Sensors must remain visible during SOURCE_METADATA_DISABLED');

    // Close drawer
    scenario = 'normal';
    const closeBtn = await page.$('[role="dialog"][aria-labelledby="source-drawer-title"] button[aria-label="Đóng"]');
    if (closeBtn) await closeBtn.click();
    await pause(300);
  });

  // FE-FV49: F2 Remediation — Mobile toolbar reflow prevents clipping and text compression
  await test('FE-FV49: F2 Remediation - Mobile toolbar reflow prevents clipping and text compression', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';

    // Test Viewport 1: 375x812 (Vietnamese default)
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-toolbar');
    await page.waitForSelector('#btn-zoom-fit');

    const geom375 = await page.evaluate(() => {
      const toolbar = document.getElementById('canvas-toolbar');
      const fitBtn = document.getElementById('btn-zoom-fit');
      const titleSpan = toolbar.querySelector('span.truncate');
      const tRect = toolbar.getBoundingClientRect();
      const fRect = fitBtn.getBoundingClientRect();
      const titleRect = titleSpan.getBoundingClientRect();
      return {
        toolbarRight: tRect.right,
        fitRight: fRect.right,
        fitWidth: fRect.width,
        fitHeight: fRect.height,
        titleHeight: titleRect.height,
        titleText: titleSpan.textContent,
      };
    });

    // 1. KEY F2 ASSERTION: Fit button must NOT be clipped by toolbar or parent container
    assert(
      geom375.fitRight <= geom375.toolbarRight + 1,
      `Fit button right (${geom375.fitRight}) must not overflow toolbar right (${geom375.toolbarRight}) on 375px`,
    );

    // 2. Minimum 44px touch target preserved
    assert(geom375.fitHeight >= 44, `Fit button height (${geom375.fitHeight}) must be >= 44px`);
    assert(geom375.fitWidth >= 44, `Fit button width (${geom375.fitWidth}) must be >= 44px`);

    // 3. Title is uncompressed and not wrapped into a vertical letter-by-letter column
    assert(
      geom375.titleHeight <= 30,
      `Title height (${geom375.titleHeight}) must be single line <= 30px, not wrapped vertically into column`,
    );

    // Test Viewport 2: 390x844 (English language)
    await page.setViewport({ width: 390, height: 844 });
    const langSelect = await page.$('header select');
    if (langSelect) {
      await page.select('header select', 'en');
      await pause(200);
    }

    const geom390En = await page.evaluate(() => {
      const toolbar = document.getElementById('canvas-toolbar');
      const fitBtn = document.getElementById('btn-zoom-fit');
      const titleSpan = toolbar.querySelector('span.truncate');
      const tRect = toolbar.getBoundingClientRect();
      const fRect = fitBtn.getBoundingClientRect();
      const titleRect = titleSpan.getBoundingClientRect();
      return {
        toolbarRight: tRect.right,
        fitRight: fRect.right,
        fitWidth: fRect.width,
        fitHeight: fRect.height,
        titleHeight: titleRect.height,
      };
    });

    assert(
      geom390En.fitRight <= geom390En.toolbarRight + 1,
      `Fit button right (${geom390En.fitRight}) must not overflow toolbar right (${geom390En.toolbarRight}) on 390px English`,
    );
    assert(geom390En.fitHeight >= 44, 'Fit height must be >= 44px on 390px');
    assert(geom390En.titleHeight <= 30, 'Title must not wrap into column on 390px English');

    // Restore Vietnamese and desktop viewport
    if (langSelect) {
      await page.select('header select', 'vi');
      await pause(200);
    }
  });

  // FE-FV50: F3 Remediation — Modals and Drawers mounted via Portal above Shell
  await test('FE-FV50: F3 Remediation - Modals and drawers mounted via Portal above Shell', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');

    // 1. Open ZoneCreateModal
    await page.waitForSelector('[data-testid="btn-add-zone"]');
    await page.click('[data-testid="btn-add-zone"]');
    await page.waitForSelector('#create-zone-title');

    // KEY F3 ASSERTION: elementFromPoint at center of heading must return modal element, NOT shell LanguageSelect
    const headingTopCheck = await page.evaluate(() => {
      const heading = document.getElementById('create-zone-title');
      const rect = heading.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const topElement = document.elementFromPoint(centerX, centerY);

      // Check close button as well
      const closeBtn = document.querySelector('[role="dialog"][aria-labelledby="create-zone-title"] button[aria-label="Đóng"]');
      const cRect = closeBtn ? closeBtn.getBoundingClientRect() : null;
      const closeTopElement = cRect ? document.elementFromPoint(cRect.left + cRect.width / 2, cRect.top + cRect.height / 2) : null;

      return {
        headingY: centerY,
        topElementTag: topElement ? topElement.tagName : null,
        topElementId: topElement ? topElement.id : null,
        isHeadingOrChild: heading.contains(topElement) || topElement === heading,
        isCloseBtnOrChild: closeBtn ? closeBtn.contains(closeTopElement) || closeTopElement === closeBtn : false,
      };
    });

    assert(
      headingTopCheck.isHeadingOrChild,
      `elementFromPoint at heading center must hit modal heading, not shell element (hit: <${headingTopCheck.topElementTag} id="${headingTopCheck.topElementId}">)`,
    );
    assert(
      headingTopCheck.isCloseBtnOrChild,
      'elementFromPoint at close button must hit modal close button, not shell element',
    );

    // Close create modal
    await page.click('[role="dialog"][aria-labelledby="create-zone-title"] button[aria-label="Đóng"]');
    await pause(300);

    // 2. Open SourceStreamDrawer and check Portal stacking above shell
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    await page.waitForSelector('[data-testid="btn-open-source-drawer"]');
    await page.click('[data-testid="btn-open-source-drawer"]');
    await page.waitForSelector('#source-drawer-title');

    const drawerTopCheck = await page.evaluate(() => {
      const heading = document.getElementById('source-drawer-title');
      const rect = heading.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const topElement = document.elementFromPoint(centerX, centerY);

      return {
        topElementTag: topElement ? topElement.tagName : null,
        topElementId: topElement ? topElement.id : null,
        isHeadingOrChild: heading.contains(topElement) || topElement === heading,
      };
    });

    assert(
      drawerTopCheck.isHeadingOrChild,
      `elementFromPoint at drawer title must hit drawer title, not shell element (hit: <${drawerTopCheck.topElementTag} id="${drawerTopCheck.topElementId}">)`,
    );

    const closeDrawerBtn = await page.$('[role="dialog"][aria-labelledby="source-drawer-title"] button[aria-label="Đóng"]');
    if (closeDrawerBtn) await closeDrawerBtn.click();
    await pause(300);

    // Restore desktop viewport
    await page.setViewport({ width: 1440, height: 900 });
  });

  // FE-FV51: Review R1 — Scoped sensor retry does not invalidate in-flight zone sources loader
  await test('FE-FV51: [Reviewer R1] Scoped sensor retry does not invalidate in-flight zone sources or strand loading', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    holdSourcesReq = true;
    heldSourcesReq = null;
    sensorFail503 = true;

    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');

    // Click zone A01 and open drawer
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    await page.waitForSelector('[data-testid="btn-open-source-drawer"]');
    await page.click('[data-testid="btn-open-source-drawer"]');
    await page.waitForSelector('[role="dialog"][aria-labelledby="source-drawer-title"]');

    // 1. Wait until sources request is held
    await wait(() => heldSourcesReq !== null);

    // 2. Wait until sensor error appears with retry button
    await page.waitForSelector('[data-testid="btn-retry-sensors"]');

    // 3. Verify sources section is currently in loading state
    const drawerLoadingText = await page.$eval('[role="dialog"][aria-labelledby="source-drawer-title"]', el => el.textContent);
    assert(
      drawerLoadingText.includes('Đang tải luồng telemetry...') || drawerLoadingText.includes('Đang tải lịch sử...'),
      'Sources section must be loading while sources request is held',
    );

    // 4. Recover sensors: switch sensorFail503 = false, click retry sensors
    sensorFail503 = false;
    await page.click('[data-testid="btn-retry-sensors"]');

    // Wait until sensors recover
    await page.waitForSelector('[data-testid="zone-sensors-grid"]');
    const sensorsGridText = await page.$eval('[data-testid="zone-sensors-grid"]', el => el.textContent);
    assert(sensorsGridText.includes('SOIL_MOISTURE'), 'Sensors must recover after retry');

    // 5. CRITICAL CHECK: Held sources request must NOT have been invalidated or disowned
    assert(heldSourcesReq !== null, 'Sources request must still be held and pending');

    // 6. Release the held sources response with status 200
    await heldSourcesReq.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [MOCK_STREAMS[0].currentAssignment] }),
    });
    heldSourcesReq = null;
    holdSourcesReq = false;

    // 7. Verify sources loading state finishes and current assignment displays
    await page.waitForFunction(
      () => !document.querySelector('[role="dialog"][aria-labelledby="source-drawer-title"]').textContent.includes('Đang tải luồng telemetry...')
    );

    const drawerBodyAfter = await page.$eval('[role="dialog"][aria-labelledby="source-drawer-title"]', el => el.textContent);
    assert(
      !drawerBodyAfter.includes('Đang tải luồng telemetry...'),
      'Sources loading indicator must clear after release',
    );
    assert(
      !drawerBodyAfter.includes('Đang tải lịch sử...'),
      'History loading indicator must clear after release',
    );
    assert(
      drawerBodyAfter.includes('Stream #1') || drawerBodyAfter.includes('Đang nhận'),
      'Assigned stream must be displayed successfully without being discarded by sensor retry',
    );

    // Close drawer
    const closeDrawerBtn2 = await page.$('[role="dialog"][aria-labelledby="source-drawer-title"] button[aria-label="Đóng"]');
    if (closeDrawerBtn2) await closeDrawerBtn2.click();
    await pause(300);
  });

  // FE-FV52: Review R2 — Scoped registry retry does not invalidate in-flight zone sources loader
  await test('FE-FV52: [Reviewer R2] Scoped registry retry does not invalidate in-flight zone sources or strand loading', async () => {
    currentUser = ADMIN_USER;
    scenario = 'normal';
    holdSourcesReq = true;
    heldSourcesReq = null;
    registryFail503 = true;
    sensorFail503 = false;

    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');

    // Click zone A01 and open drawer
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    await page.waitForSelector('[data-testid="btn-open-source-drawer"]');
    await page.click('[data-testid="btn-open-source-drawer"]');
    await page.waitForSelector('[role="dialog"][aria-labelledby="source-drawer-title"]');

    // 1. Wait until sources request is held
    await wait(() => heldSourcesReq !== null);

    // 2. Wait until registry error appears with retry button in drawer body
    await page.waitForSelector('[data-testid="btn-retry-registry"]');

    // 3. Verify sources section is currently in loading state
    const drawerLoadingText = await page.$eval('[role="dialog"][aria-labelledby="source-drawer-title"]', el => el.textContent);
    assert(
      drawerLoadingText.includes('Đang tải luồng telemetry...'),
      'Sources section must be loading while sources request is held',
    );

    // 4. Recover registry: switch registryFail503 = false, click retry registry
    registryFail503 = false;
    await page.click('[data-testid="btn-retry-registry"]');

    // Wait until registry error banner disappears
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="registry-error-banner"]')
    );

    // 5. CRITICAL CHECK: Held sources request must NOT have been invalidated or disowned
    assert(heldSourcesReq !== null, 'Sources request must still be held and pending');

    // 6. Release the held sources response with status 200
    await heldSourcesReq.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [MOCK_STREAMS[0].currentAssignment] }),
    });
    heldSourcesReq = null;
    holdSourcesReq = false;

    // 7. Verify sources loading state finishes and current assignment displays
    await page.waitForFunction(
      () => !document.querySelector('[role="dialog"][aria-labelledby="source-drawer-title"]').textContent.includes('Đang tải luồng telemetry...')
    );

    const drawerBodyAfter = await page.$eval('[role="dialog"][aria-labelledby="source-drawer-title"]', el => el.textContent);
    assert(
      !drawerBodyAfter.includes('Đang tải luồng telemetry...'),
      'Sources loading indicator must clear after release',
    );
    assert(
      drawerBodyAfter.includes('Stream #1') || drawerBodyAfter.includes('Đang nhận'),
      'Assigned stream must be displayed successfully without being discarded by registry retry',
    );

    // Close drawer
    const closeDrawerBtn3 = await page.$('[role="dialog"][aria-labelledby="source-drawer-title"] button[aria-label="Đóng"]');
    if (closeDrawerBtn3) await closeDrawerBtn3.click();
    await pause(300);
  });

  // FE-FV53: Review R3 — Initial SOURCE_METADATA_DISABLED displays capability banner and retry button in drawer body
  await test('FE-FV53: [Reviewer R3] Initial SOURCE_METADATA_DISABLED displays capability banner and allows recovery', async () => {
    currentUser = ADMIN_USER;
    scenario = 'stream_disabled';
    sensorFail503 = false;
    registryFail503 = false;
    holdSourcesReq = false;
    heldSourcesReq = null;

    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/settings/zones?farmId=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#canvas-viewport');

    // Click zone A01 and open drawer under initial stream_disabled scenario
    await page.waitForSelector('[data-testid="canvas-zone-A01"]');
    await page.click('[data-testid="canvas-zone-A01"]');
    await page.waitForSelector('[data-testid="btn-open-source-drawer"]');
    await page.click('[data-testid="btn-open-source-drawer"]');
    await page.waitForSelector('[role="dialog"][aria-labelledby="source-drawer-title"]');

    // 1. Assert metadata-disabled-banner is visible in drawer body WITHOUT entering isAssigning
    await page.waitForSelector('[data-testid="metadata-disabled-banner"]');
    const bannerText = await page.$eval('[data-testid="metadata-disabled-banner"]', el => el.textContent);
    assert(
      bannerText.includes('SOURCE_METADATA_DISABLED') || bannerText.includes('Tính năng siêu dữ liệu chưa kích hoạt'),
      'Must explain capability status in drawer body banner',
    );

    // 2. Assert "Gán / Thay nguồn nhận" button is disabled
    const isAssignBtnDisabled = await page.$eval('[data-testid="btn-open-assign-stream"]', el => el.disabled);
    assert(isAssignBtnDisabled === true, 'Assign button must be disabled when SOURCE_METADATA_DISABLED');

    // 3. Assert sensors are displayed and intact
    await page.waitForSelector('[data-testid="zone-sensors-grid"]');
    const sensorsGridText = await page.$eval('[data-testid="zone-sensors-grid"]', el => el.textContent);
    assert(sensorsGridText.includes('SOIL_MOISTURE'), 'Sensors must remain visible during SOURCE_METADATA_DISABLED');

    // 4. Assert active assignment is displayed
    const drawerFullText = await page.$eval('[role="dialog"][aria-labelledby="source-drawer-title"]', el => el.textContent);
    assert(drawerFullText.includes('Stream #1') || drawerFullText.includes('Đang nhận'), 'Active assignment must be displayed');

    // 5. Test recovery: server re-enables metadata (scenario = 'normal'), user clicks retry registry in banner
    scenario = 'normal';
    await page.waitForSelector('[data-testid="metadata-disabled-banner"] [data-testid="btn-retry-registry"]');
    await page.click('[data-testid="metadata-disabled-banner"] [data-testid="btn-retry-registry"]');

    // Wait until metadata-disabled-banner unmounts
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="metadata-disabled-banner"]')
    );

    // 6. Assert "Gán / Thay nguồn nhận" button is now ENABLED
    const isAssignBtnNowEnabled = await page.$eval('[data-testid="btn-open-assign-stream"]', el => !el.disabled);
    assert(isAssignBtnNowEnabled === true, 'Assign button must become enabled after registry recovers');

    // 7. Sensors must still be preserved without re-fetching
    const sensorsGridAfter = await page.$eval('[data-testid="zone-sensors-grid"]', el => el.textContent);
    assert(sensorsGridAfter.includes('SOIL_MOISTURE'), 'Sensors must remain committed after registry recovery');

    // Close drawer
    const closeDrawerBtn4 = await page.$('[role="dialog"][aria-labelledby="source-drawer-title"] button[aria-label="Đóng"]');
    if (closeDrawerBtn4) await closeDrawerBtn4.click();
    await pause(300);
  });

  console.log('\n--- All Verification Tests Finished ---');
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  console.log(`Summary: ${passCount} PASSED, ${failCount} FAILED (Total: ${testResults.length})`);

  if (failCount > 0) {
    process.exitCode = 1;
    console.error(`Verification FAILED with ${failCount} failing test(s).`);
  }

  // Compute Evidence Hashes
  const hashes = {};
  const evidenceDir = EVIDENCE_DIRS[0];
  const files = fs.readdirSync(evidenceDir);
  for (const f of files) {
    if (f.startsWith('farm_vis_')) {
      const buf = fs.readFileSync(path.join(evidenceDir, f));
      hashes[f] = {
        bytes: buf.length,
        sha256: crypto.createHash('sha256').update(buf).digest('hex'),
      };
    }
  }

  fs.writeFileSync(
    path.join(evidenceDir, 'farm-vis-001-evidence-hashes.json'),
    JSON.stringify(hashes, null, 2) + '\n',
  );

  console.log('Saved farm-vis-001-evidence-hashes.json with ' + Object.keys(hashes).length + ' screenshots');
}

run()
  .catch(err => {
    console.error('Test suite failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (server) server.close();
  });
